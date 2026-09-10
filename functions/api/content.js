const DEFAULT_CONTENT = {
  coupleNames: { you: "Tu amor", love: "Mi vida" },
  hero: { greeting: "Un regalo para ti" },
  video: { youtubeUrl: "" },
  song: { url: "", startSeconds: 0 },
  letter: { text: "Escribe aquí tu carta desde /admin.html" },
  gallery: [],
  loveList: [],
  ourPlace: { title: "Nuestro lugar", text: "", image: "" },
  bucketList: [],
  coupons: [],
  roulette: [],
  anniversary: { date: "", label: "Llevamos juntos" },
  question: {
    text: "¿Quieres ser mi novia?",
    yes: "Sí",
    no: "No",
    successTitle: "¡Dijiste que sí!",
    successText: "Este momento queda guardado para siempre."
  },
  closing: { text: "", signature: "" },
  music: { enabled: true }
};

const KV_KEY = "content";
const MAX_BYTES = 20 * 1024 * 1024; // 20MB safety cap (KV value limit is 25MB)

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", ...(init.headers || {}) }
  });
}

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const raw = await env.CONTENT_KV.get(KV_KEY);
    const data = raw ? JSON.parse(raw) : DEFAULT_CONTENT;
    // Cache corto en el navegador/CDN: la página se abre varias veces en
    // pocos minutos (compartida por link) y no hace falta pedir a KV de
    // nuevo cada vez. El admin sigue viendo cambios frescos porque su
    // fetch usa cache:"no-store" e ignora este header.
    return json(data, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } });
  } catch (err) {
    return json(DEFAULT_CONTENT);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const suppliedPassword = request.headers.get("x-admin-password") || "";
  if (!env.ADMIN_PASSWORD || suppliedPassword !== env.ADMIN_PASSWORD) {
    return json({ error: "unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ error: "invalid json" }, { status: 400 });
  }

  const serialized = JSON.stringify(body);
  if (serialized.length > MAX_BYTES) {
    return json({ error: "too large" }, { status: 413 });
  }

  await env.CONTENT_KV.put(KV_KEY, serialized);
  return json({ ok: true });
}
