import { putFile, putLargeFile } from "../_github.js";

// Límite de la API de "contents" de GitHub: ~1MB por archivo. Las fotos
// del panel se comprimen antes de llegar aquí, así que esto casi nunca
// debería dispararse; es solo un cinturón de seguridad.
const MAX_IMAGE_B64_LEN = 1_300_000; // ~950KB reales de imagen

// El audio va por la Git Data API (putLargeFile), que sí soporta archivos
// grandes, pero igual ponemos un techo razonable para no colgar la función
// ni pasarnos del límite de subida de Cloudflare Pages.
const MAX_AUDIO_B64_LEN = 14_000_000; // ~10.5MB reales de audio
const AUDIO_EXTENSIONS = ["mp3", "m4a", "wav", "ogg", "aac"];

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", ...(init.headers || {}) }
  });
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

  const dataUrl = body.dataUrl || "";
  const commaIdx = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || commaIdx === -1) {
    return json({ error: "dataUrl inválido" }, { status: 400 });
  }
  const base64 = dataUrl.slice(commaIdx + 1);

  // ---- AUDIO: se identifica por body.kind, no por el mime type del
  // navegador (para .m4a algunos navegadores no reportan un mime
  // consistente). La extensión viene del nombre del archivo original.
  if (body.kind === "audio") {
    const ext = String(body.ext || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!AUDIO_EXTENSIONS.includes(ext)) {
      return json({ error: "formato de audio no soportado (usa mp3, m4a, wav, ogg o aac)" }, { status: 400 });
    }
    if (base64.length > MAX_AUDIO_B64_LEN) {
      return json({ error: "audio muy pesado (máx. ~10MB), recorta o comprime la canción" }, { status: 413 });
    }
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path = `public/audio/${filename}`;
    try {
      await putLargeFile(path, base64, env.GITHUB_TOKEN, `Sube canción ${filename}`);
      return json({ ok: true, path: `/audio/${filename}` });
    } catch (err) {
      return json({ error: "github upload failed", detail: String(err.message || err) }, { status: 502 });
    }
  }

  // ---- IMAGEN (comportamiento original) ----
  const match = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,/s);
  if (!match) {
    return json({ error: "formato de imagen no soportado" }, { status: 400 });
  }
  const ext = match[1] === "jpg" ? "jpeg" : match[1];

  if (base64.length > MAX_IMAGE_B64_LEN) {
    return json({ error: "imagen muy pesada, comprime más o reduce el tamaño" }, { status: 413 });
  }

  // Carpeta destino dentro de public/ (así queda servida directo por Pages,
  // sin pasar por ninguna función para leerla). Solo letras/números/guiones.
  const folder = /^[a-z0-9_-]+$/i.test(body.folder || "") ? body.folder : "gallery";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext === "jpeg" ? "jpg" : ext}`;
  const path = `public/${folder}/${filename}`;

  try {
    // El dataURL ya viene en base64 (es literalmente lo que generó
    // canvas.toDataURL en el navegador), así que se pasa tal cual a
    // GitHub sin decodificar/re-codificar nada.
    await putFile(path, base64, env.GITHUB_TOKEN, `Sube foto ${filename}`);
    return json({ ok: true, path: `/${folder}/${filename}` });
  } catch (err) {
    return json({ error: "github upload failed", detail: String(err.message || err) }, { status: 502 });
  }
}
