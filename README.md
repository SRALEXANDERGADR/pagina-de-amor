# Página de amor privada

Sitio de una sola página para regalar como sorpresa + panel de administración
privado en `/admin.html` (sin ningún botón que lo enlace desde la página
pública — solo se entra escribiendo la dirección a mano).

## Estructura

```
public/            <- esto es lo que se despliega (carpeta raíz del sitio)
  index.html        <- página que verá tu pareja
  admin.html         <- panel privado (tú escribes /admin.html en el navegador)
  css/
  js/
functions/
  api/content.js     <- GET/POST del contenido (Cloudflare Pages Function)
  api/verify.js       <- valida la contraseña del panel
wrangler.toml          <- referencia para desarrollo local / binding de KV
```

Todo el contenido (nombres, carta, fotos, vales, ruleta, etc.) se guarda en un
**KV namespace de Cloudflare**, así que cuando editas y guardas desde tu
panel, se refleja automáticamente en el link que le mandes a ella — sin
importar que sea otro teléfono.

## Pasos para desplegar (Cloudflare Pages)

1. **Sube el proyecto a un repo de GitHub** (con tu flujo habitual de
   Termux/git que ya usas en tus otros proyectos), o arrastra la carpeta
   completa desde el dashboard de Cloudflare Pages (Direct Upload).

2. **Crea el KV namespace:**
   - Dashboard de Cloudflare → **Workers & Pages** → **KV** → *Create namespace*.
   - Nómbralo, por ejemplo, `love-content`.
   - Copia su **ID**.

3. **Crea el proyecto de Pages** apuntando a la carpeta `public` como
   directorio de salida (build output directory = `public`, sin comando de
   build).

4. **Enlaza el KV namespace al proyecto:**
   - En el proyecto de Pages → **Settings** → **Functions** →
     **KV namespace bindings** → *Add binding*.
   - Variable name: `CONTENT_KV`
   - KV namespace: el que creaste en el paso 2.

5. **Configura la contraseña del panel como secreto:**
   - En el mismo proyecto → **Settings** → **Environment variables** →
     *Add variable* → marca como **Secret**.
   - Nombre: `ADMIN_PASSWORD`
   - Valor: la contraseña que tú quieras usar para entrar a `/admin.html`.
   - Agrégala tanto en **Production** como en **Preview** si vas a probar
     con un deploy de preview.

6. **Vuelve a desplegar** (un nuevo commit, o *Retry deployment*) para que
   tome el binding y el secreto — los bindings no aplican a deploys ya
   hechos.

7. Entra a `https://tu-sitio.pages.dev/admin.html`, escribe tu contraseña,
   llena todo (nombres, carta, fotos, vales, ruleta, la pregunta, etc.) y
   dale **Guardar cambios**.

8. Comparte `https://tu-sitio.pages.dev/` (la raíz, sin `/admin.html`) con
   tu novia. Esa es la única URL que ella necesita.

## Notas importantes

- **La página pública no ve ni linkea el panel.** Solo se accede
  escribiendo `/admin.html` manualmente, tal como pediste.
- **Las imágenes** se comprimen en el navegador antes de guardarse (quedan
  dentro del mismo registro de KV), así que no necesitas configurar
  almacenamiento de archivos aparte. Si en algún momento subes fotos muy
  pesadas o muchas, y el guardado falla por tamaño, reduce el número de
  fotos o su resolución.
- **Los sonidos y la música** están generados con Web Audio (no son
  archivos de audio), así que no hay nada que subir para que funcionen.
- **Los vales canjeados** se recuerdan en el propio navegador de quien los
  canjea (no en el servidor), para que cada visita/dispositivo tenga su
  propio progreso.
- Si algún día quieres cambiar la contraseña del panel, solo actualiza el
  secreto `ADMIN_PASSWORD` en Cloudflare y vuelve a desplegar.
- El meta tag `noindex` evita que buscadores indexen las páginas, pero la
  privacidad real depende de que no compartas el link públicamente — igual
  que en el sitio que te inspiró.
