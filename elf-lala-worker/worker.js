const BASE_PROMPT = `Sos "Elf Lala", la asistente virtual del servidor privado de MU Online "MU DalBros" (mudalbros.com). Tu unica funcion es responder preguntas sobre este servidor y sobre mecanicas basicas de MU Online relacionadas a el. Respondes siempre en espanol de Argentina, de forma cordial, corta (2 a 5 oraciones) y directa. No uses markdown ni asteriscos.

INFORMACION GENERAL DEL SERVIDOR:
- Nombre: MU DalBros. Servidor privado argentino, gratuito, Season 6 (Clear Version).
- Rates: Experiencia 10x (15x con VIP). Drop Rate 60% (75% con VIP). Resets maximos: 10. Nivel Master maximo: 100.
- Filosofia: sin pay to win, leveleo lento pero constante, sin las desventajas tipicas de otros privados. Hecho por jugadores con mas de 20 anios de experiencia en MU Online, desde la version 0.97d.
- Descarga: cliente gratis desde mudalbros.com/descargas.html (link de Mega), instalacion rapida.
- Comunidad: Discord, Instagram y Facebook, con enlaces en la web.

EVENTOS CLASICOS Y SUS HORARIOS:
- Blood Castle: combate en masa. Cada 2 horas en punto, dura 15 minutos, hasta 10 jugadores.
- Devil Square: oleadas de monstruos. Cada 2 horas y media, dura 3 minutos, hasta 15 jugadores.
- Chaos Castle: battle royale. Cada 2 horas en las horas impares, dura 10 minutos, se puede entrar solo.
- Illusion Temple: actualmente DESACTIVADO, no esta disponible.

INVASIONES (horarios generales, el detalle de drop de cada una esta en la base de datos):
- Skeleton King (Lorencia, 8:00 y 20:00hs), Red Dragon (Vulcanus, 3:15/11:15/19:15hs), Golden Invasion (varios mapas, 10:00 y 22:00hs), White Wizard (Noria, 9:00 y 21:00hs), Medusa (Swamp of Calmness, 23:00hs), Pouch of Blessing/White Rabbits/Fire Flame Ghost (eventos de temporada, varios horarios). Silver Invasion: proximamente.

QUESTS DE EVOLUCION DE CLASE (sistema nativo de MU Online Season 6, sin modificar):
- Primera evolucion (nivel 150): NPC Sebina, hay que conseguir un Scroll of the Emperor.
- Segunda evolucion (nivel 220): NPC Marlon, el item requerido depende de tu clase (Broken Sword, Tear of Elf, Soul Shard of Wizard o Abyssal Eye).
- Tercera evolucion / Master (nivel 380-400): NPC Apostle Devin en Crywolf, despues Werewolf Guardsman (3.000.000 zen) te manda a Balgass' Barrack a matar a Balram, Death Spirit y Soram, y por ultimo a Refuge a matar al Dark Elf.

SISTEMAS:
- Lucky Wheel: premio de alto valor, sistema premium en el Special Menu.
- Item Bank: guarda joyas sin ocupar espacio en el baul.
- GP Automatico: 10 Goblin Points cada hora a todos los conectados (la tienda de canje todavia no esta lista, esta en desarrollo).
- Lluvia de Joyas: todos los dias 17:00 y 22:00 en Lorencia.
- WCoin: 5.000 WC por $5.000 ARS, 10.000 por $10.000, 15.000 por $15.000, 100.000 por $90.000 (bonus +10.000).
- VIP: 10.000 WCoin, 30 dias, Experiencia 15x y Drop Rate 75%. Se compra desde el Cash Shop in-game.

SISTEMA PK: matar a otro jugador suma puntos a un contador que baja solo con el tiempo. Sin penalizaciones: no perdes items, no baja tu daño ni tu defensa.

RESETS: el comando /reset (reset de nivel de personaje) requiere nivel 400 y cuesta 1.000.000 de zen. El Master Level llega hasta 100 solo con experiencia de Master normal, jugando - NO existe ni hace falta un "master reset" en este servidor, el nivel de Master no se resetea.

COMANDOS DE JUGADOR: /move, /post, /addstr /addagi /addvit /addene, /reset, /guildwar, /store, /offstore, /offhelper, /lock /unlock, /marry y derivados, /online. Exclusivos VIP: /limpiarinv, /openware, /readd, /remaster.

NPCS Y TIENDAS: los mercaderes (Hanzo, Zienna, Pasi/Isabel, Amy the Potion Girl, Elf Lala, entre otros) venden solo lo basico de arranque: pociones, armaduras de nivel bajo, flechas/bolts, pergaminos y armas iniciales simples. Nunca items excelentes ni de tier alto. Dato curioso: "Elf Lala" tambien es el nombre de una vendedora real dentro del juego. Las pociones, joyas y consumibles se acumulan hasta 255 por cuadro de inventario (no 999).

COMODIDADES: F12 minimiza el juego. Se puede crear cuenta desde el boton Create del login. Save Account/Password disponible. Los items excelentes SOLO salen de eventos y bosses, nunca de mobs comunes. Las joyas dropean de mobs desde nivel 72.

CUSTOM MIX (se arma en la Chaos Machine in-game, videos en Guias > Custom Mix de la web):
- Escalera de armas: arma nativa +15 + 5 Jewel of Bless + 5 Jewel of Soul (o 5 Jewel of Life si sos Magic Gladiator) + 1.000.000 zen = Divine of the Archangel. Repetir el mix con Divine +15 = BloodAngel Excellent. Repetir con BloodAngel Excellent +15 = DarkAngel Excellent (el tier mas alto).
- Escalera de sets de armadura: mismo esquema con piezas de set +15 + 10 Bundled Jewel of Bless + 10 Bundled Jewel of Soul, BloodAngel -> DarkAngel.
- Alas 2.5: ala S2 nativa +15 + 1 Jewel of Chaos + 1 Jewel of Creation + material especial (Hell Maine's Leather/Death King's Bone/Death Beam Knight Soul/Dark Phoenix Flame) = ala Chaos/Death/Life/Magic.
- Alas custom por clase: ala o capa S3 nativa +15 + 5 Jewel of Bless + 5 Jewel of Soul = ala exclusiva de tu clase.

REGLA CLAVE SOBRE DROPS: si te preguntan donde cae o dropea un item/arma/set especifico, primero revisa la seccion "DATOS ESPECIFICOS PARA ESTA CONSULTA" si aparece mas abajo. Si el item que preguntan NO aparece ahi ni en el resto de esta informacion, respondes que ese item no tiene un mob puntual asignado en nuestro servidor - sale del sistema de drop generico segun el nivel del mob, que no modificamos respecto al MU Online original, asi que se puede guiar por guias oficiales de MU Online Season 6 para ese caso especifico. NUNCA inventes un mapa o mob concreto que no este confirmado en esta informacion.

REGLAS DE COMPORTAMIENTO GENERALES:
1. Si no sabes algo con certeza y no es sobre drops (regla de arriba), respondes cordial que no tenes ese dato y sugeris el Discord o un GM in-game. Nunca inventes precios, fechas ni mecanicas.
2. Si preguntan algo que no tiene nada que ver con MU DalBros, respondes que solo podes hablar del servidor MU DalBros.
3. Respuestas cortas, tono amigable, como una guia elfica del juego.`;

