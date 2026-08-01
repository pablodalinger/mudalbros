// ---------------------------------------------------------------------------
// MuDalBros - Worker de Pagos WCoin (MercadoPago)  [Cloudflare Worker]
// ---------------------------------------------------------------------------
// Toda la logica de pago vive aca (HTTPS gratis de Cloudflare, sin tocar el VPS).
// El VPS solo corre un "poller" que hace HTTP SALIENTE a este Worker para
// bajar los creditos aprobados y aplicarlos en el SQL Server local.
//
// SECRETS que hay que cargar en el panel de Cloudflare (Settings > Variables):
//   MP_ACCESS_TOKEN  = Access Token de MercadoPago (empieza TEST-/APP_USR- en prueba)
//   POLLER_SECRET    = una clave larga inventada, compartida con el poller del VPS
// BINDING de KV (Settings > Variables > KV Namespace Bindings):
//   PAGOS_KV         = namespace nuevo para guardar creditos pendientes + idempotencia
//
// PACKS: definidos server-side aca para que el precio NO se pueda manipular
// desde el cliente (el front manda solo el id de pack, no el precio).
// ---------------------------------------------------------------------------

const PACKS = {
  "5000":   { wc: 5000,   precio: 5000,  titulo: "5.000 WCoin" },
  "10000":  { wc: 10000,  precio: 10000, titulo: "10.000 WCoin" },
  "15000":  { wc: 15000,  precio: 15000, titulo: "15.000 WCoin" },
  "100000": { wc: 110000, precio: 90000, titulo: "100.000 WCoin (+10.000 bonus)" },
};

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json", ...(headers || {}) },
  });
}

