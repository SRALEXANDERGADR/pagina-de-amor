// Helper compartido: leer/escribir archivos en el repo de GitHub usando
// la API de "contents". Esto es lo que reemplaza a Cloudflare KV — cada
// guardado desde /admin.html se convierte en un commit real en el repo.
//
// Requiere el secreto GITHUB_TOKEN (fine-grained personal access token,
// con permiso "Contents: Read and write" SOLO sobre este repo).

export const OWNER = "SRALEXANDERGADR";
export const REPO = "pagina-de-amor";
export const BRANCH = "main";

export function githubHeaders(token) {
  return {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "User-Agent": "pagina-de-amor-worker",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

function apiUrl(path) {
  return `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
}

// atob/btoa nativos no manejan UTF-8 directamente (acentos, ñ, emojis),
// así que pasamos por bytes explícitamente.
export function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToUtf8(b64) {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/**
 * Lee un archivo del repo. Devuelve { content (string decodificado), sha }
 * o null si el archivo no existe todavía (404).
 */
export async function getFile(path, token) {
  const res = await fetch(`${apiUrl(path)}?ref=${BRANCH}`, { headers: githubHeaders(token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET ${path} -> ${res.status}`);
  const file = await res.json();
  return { content: base64ToUtf8(file.content), sha: file.sha };
}

/**
 * Crea o actualiza un archivo en el repo (un commit por llamada).
 * base64Content: contenido YA en base64 (texto plano o binario, según el caso).
 */
export async function putFile(path, base64Content, token, message, sha) {
  const res = await fetch(apiUrl(path), {
    method: "PUT",
    headers: { ...githubHeaders(token), "content-type": "application/json" },
    body: JSON.stringify({
      message,
      content: base64Content,
      branch: BRANCH,
      ...(sha ? { sha } : {})
    })
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`GitHub PUT ${path} -> ${res.status}: ${detail.slice(0, 300)}`);
  }
  return res.json();
}
