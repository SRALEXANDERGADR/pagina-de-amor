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

  function showToast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { t.hidden = true; }, 2600);
  }

  function getPassword() { return sessionStorage.getItem(PW_KEY) || ""; }

  async function verifyPassword(pw) {
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw })
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.ok;
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
    coupons: "coupons-list",
    roulette: "roulette-list"
  };

  function renderAllTextLists() {
    Object.entries(LIST_CONTAINERS).forEach(([key, containerId]) => renderTextList(containerId, key));
  }

  function bindAddButtonsFixed() {
    $$("[data-add]").forEach(btn => {
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
    content.roulette = (content.roulette || []).filter(v => v.trim() !== "");
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
    $("#gate-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const pw = $("#gate-password").value;
      $("#gate-error").hidden = true;
      const ok = await verifyPassword(pw);
      if (ok) {
        sessionStorage.setItem(PW_KEY, pw);
        enterPanel();
      } else {
        $("#gate-error").hidden = false;
      }
    });
  }

  async function boot() {
    bindGate();
    bindAddButtonsFixed();
    bindGalleryUpload();
    bindPlaceImageUpload();
    $("#save-btn").addEventListener("click", save);

    const savedPw = getPassword();
    if (savedPw) {
      const ok = await verifyPassword(savedPw);
      if (ok) { await enterPanel(); return; }
      sessionStorage.removeItem(PW_KEY);
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