// ---------------------------------------------------------------------------
// Indice de pendientes: 1 sola key de KV con un array de txids. Evita usar
// KV.list() (cuota diaria muy chica en el plan free de Cloudflare) para que
// el poller pueda consultar /pull-pendientes cada 10s sin agotarla.
// ---------------------------------------------------------------------------
async function leerIndice(env) {
  const v = await env.PAGOS_KV.get("pending_index");
  if (!v) return [];
  try { return JSON.parse(v); } catch (e) { return []; }
}
async function agregarAIndice(env, txid) {
  const idx = await leerIndice(env);
  if (!idx.includes(txid)) {
    idx.push(txid);
    await env.PAGOS_KV.put("pending_index", JSON.stringify(idx));
  }
}
async function quitarDeIndice(env, txid) {
  const idx = await leerIndice(env);
  const nuevo = idx.filter((t) => t !== txid);
  if (nuevo.length !== idx.length) {
    await env.PAGOS_KV.put("pending_index", JSON.stringify(nuevo));
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get("Origin") || "*";
    const H = cors(origin);

    if (request.method === "OPTIONS") return new Response(null, { headers: H });

    // ----------------------------------------------------------------------
    // POST /crear-pago  -> crea preferencia MercadoPago, devuelve init_point
    // body: { cuenta, email, pack }   (pack = clave de PACKS, ej "10000")
    // ----------------------------------------------------------------------
    if (path === "/crear-pago" && request.method === "POST") {
      let body;
      try { body = await request.json(); }
      catch { return json({ error: "JSON invalido" }, 400, H); }

      const cuenta = (body.cuenta || "").toString().trim().slice(0, 10);
      const email  = (body.email  || "").toString().trim().slice(0, 50);
      const pack   = PACKS[(body.pack || "").toString()];

      if (!cuenta || cuenta.length < 3) return json({ error: "Cuenta invalida" }, 400, H);
      if (!pack) return json({ error: "Pack invalido" }, 400, H);

      // external_reference: como el poller sabe a que cuenta acreditar y cuanto
      const extRef = cuenta + "|" + pack.wc;

      const pref = {
        items: [{
          title: "MuDalBros - " + pack.titulo,
          quantity: 1,
          unit_price: pack.precio,
          currency_id: "ARS",
        }],
        payer: email ? { email } : undefined,
        external_reference: extRef,
        notification_url: url.origin + "/mp-webhook",
        back_urls: {
          success: "https://mudalbros.com/wcoin.html?estado=ok",
          failure: "https://mudalbros.com/wcoin.html?estado=error",
          pending: "https://mudalbros.com/wcoin.html?estado=pendiente",
        },
        auto_return: "approved",
      };

      const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + env.MP_ACCESS_TOKEN,
        },
        body: JSON.stringify(pref),
      });
      const data = await r.json();
      if (!r.ok) return json({ error: "MP rechazo la preferencia", detail: data }, 502, H);

      // PRODUCCION: usar init_point (el checkout real). Con credencial de PRUEBA
      // habia que usar data.sandbox_init_point, pero ya estamos en produccion.
      return json({ init_point: data.init_point }, 200, H);
    }

    // ----------------------------------------------------------------------
    // POST/GET /mp-webhook  -> MercadoPago avisa un pago. NO confiamos en el
    // POST: re-consultamos el pago a la API de MP para ver su estado real.
    // ----------------------------------------------------------------------
    if (path === "/mp-webhook") {
      // MP manda el id del pago por query (?data.id=) o en el body {data:{id}}
      let payId = url.searchParams.get("data.id") || url.searchParams.get("id");
      if (!payId && request.method === "POST") {
        try { const b = await request.json(); payId = b?.data?.id; } catch {}
      }
      if (!payId) return new Response("ok", { status: 200 }); // ping sin id, responder 200

      const r = await fetch("https://api.mercadopago.com/v1/payments/" + payId, {
        headers: { Authorization: "Bearer " + env.MP_ACCESS_TOKEN },
      });
      if (!r.ok) return new Response("ok", { status: 200 });
      const pay = await r.json();

      if (pay.status === "approved") {
        const txid = "mp-" + pay.id;
        const yaExiste = await env.PAGOS_KV.get(txid);
        if (!yaExiste) {  // idempotencia: no acreditar 2 veces
          const [cuenta, wc] = (pay.external_reference || "").split("|");
          if (cuenta && wc) {
            await env.PAGOS_KV.put(txid, JSON.stringify({
              tipo: "wcoin", cuenta, wc: parseInt(wc, 10),
              estado: "pendiente", ts: Date.now(),
            }));
            await agregarAIndice(env, txid);
          }
        }
      }
      return new Response("ok", { status: 200 });
    }

    // ----------------------------------------------------------------------
    // GET /pull-pendientes?secret=...  -> el poller del VPS baja lo pendiente
    // NO usa KV.list() (tiene cuota diaria muy baja en el plan free) - en vez
    // de eso mantenemos un "indice" chico (1 sola key) con los txid pendientes.
    // ----------------------------------------------------------------------
    if (path === "/pull-pendientes" && request.method === "GET") {
      if (url.searchParams.get("secret") !== env.POLLER_SECRET)
        return json({ error: "no autorizado" }, 401, H);

      const indice = await leerIndice(env);
      const pend = [];
      for (const txid of indice) {
        const v = await env.PAGOS_KV.get(txid);
        if (!v) continue;
        let rec;
        try { rec = JSON.parse(v); } catch (e) { continue; } // saltea entradas corruptas
        if (rec && rec.estado === "pendiente") pend.push({ txid, ...rec });
      }
      return json({ pendientes: pend }, 200, H);
    }

    // ----------------------------------------------------------------------
    // POST /marcar-hecho  -> el poller confirma que aplico un credito o un alta
    // body: { txid, secret, resultado? }
    //   resultado (solo altas de cuenta): "ok" | "duplicada" | "error"
    //   si no viene, se asume "ok" (flujo viejo de WCoin, no se toca)
    // ----------------------------------------------------------------------
    if (path === "/marcar-hecho" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "JSON invalido" }, 400, H); }
      if (body.secret !== env.POLLER_SECRET) return json({ error: "no autorizado" }, 401, H);

      const v = await env.PAGOS_KV.get(body.txid);
      if (v) {
        const rec = JSON.parse(v);
        rec.estado = "aplicado";
        rec.resultado = body.resultado || "ok";
        rec.aplicado_ts = Date.now();
        // La password solo hace falta hasta que el poller crea la cuenta.
        // Una vez aplicada, se borra del KV (no queda guardada en ningun lado).
        if (rec.pass) delete rec.pass;
        await env.PAGOS_KV.put(body.txid, JSON.stringify(rec), { expirationTtl: 86400 });
      }
      await quitarDeIndice(env, body.txid);
      return json({ ok: true }, 200, H);
    }

    // ----------------------------------------------------------------------
    // POST /crear-cuenta  -> alta de cuenta del juego desde la web
    // body: { cuenta, pass, email, pid }
    // Deja el alta PENDIENTE en KV; el poller del VPS la inserta en MEMB_INFO
    // y confirma con /marcar-hecho + resultado. La web sigue el estado con
    // /estado-alta?ticket=...
    // ----------------------------------------------------------------------
    if (path === "/crear-cuenta" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "JSON invalido" }, 400, H); }

      const cuenta = String(body.cuenta || "").trim();
      const pass   = String(body.pass || "");
      const email  = String(body.email || "").trim();
      const pid    = String(body.pid || "").trim();

      // Validaciones server-side: el front tambien valida, pero no se confia
      // en el cliente (los limites salen del schema real de MEMB_INFO).
      if (!/^[A-Za-z0-9]{4,10}$/.test(cuenta))
        return json({ error: "El nombre de cuenta debe tener entre 4 y 10 caracteres, solo letras y numeros." }, 400, H);
      if (pass.length < 4 || pass.length > 10)
        return json({ error: "La contrasena debe tener entre 4 y 10 caracteres." }, 400, H);
      if (email.length > 50 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
        return json({ error: "Email invalido." }, 400, H);
      if (!/^[0-9]{10}$/.test(pid))
        return json({ error: "El Personal ID debe tener exactamente 10 numeros." }, 400, H);

      // Limite anti-abuso: 3 cuentas por IP por hora (sin captcha ni mail).
      const ip = request.headers.get("CF-Connecting-IP") || "sin-ip";
      const hora = Math.floor(Date.now() / 3600000);
      const rlKey = "rl_alta_" + ip + "_" + hora;
      const usadas = parseInt((await env.PAGOS_KV.get(rlKey)) || "0", 10);
      if (usadas >= 3)
        return json({ error: "Demasiadas cuentas creadas desde esta conexion. Esperá un rato." }, 429, H);
      await env.PAGOS_KV.put(rlKey, String(usadas + 1), { expirationTtl: 3700 });

      const txid = "alta_" + crypto.randomUUID();
      const rec = {
        tipo: "cuenta",
        estado: "pendiente",
        cuenta: cuenta,
        pass: pass,
        email: email,
        pid: pid,
        creado_ts: Date.now(),
      };
      // TTL de 1 dia: si el poller estuviera caido, el alta no queda para siempre.
      await env.PAGOS_KV.put(txid, JSON.stringify(rec), { expirationTtl: 86400 });
      await agregarAIndice(env, txid);

      return json({ ok: true, ticket: txid }, 200, H);
    }

    // ----------------------------------------------------------------------
    // GET /estado-alta?ticket=...  -> publico, lo consulta registro.html
    // Devuelve SOLO el estado (nunca datos de la cuenta).
    // ----------------------------------------------------------------------
    if (path === "/estado-alta" && request.method === "GET") {
      const ticket = url.searchParams.get("ticket") || "";
      if (!ticket.startsWith("alta_")) return json({ estado: "error" }, 400, H);

      const v = await env.PAGOS_KV.get(ticket);
      if (!v) return json({ estado: "pendiente" }, 200, H);

      let rec;
      try { rec = JSON.parse(v); } catch (e) { return json({ estado: "error" }, 200, H); }
      if (rec.estado !== "aplicado") return json({ estado: "pendiente" }, 200, H);
      return json({ estado: rec.resultado || "ok" }, 200, H);
    }

    // ----------------------------------------------------------------------
    // POST /push-ranking  -> el VPS empuja el top de jugadores (cada X min)
    // body: { secret, topLevel: [{name,level,resets}], topReset: [...] }
    // ----------------------------------------------------------------------
    if (path === "/push-ranking" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "JSON invalido" }, 400, H); }
      if (body.secret !== env.POLLER_SECRET) return json({ error: "no autorizado" }, 401, H);

      const data = {
        topLevel: Array.isArray(body.topLevel) ? body.topLevel.slice(0, 50) : [],
        topReset: Array.isArray(body.topReset) ? body.topReset.slice(0, 50) : [],
        updated: Date.now(),
      };
      await env.PAGOS_KV.put("ranking_data", JSON.stringify(data));
      return json({ ok: true }, 200, H);
    }

    // ----------------------------------------------------------------------
    // GET /ranking-data  -> publico, lo consume ranking.html
    // ----------------------------------------------------------------------
    if (path === "/ranking-data" && request.method === "GET") {
      const v = await env.PAGOS_KV.get("ranking_data");
      let data = { topLevel: [], topReset: [], updated: 0 };
      if (v) {
        try { data = JSON.parse(v); } catch (e) {}
      }
      return json(data, 200, H);
    }

    return json({ error: "ruta no encontrada" }, 404, H);
  },
};