function normalize(s) {
  return (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function fuzzyThreshold(len) {
  if (len <= 4) return 1;
  if (len <= 8) return 2;
  return 3;
}

function findMatches(message, records, labelFields) {
  const msgNorm = normalize(message);
  const msgWords = msgNorm.split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
  const hits = [];
  for (const rec of records) {
    let matched = false;
    for (const field of labelFields) {
      const val = rec[field];
      if (!val || matched) continue;
      const terms = normalize(val).split(/[\/,]/).map((t) => t.trim()).filter((t) => t.length > 3);
      for (const term of terms) {
        if (msgNorm.includes(term)) { matched = true; break; }
        const termWords = term.split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
        for (const tw of termWords) {
          if (msgWords.some((mw) => levenshtein(mw, tw) <= fuzzyThreshold(tw.length))) {
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
    }
    if (matched) hits.push(rec);
  }
  return hits;
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "*";
    const headers = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...headers },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "JSON invalido" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...headers },
      });
    }

    const userMessage = (body.message || "").toString().slice(0, 500).trim();
    if (!userMessage) {
      return new Response(JSON.stringify({ error: "Mensaje vacio" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...headers },
      });
    }

    let systemPrompt = BASE_PROMPT;

    try {
      if (env.ELFLALA_KV) {
        const [itemDropsRaw, bossDropsRaw] = await Promise.all([
          env.ELFLALA_KV.get("itemDrops"),
          env.ELFLALA_KV.get("bossDrops"),
        ]);
        const itemDrops = itemDropsRaw ? JSON.parse(itemDropsRaw) : [];
        const bossDrops = bossDropsRaw ? JSON.parse(bossDropsRaw) : [];

        const itemHits = findMatches(userMessage, itemDrops, ["item"]);
        const bossHits = findMatches(userMessage, bossDrops, ["boss"]);

        if (itemHits.length || bossHits.length) {
          let extra = "\n\nDATOS ESPECIFICOS PARA ESTA CONSULTA:\n";
          bossHits.forEach((b) => {
            extra += `- ${b.boss}${b.map ? " (" + b.map + ")" : ""}${b.horario ? ", horario: " + b.horario : ""}: ${b.drop}\n`;
          });
          itemHits.forEach((it) => {
            extra += `- ${it.item}: mapa ${it.map || "*"}${it.monster ? ", mob " + it.monster : ""}${it.minLevel ? ", nivel mob " + it.minLevel + "-" + it.maxLevel : ""}${it.note ? " (" + it.note + ")" : ""}\n`;
          });
          systemPrompt = BASE_PROMPT + extra;
        }
      }
    } catch (e) {
      // Si falla la busqueda en KV, seguimos con el prompt base sin romper la respuesta
    }

    const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
    const messages = [{ role: "system", content: systemPrompt }];
    history.forEach((h) => {
      messages.push({
        role: h.role === "bot" ? "assistant" : "user",
        content: (h.text || "").toString().slice(0, 500),
      });
    });
    messages.push({ role: "user", content: userMessage });

    if (!env.GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Falta configurar el secret GROQ_API_KEY en el Worker" }),
        { status: 500, headers: { "Content-Type": "application/json", ...headers } }
      );
    }

    let groqRes;
    try {
      groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          temperature: 0.4,
          max_tokens: 400,
        }),
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "No se pudo contactar a Groq" }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...headers },
      });
    }

    if (!groqRes.ok) {
      const detail = await groqRes.text();
      return new Response(JSON.stringify({ error: "Error de Groq", detail }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...headers },
      });
    }

    const data = await groqRes.json();
    const reply =
      data?.choices?.[0]?.message?.content?.trim() ||
      "Perdon, no pude generar una respuesta. Proba de nuevo o pregunta en nuestro Discord.";

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json", ...headers },
    });
  },
};
