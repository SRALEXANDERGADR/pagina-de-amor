import { getFile, putFile, utf8ToBase64 } from "../_github.js";

const DEFAULT_CONTENT = {
  coupleNames: { you: "Tu amor", love: "Mi vida" },
  hero: { greeting: "Un regalo para ti" },
  video: { youtubeUrl: "" }, // ya no se usa (se dejó por compatibilidad con contenido viejo)
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

const DATA_PATH = "content/data.json";
// Las fotos ya NO van dentro de este JSON (se suben como archivos aparte
// vía /api/upload), así que esto ahora es solo texto: sobra espacio de
// margen frente al límite real de ~1MB por archivo de la API de GitHub.
const MAX_BYTES = 900 * 1024;

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", ...(init.headers || {}) }
  });
}

export async function onRequestGet(context) {
  const { env } = context;
  try {
    if (!env.GITHUB_TOKEN) return json(DEFAULT_CONTENT);
    const file = await getFile(DATA_PATH, env.GITHUB_TOKEN);
    const data = file ? JSON.parse(file.content) : DEFAULT_CONTENT;
    // Cache corto en el navegador/CDN: la página se abre varias veces en
    // pocos minutos (compartida por link) y no hace falta pedir a GitHub
    // de nuevo cada vez. El admin sigue viendo cambios frescos porque su
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
  if (!env.GITHUB_TOKEN) {
    return json({ error: "falta configurar el secreto GITHUB_TOKEN" }, { status: 500 });
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

  try {
    const current = await getFile(DATA_PATH, env.GITHUB_TOKEN);
    await putFile(
      DATA_PATH,
      utf8ToBase64(serialized),
      env.GITHUB_TOKEN,
      "Actualiza contenido desde /admin.html",
      current?.sha
    );
    return json({ ok: true });
  } catch (err) {
    return json({ error: "github save failed", detail: String(err.message || err) }, { status: 502 });
  }
}
