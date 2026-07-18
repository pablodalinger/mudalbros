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
          }
        }
      }
      return new Response("ok", { status: 200 });
    }

    // ----------------------------------------------------------------------
    // GET /pull-pendientes?secret=...  -> el poller del VPS baja lo pendiente
    // ----------------------------------------------------------------------
    if (path === "/pull-pendientes" && request.method === "GET") {
      if (url.searchParams.get("secret") !== env.POLLER_SECRET)
        return json({ error: "no autorizado" }, 401, H);

      const list = await env.PAGOS_KV.list();
      const pend = [];
      for (const k of list.keys) {
        const v = await env.PAGOS_KV.get(k.name);
        if (!v) continue;
        let rec;
        try { rec = JSON.parse(v); } catch (e) { continue; } // saltea entradas corruptas
        if (rec && rec.estado === "pendiente") pend.push({ txid: k.name, ...rec });
      }
      return json({ pendientes: pend }, 200, H);
    }

    // ----------------------------------------------------------------------
    // POST /marcar-hecho  -> el poller confirma que aplico un credito
    // body: { txid, secret }
    // ----------------------------------------------------------------------
    if (path === "/marcar-hecho" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "JSON invalido" }, 400, H); }
      if (body.secret !== env.POLLER_SECRET) return json({ error: "no autorizado" }, 401, H);

      const v = await env.PAGOS_KV.get(body.txid);
      if (v) {
        const rec = JSON.parse(v);
        rec.estado = "aplicado";
        rec.aplicado_ts = Date.now();
        await env.PAGOS_KV.put(body.txid, JSON.stringify(rec)); // se conserva = idempotencia
      }
      return json({ ok: true }, 200, H);
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
        topLevel: Array.isArray(body.topLevel) ? body.topLevel.slice(0, 10) : [],
        topReset: Array.isArray(body.topReset) ? body.topReset.slice(0, 10) : [],
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
