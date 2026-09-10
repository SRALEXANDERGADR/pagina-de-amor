(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const PW_KEY = "love-admin-pw";

  const EMPTY = {
    coupleNames: { you: "", love: "" },
    hero: { greeting: "" },
    song: { url: "", startSeconds: 0 },
    letter: { text: "" },
    gallery: [],
    loveList: [],
    ourPlace: { title: "", text: "", image: "" },
    bucketList: [],
    coupons: [],
    roulette: [],
    anniversary: { date: "", label: "" },
    question: { text: "", yes: "", no: "", successTitle: "", successText: "" },
    closing: { text: "", signature: "" },
    music: { enabled: true }
  };

  let content = structuredClone(EMPTY);

  // Contenido de ejemplo para que ningún campo se vea vacío la primera
  // vez que se abre el panel. Solo se usa para rellenar lo que el
  // usuario aún NO ha tocado (campos vacíos o listas sin items); nunca
  // pisa contenido que ya guardaron.
  const EXAMPLES = {
    greeting: "Un regalo para ti",
    letter: "Escribe aquí tu carta. Cuéntale por qué es especial para ti.",
    placeTitle: "Nuestro lugar",
    placeText: "Cuenta aquí dónde empezó todo entre ustedes.",
    anniversaryLabel: "Llevamos juntos",
    questionText: "¿Quieres ser mi novia?",
    questionYes: "Sí",
    questionNo: "No",
    questionSuccessTitle: "¡Dijiste que sí!",
    questionSuccessText: "Este momento queda guardado para siempre.",
    closingText: "Gracias por ser parte de mi vida. Esto es solo el comienzo.",
    coupleYou: "Tu amor",
    coupleLove: "Mi vida",
    loveList: [
      "Tu sonrisa cuando te cuento algo tonto",
      "Cómo me escuchas sin juzgarme",
      "Lo bien que me tratas siempre"
    ],
    bucketList: [
      "Nuestro primer viaje juntos",
      "Ver un amanecer juntos",
      "Cocinarte algo especial"
    ],
    coupons: [
      "Una noche de películas eligiendo tú",
      "Un desayuno en la cama",
      "Un masaje sin quejarme"
    ],
    roulette: [
      { label: "Cena", question: "¿Aceptas cenar conmigo?" },
      { label: "Cine", question: "¿Vamos al cine?" },
      { label: "Helado", question: "¿Te invito un helado?" },
      { label: "Picnic", question: "¿Hacemos un picnic?" },
      { label: "Baile", question: "¿Bailamos juntos?" },
      { label: "Sorpresa", question: "¿Te dejas sorprender?" }
    ]
  };

  function applyExampleFallbacks() {
    if (!content.coupleNames.you) content.coupleNames.you = EXAMPLES.coupleYou;
    if (!content.coupleNames.love) content.coupleNames.love = EXAMPLES.coupleLove;
    if (!content.hero.greeting) content.hero.greeting = EXAMPLES.greeting;
    if (!content.letter.text) content.letter.text = EXAMPLES.letter;
    if (!content.ourPlace.title) content.ourPlace.title = EXAMPLES.placeTitle;
    if (!content.ourPlace.text) content.ourPlace.text = EXAMPLES.placeText;
    if (!content.anniversary.label) content.anniversary.label = EXAMPLES.anniversaryLabel;
    if (!content.question.text) content.question.text = EXAMPLES.questionText;
    if (!content.question.yes) content.question.yes = EXAMPLES.questionYes;
    if (!content.question.no) content.question.no = EXAMPLES.questionNo;
    if (!content.question.successTitle) content.question.successTitle = EXAMPLES.questionSuccessTitle;
    if (!content.question.successText) content.question.successText = EXAMPLES.questionSuccessText;
    if (!content.closing.text) content.closing.text = EXAMPLES.closingText;
    if (!content.loveList || !content.loveList.length) content.loveList = EXAMPLES.loveList.slice();
    if (!content.bucketList || !content.bucketList.length) content.bucketList = EXAMPLES.bucketList.slice();
    if (!content.coupons || !content.coupons.length) content.coupons = EXAMPLES.coupons.slice();
    if (!content.roulette || !content.roulette.length) {
      content.roulette = EXAMPLES.roulette.map(o => Object.assign({}, o));
    } else {
      // Normaliza entradas viejas guardadas como texto plano.
      content.roulette = content.roulette.map(item =>
        typeof item === "string" ? { label: item, question: item } : item
      );
    }
  }

  function showToast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { t.hidden = true; }, 2600);
  }

  function getPassword() { return sessionStorage.getItem(PW_KEY) || ""; }

  /**
   * Devuelve { ok, networkError }. Antes, cualquier fallo de red o una
   * respuesta que no fuera JSON (por ejemplo si /api/verify no existe
   * todavía porque el sitio no se desplegó como Cloudflare Pages con
   * Functions) hacía que este fetch lanzara un error sin capturar: el
   * formulario quedaba "congelado" sin mostrar ningún mensaje. Ahora
   * cualquier fallo se captura y se distingue de una contraseña
   * simplemente incorrecta.
   */
  async function verifyPassword(pw) {
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw })
      });
      if (res.status === 401 || res.status === 400) return { ok: false };
      if (!res.ok) return { ok: false, networkError: true };
      const data = await res.json();
      return { ok: !!data.ok };
    } catch (err) {
      return { ok: false, networkError: true };
    }
  }

  /**
   * Sube una imagen ya comprimida (dataURL) como archivo real del repo
   * vía /api/upload, y devuelve la ruta pública (ej: "/gallery/xxxx.jpg").
   * Esto reemplaza el guardado anterior en base64 dentro del JSON de
   * contenido — cada foto es su propio archivo/commit en GitHub.
   */
  async function uploadImage(dataUrl, folder) {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": getPassword() },
      body: JSON.stringify({ dataUrl, folder })
    });
    if (res.status === 401) {
      sessionStorage.removeItem(PW_KEY);
      showToast("Sesión expirada, vuelve a entrar");
      location.reload();
      throw new Error("unauthorized");
    }
    if (!res.ok) throw new Error("upload failed");
    const data = await res.json();
    return data.path;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Sube un archivo de audio (mp3/m4a/wav/ogg) tal cual, sin comprimir,
   * vía /api/upload con kind:"audio". Usa la Git Data API del lado del
   * servidor porque estos archivos suelen pesar más del límite de la API
   * de "contents" (~1MB) que sí aplica a las fotos.
   */
  async function uploadAudio(file) {
    const dataUrl = await readFileAsDataUrl(file);
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": getPassword() },
      body: JSON.stringify({ dataUrl, kind: "audio", ext })
    });
    if (res.status === 401) {
      sessionStorage.removeItem(PW_KEY);
      showToast("Sesión expirada, vuelve a entrar");
      location.reload();
      throw new Error("unauthorized");
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "upload failed");
    }
    const data = await res.json();
    return data.path;
  }

  function bindSongUpload() {
    $("#f-song-upload-btn").addEventListener("click", () => $("#f-song-file").click());
    $("#f-song-file").addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        showToast("Subiendo canción…");
        const path = await uploadAudio(file);
        content.song.url = path;
        $("#f-song").value = path;
        showToast("Canción subida — no olvides Guardar cambios");
      } catch (err) {
        if (err.message !== "unauthorized") {
          showToast(err.message && err.message !== "upload failed" ? err.message : "No se pudo subir la canción");
        }
      }
      e.target.value = "";
    });
  }

  async function loadContent() {
    try {
      const res = await fetch("/api/content", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        content = Object.assign(structuredClone(EMPTY), data);
        // deep-merge nested objects
        for (const key of Object.keys(EMPTY)) {
          if (EMPTY[key] && typeof EMPTY[key] === "object" && !Array.isArray(EMPTY[key])) {
            content[key] = Object.assign({}, EMPTY[key], data[key] || {});
          }
        }
      }
    } catch (e) { /* keep defaults */ }
    applyExampleFallbacks();
  }

  /* ---------------- image handling ---------------- */

  function compressImage(file, maxDim = 1400, quality = 0.78) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => { img.src = reader.result; };
      reader.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) { height = height * (maxDim / width); width = maxDim; }
        else if (height > maxDim) { width = width * (maxDim / height); height = maxDim; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ---------------- repeat list helpers (texto simple) ---------------- */

  function renderTextList(containerId, key) {
    const container = $("#" + containerId);
    container.innerHTML = "";
    (content[key] || []).forEach((val, i) => {
      const row = document.createElement("div");
      row.className = "repeat-row";
      row.innerHTML = `<input type="text" value="${escapeAttr(val)}"><button type="button" class="remove-btn" aria-label="Eliminar">×</button>`;
      row.querySelector("input").addEventListener("input", (e) => { content[key][i] = e.target.value; });
      row.querySelector(".remove-btn").addEventListener("click", () => {
        content[key].splice(i, 1);
        renderTextList(containerId, key);
      });
      container.appendChild(row);
    });
  }

  /* map key -> container id, since ids vary slightly */
  const LIST_CONTAINERS = {
    loveList: "lovelist-list",
    bucketList: "bucketlist-list",
    coupons: "coupons-list"
  };

  function renderAllTextLists() {
    Object.entries(LIST_CONTAINERS).forEach(([key, containerId]) => renderTextList(containerId, key));
  }

  /* ---------------- ruleta (palabra en la rueda + pregunta al caer) ---------------- */

  function renderRouletteList() {
    const container = $("#roulette-list");
    container.innerHTML = "";
    (content.roulette || []).forEach((item, i) => {
      const row = document.createElement("div");
      row.className = "repeat-row repeat-row--roulette";
      row.innerHTML = `
        <div class="roulette-fields">
          <input type="text" class="roulette-label" placeholder="Palabra en la ruleta (ej: Cena)" value="${escapeAttr(item.label || "")}">
          <input type="text" class="roulette-question" placeholder="Pregunta al caer ahí (ej: ¿Aceptas cenar conmigo?)" value="${escapeAttr(item.question || "")}">
        </div>
        <button type="button" class="remove-btn" aria-label="Eliminar">×</button>
      `;
      row.querySelector(".roulette-label").addEventListener("input", e => {
        content.roulette[i].label = e.target.value;
      });
      row.querySelector(".roulette-question").addEventListener("input", e => {
        content.roulette[i].question = e.target.value;
      });
      row.querySelector(".remove-btn").addEventListener("click", () => {
        content.roulette.splice(i, 1);
        renderRouletteList();
      });
      container.appendChild(row);
    });
  }

  function bindRouletteAdd() {
    const btn = document.querySelector('[data-add="roulette"]');
    if (!btn) return;
    btn.addEventListener("click", () => {
      content.roulette = content.roulette || [];
      content.roulette.push({ label: "", question: "" });
      renderRouletteList();
    });
  }

  function bindAddButtonsFixed() {
    $$("[data-add]").forEach(btn => {
      if (btn.dataset.add === "roulette") return; // maneja su propio shape {label,question}
      btn.addEventListener("click", () => {
        const key = btn.dataset.add;
        content[key] = content[key] || [];
        content[key].push("");
        renderTextList(LIST_CONTAINERS[key], key);
      });
    });
  }

  /* ---------------- gallery ---------------- */

  // Vista previa local mientras Cloudflare termina de desplegar la foto
  // nueva (tarda uno o dos minutos en quedar servida en /gallery/...).
  const galleryPreviewCache = new Map();

  function renderGalleryList() {
    const container = $("#gallery-list");
    container.innerHTML = "";
    content.gallery.forEach((item, i) => {
      const row = document.createElement("div");
      row.className = "gallery-item";
      const previewSrc = galleryPreviewCache.get(item.url) || item.url;
      row.innerHTML = `
        <img src="${previewSrc}" alt="">
        <input type="text" placeholder="Descripción (opcional)" value="${escapeAttr(item.caption || "")}">
        <button type="button" class="remove-btn" aria-label="Eliminar">×</button>
      `;
      row.querySelector("input").addEventListener("input", e => { content.gallery[i].caption = e.target.value; });
      row.querySelector(".remove-btn").addEventListener("click", () => {
        content.gallery.splice(i, 1);
        renderGalleryList();
      });
      container.appendChild(row);
    });
  }

  function bindGalleryUpload() {
    $("#gallery-file").addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        try {
          showToast("Subiendo foto…");
          const dataUrl = await compressImage(file);
          const path = await uploadImage(dataUrl, "gallery");
          galleryPreviewCache.set(path, dataUrl);
          content.gallery.push({ url: path, caption: "" });
          renderGalleryList();
        } catch (err) { showToast("No se pudo subir una imagen"); }
      }
      e.target.value = "";
    });
  }

  function bindPlaceImageUpload() {
    $("#f-place-image-btn").addEventListener("click", () => $("#f-place-image-file").click());
    $("#f-place-image-file").addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        showToast("Subiendo foto…");
        const dataUrl = await compressImage(file, 1200, 0.78);
        const path = await uploadImage(dataUrl, "place");
        placePreviewOverride = dataUrl;
        content.ourPlace.image = path;
        renderPlaceImagePreview();
      } catch (err) { showToast("No se pudo subir la imagen"); }
      e.target.value = "";
    });
  }

  let placePreviewOverride = null;

  function renderPlaceImagePreview() {
    const wrap = $("#f-place-image-preview");
    const src = placePreviewOverride || content.ourPlace.image;
    wrap.innerHTML = src ? `<img src="${src}" alt="">` : "";
  }

  /* ---------------- form <-> content sync ---------------- */

  function fillForm() {
    $("#f-you").value = content.coupleNames.you || "";
    $("#f-love").value = content.coupleNames.love || "";
    $("#f-greeting").value = content.hero.greeting || "";
    $("#f-song").value = content.song.url || "";
    $("#f-song-start").value = content.song.startSeconds || 0;
    $("#f-letter").value = content.letter.text || "";
    $("#f-place-title").value = content.ourPlace.title || "";
    $("#f-place-text").value = content.ourPlace.text || "";
    $("#f-anniversary-date").value = content.anniversary.date || "";
    $("#f-anniversary-label").value = content.anniversary.label || "";
    $("#f-question-text").value = content.question.text || "";
    $("#f-question-yes").value = content.question.yes || "";
    $("#f-question-no").value = content.question.no || "";
    $("#f-question-success-title").value = content.question.successTitle || "";
    $("#f-question-success-text").value = content.question.successText || "";
    $("#f-closing-text").value = content.closing.text || "";
    $("#f-closing-signature").value = content.closing.signature || "";
    $("#f-music-enabled").checked = content.music.enabled !== false;

    renderGalleryList();
    renderAllTextLists();
    renderRouletteList();
    renderPlaceImagePreview();
  }

  function readForm() {
    content.coupleNames.you = $("#f-you").value.trim();
    content.coupleNames.love = $("#f-love").value.trim();
    content.hero.greeting = $("#f-greeting").value.trim();
    content.song.url = $("#f-song").value.trim();
    content.song.startSeconds = Math.max(0, parseInt($("#f-song-start").value, 10) || 0);
    content.letter.text = $("#f-letter").value;
    content.ourPlace.title = $("#f-place-title").value.trim();
    content.ourPlace.text = $("#f-place-text").value;
    content.anniversary.date = $("#f-anniversary-date").value;
    content.anniversary.label = $("#f-anniversary-label").value.trim();
    content.question.text = $("#f-question-text").value.trim();
    content.question.yes = $("#f-question-yes").value.trim();
    content.question.no = $("#f-question-no").value.trim();
    content.question.successTitle = $("#f-question-success-title").value.trim();
    content.question.successText = $("#f-question-success-text").value.trim();
    content.closing.text = $("#f-closing-text").value;
    content.closing.signature = $("#f-closing-signature").value.trim();
    content.music.enabled = $("#f-music-enabled").checked;

    content.loveList = (content.loveList || []).filter(v => v.trim() !== "");
    content.bucketList = (content.bucketList || []).filter(v => v.trim() !== "");
    content.coupons = (content.coupons || []).filter(v => v.trim() !== "");
    content.roulette = (content.roulette || []).filter(item => (item.label || "").trim() !== "" || (item.question || "").trim() !== "");
  }

  async function save() {
    readForm();
    $("#save-status").textContent = "Guardando…";
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": getPassword() },
        body: JSON.stringify(content)
      });
      if (res.status === 401) {
        sessionStorage.removeItem(PW_KEY);
        showToast("Sesión expirada, vuelve a entrar");
        location.reload();
        return;
      }
      if (!res.ok) throw new Error("save failed");
      $("#save-status").textContent = "Guardado ✓";
      showToast("Cambios guardados");
    } catch (e) {
      $("#save-status").textContent = "";
      showToast("No se pudo guardar. Intenta de nuevo.");
    }
  }

  function escapeAttr(str) {
    return String(str).replace(/[&<>"']/g, s => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]));
  }

  /* ---------------- boot ---------------- */

  async function enterPanel() {
    $("#gate").hidden = true;
    $("#panel").hidden = false;
    await loadContent();
    fillForm();
  }

  function bindGate() {
    const form = $("#gate-form");
    const input = $("#gate-password");
    const errorEl = $("#gate-error");
    const submitBtn = form.querySelector("button[type=submit]");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const pw = input.value;
      errorEl.hidden = true;

      submitBtn.disabled = true;
      const originalLabel = submitBtn.textContent;
      submitBtn.textContent = "Comprobando…";

      const { ok, networkError } = await verifyPassword(pw);

      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;

      if (ok) {
        sessionStorage.setItem(PW_KEY, pw);
        enterPanel();
      } else {
        errorEl.textContent = networkError
          ? "No se pudo conectar. Revisa tu conexión e intenta de nuevo."
          : "Contraseña incorrecta.";
        errorEl.hidden = false;
        input.select();
      }
    });
  }

  async function boot() {
    bindGate();
    bindAddButtonsFixed();
    bindRouletteAdd();
    bindGalleryUpload();
    bindPlaceImageUpload();
    bindSongUpload();
    $("#save-btn").addEventListener("click", save);

    const savedPw = getPassword();
    if (savedPw) {
      const { ok, networkError } = await verifyPassword(savedPw);
      if (ok) { await enterPanel(); return; }
      // Si fue un error de red (no una contraseña rechazada), no borramos
      // la sesión guardada: puede que sí fuera correcta y solo falló la
      // conexión momentáneamente. Se reintentará la próxima vez que entre.
      if (!networkError) sessionStorage.removeItem(PW_KEY);
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
