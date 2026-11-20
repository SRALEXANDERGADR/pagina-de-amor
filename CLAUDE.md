# Contexto para trabajar en Página de amor

Lee todo antes de tocar nada. Los pasos de instalación y los secretos están en `README.md`.

## El proyecto
- Página de una sola hoja para regalar como sorpresa, con panel privado en `/admin.html` (ningún botón lo enlaza; se entra escribiendo la dirección).
- Cloudflare Pages (proyecto `love-page`): se publica la carpeta `public/` (sin build) y las funciones de `functions/` (`api/content.js`, `api/upload.js`, `api/verify.js`).
- **No hay base de datos:** el texto va en `content/data.json` y las fotos en `public/gallery/` y `public/place/`. El panel los guarda con commits en `main` usando la API de GitHub. No los edites a mano salvo que lo pida.
- Es contenido personal y privado: no lo copies ni lo muestres fuera de lo necesario.
- El último cambio la dejó como «página cerrada/finalizada». Pregunta antes de reabrirla.

## Quién es el desarrollador y cómo hablarle
- Es desarrollador (GADR Net) y trabaja solo desde Android con Termux. No tiene PC.
- Háblale en español, corto y sencillo, sin palabras técnicas de más. Primero haz o dile qué hacer; explica solo lo necesario.
- Los textos para sus clientes van claros y sin abreviaturas (nada de «c/u»; escribe «cada una»).

## Reglas de trabajo
- Nunca subas contraseñas, claves, tokens ni cadenas de conexión. Van en los secretos de Cloudflare o en `.dev.vars` (ese archivo no se sube).
- No borres datos reales ni hagas cambios que no se puedan deshacer en la base de datos sin preguntar antes.
- Para detener un proceso, usa su número (`kill <PID>`), nunca `pkill`.
- Antes de subir: no hay build; revisa que `public/index.html` y `public/admin.html` abran bien.
- No hay dependencias; no subas `package-lock.json`.

## Comandos para publicar (Termux)
- Sube tus cambios a la rama que te indique la sesión (`claude/…`), nunca directo a `main`.
- Al terminar, dale al desarrollador este comando completo, con el nombre real de la rama:
  ```
  cd ~/pagina-de-amor && git fetch origin && git checkout main && git pull origin main && git merge --no-edit origin/<rama> && git push origin main
  ```
  (La carpeta en Termux se llama como el repositorio; si no existe, primero `git clone https://github.com/SRALEXANDERGADR/pagina-de-amor.git ~/pagina-de-amor`.)
- Cada push a `main` hace que Cloudflare Pages publique solo.
- Si no puedes subir a GitHub, prepara el cambio como parche (`git diff`) y dale los comandos para aplicarlo en `~/pagina-de-amor`.
- Cuando termines algo importante, anótalo en este archivo para que la próxima sesión lo sepa sin leer el chat viejo.
