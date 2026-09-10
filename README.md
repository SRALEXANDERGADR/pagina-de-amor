# Página de amor privada

Sitio de una sola página para regalar como sorpresa + panel de administración
privado en `/admin.html` (sin ningún botón que lo enlace desde la página
pública — solo se entra escribiendo la dirección a mano).

## Estructura

```
public/            <- esto es lo que se despliega (carpeta raíz del sitio)
  index.html        <- página que verá tu pareja
  admin.html         <- panel privado (tú escribes /admin.html en el navegador)
  gallery/            <- fotos de la galería (se crean solas al subirlas)
  place/               <- foto de "nuestro lugar" (se crea sola al subirla)
  audio/               <- súbele aquí el mp3/m4a de la canción
  css/
  js/
content/
  data.json           <- todo el texto del sitio (nombres, carta, vales...)
                          Se crea solo la primera vez que guardas desde el panel.
functions/
  _github.js           <- helper compartido para hablar con la API de GitHub
  api/content.js       <- GET/POST del contenido (ahora lee/escribe en este repo)
  api/upload.js         <- sube cada foto como archivo real del repo
  api/verify.js          <- valida la contraseña del panel
wrangler.toml
```

**El contenido ya NO se guarda en Cloudflare KV.** Ahora cada vez que guardas
desde el panel, se hace un commit real a este repo de GitHub: uno para
`content/data.json` (texto) y uno por cada foto nueva que subas. Eso significa
que todo el historial de tu página queda en el historial de commits del repo.

## Pasos para desplegar (Cloudflare Pages)

1. **Sube el proyecto a GitHub** (ya lo tienes en
   `github.com/SRALEXANDERGADR/pagina-de-amor`, con tu flujo de Termux/git de
   siempre).

2. **Crea un token de acceso de GitHub** (reemplaza al KV namespace de antes):
   - En GitHub → foto de tu perfil → **Settings** → **Developer settings** →
     **Personal access tokens** → **Fine-grained tokens** → *Generate new token*.
   - **Repository access:** *Only select repositories* → elige
     `pagina-de-amor` (nada más, para que el token no pueda tocar tus otros repos).
   - **Permissions** → **Repository permissions** → **Contents** → **Read and write**.
   - Ponle una expiración larga (1 año) para no tener que repetir esto seguido.
   - Genera el token y **cópialo ya** (GitHub solo lo muestra una vez).

3. **Crea el proyecto de Pages** apuntando a la carpeta `public` como
   directorio de salida (build output directory = `public`, sin comando de
   build) — si ya lo tenías creado desde antes, sáltate este paso.

4. **Agrega dos secretos** en el proyecto de Pages → **Settings** →
   **Environment variables** → *Add variable* → marca cada uno como **Secret**:
   - `ADMIN_PASSWORD` → la contraseña para entrar a `/admin.html` (si ya la
     tenías configurada de antes, déjala igual).
   - `GITHUB_TOKEN` → el token que copiaste en el paso 2.
   - Agrégalos tanto en **Production** como en **Preview** si vas a probar
     con un deploy de preview.

5. **Si tenías el KV namespace enlazado de una versión anterior, puedes
   quitarlo** (Settings → Functions → KV namespace bindings → eliminar
   `CONTENT_KV`) — ya no se usa, pero tampoco estorba si lo dejas.

6. **Vuelve a desplegar** (un nuevo commit, o *Retry deployment*) para que
   tome los secretos nuevos.

7. Entra a `https://tu-sitio.pages.dev/admin.html`, escribe tu contraseña,
   llena todo (nombres, carta, fotos, vales, ruleta, la pregunta, etc.) y
   dale **Guardar cambios**.

8. Comparte `https://tu-sitio.pages.dev/` (la raíz, sin `/admin.html`) con
   tu novia. Esa es la única URL que ella necesita.

## Notas importantes

- **⚠️ El contenido que ya tenías guardado en KV (si llenaste el panel antes
  de este cambio) no se migra solo.** La nueva versión arranca con los
  textos de ejemplo hasta que vuelvas a llenar el panel una vez más desde
  `/admin.html`. Si ya tenías todo cargado y no quieres reescribirlo, avisa
  antes de desplegar esto para exportarlo primero.
- **Las fotos** ahora se suben como archivos reales a `public/gallery/` y
  `public/place/` (un commit por foto), no como texto dentro del JSON. Esto
  permite tener varias fotos sin chocar con el límite de ~1MB por archivo
  que tiene la API de contenidos de GitHub — cada foto tiene su propio
  límite de ~1MB, en vez de compartir uno solo entre todas.
- **Después de subir una foto**, el panel te la muestra al toque (usa una
  vista previa local), pero puede tardar uno o dos minutos en verse en el
  link público mientras Cloudflare hace el redeploy automático que dispara
  cada commit.
- **Cada guardado = un deploy nuevo** en Cloudflare Pages (porque cada commit
  al repo dispara uno). Es gratis y no tiene costo real para un sitio tan
  chico, solo es bueno saberlo si ves muchos deployments en el dashboard.
- **La canción** se sube como archivo normal a `public/audio/` (con tu git
  de siempre, o desde el editor web de GitHub) y en el panel solo pones la
  ruta, por ejemplo `/audio/cancion.mp3`.
- **Los vales canjeados** se recuerdan en el propio navegador de quien los
  canjea (no en el servidor), para que cada visita/dispositivo tenga su
  propio progreso.
- Si el token de GitHub expira o lo revocas, el panel deja de poder guardar
  (te va a dar un error claro) hasta que generes uno nuevo y actualices el
  secreto `GITHUB_TOKEN`.
- El meta tag `noindex` evita que buscadores indexen las páginas, pero la
  privacidad real depende de que no compartas el link públicamente.
