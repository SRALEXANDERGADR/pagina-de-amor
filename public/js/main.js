(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const DEFAULT_CONTENT = {
    coupleNames: { you: "Tu amor", love: "Mi vida" },
    hero: { greeting: "Un regalo para ti" },
    video: { youtubeUrl: "" },
    letter: { text: "Escribe aquí tu carta desde el panel de administración." },
    gallery: [],
    loveList: [],
    ourPlace: { title: "Nuestro lugar", text: "", image: "" },
    bucketList: [],
    coupons: [],
    roulette: [],
    anniversary: { date: "", label: "Llevamos juntos" },
    question: { text: "¿Quieres ser mi novia?", yes: "Sí", no: "No", successTitle: "¡Dijiste que sí!", successText: "Este momento queda guardado para siempre." },
    closing: { text: "", signature: "" },
    music: { enabled: true }
  };

  let CONTENT = DEFAULT_CONTENT;
  let galleryIndex = 0;

  async function loadContent() {
    try {
      const res = await fetch("/api/content", { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      const data = await res.json();
      CONTENT = Object.assign({}, DEFAULT_CONTENT, data);
    } catch (e) {
      CONTENT = DEFAULT_CONTENT;
    }
  }

  function setText(sel, value) {
    const el = typeof sel === "string" ? $(sel) : sel;
    if (el) el.textContent = value ?? "";
  }

  function showSection(id) {
    const el = document.getElementById(id);
    if (el) el.hidden = false;
  }

  /* ---------------- render ---------------- */

  function renderHero() {
    setText("#hero-greeting", CONTENT.hero.greeting || "Un regalo para ti");
    setText("#hero-name-love", CONTENT.coupleNames.love || "—");
    setText("#hero-name-you", CONTENT.coupleNames.you || "—");
  }

  function renderVideo() {
    const url = CONTENT.video?.youtubeUrl;
    if (!url) return;
    const id = extractYoutubeId(url);
    if (!id) return;
    const frame = $("#video-frame");
    frame.dataset.embedId = id;
    frame.dataset.embedStart = extractYoutubeStart(url);
    showSection("section-video");
  }

  /**
   * Carga el iframe de YouTube y arranca la reproducción automáticamente.
   * Se llama en el mismo clic con el que se abre el sobre, para poder
   * aprovechar ese gesto del usuario y que los navegadores permitan
   * reproducir con sonido (si no, sólo permiten autoplay silenciado).
   */
  function startVideoPlayback() {
    const frame = $("#video-frame");
    const id = frame?.dataset.embedId;
    if (!id || frame.src) return; // ya cargado o no hay video configurado

    const start = parseInt(frame.dataset.embedStart || "0", 10);
    const startParam = start > 0 ? `&start=${start}` : "";
    const origin = encodeURIComponent(window.location.origin);
    frame.src = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&autoplay=1&mute=1&playsinline=1&enablejsapi=1&origin=${origin}${startParam}`;

    const tryUnmute = () => {
      try {
        frame.contentWindow.postMessage(JSON.stringify({ event: "command", func: "unMute", args: [] }), "*");
        frame.contentWindow.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*");
      } catch (e) { /* iframe aún no listo, se reintenta abajo */ }
    };
    // Reintentos: el player de YouTube tarda un poco en estar listo para recibir comandos
    setTimeout(tryUnmute, 800);
    setTimeout(tryUnmute, 1600);
    setTimeout(tryUnmute, 2600);

    // Respaldo visible: algunos navegadores (sobre todo iOS/Safari) bloquean
    // el audio automático aunque se intente activarlo desde JS. Mostramos un
    // botón para activarlo con un toque directo, que sí cuenta como gesto
    // de usuario válido y garantiza que el sonido funcione.
    const unmuteBtn = $("#video-unmute");
    if (unmuteBtn) {
      setTimeout(() => { unmuteBtn.hidden = false; }, 1200);
      unmuteBtn.addEventListener("click", () => {
        try {
          frame.contentWindow.postMessage(JSON.stringify({ event: "command", func: "unMute", args: [] }), "*");
          frame.contentWindow.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*");
        } catch (e) { /* no-op */ }
        unmuteBtn.hidden = true;
      });
    }
  }

  function extractYoutubeId(url) {
    const m = url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  /**
   * Extrae el segundo de inicio desde un link de YouTube, si lo trae.
   * Soporta los formatos que YouTube genera al compartir "desde cierto momento":
   *   ?t=45s   ?t=90   &start=45   ?t=1m30s   ?t=1h2m3s
   */
  function extractYoutubeStart(url) {
    const m = url.match(/[?&](?:t|start)=([0-9hms]+)/i);
    if (!m) return 0;
    const raw = m[1];
    if (/^\d+$/.test(raw)) return parseInt(raw, 10); // solo segundos: t=90
    const hms = raw.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
    if (!hms) return 0;
    const h = parseInt(hms[1] || "0", 10);
    const mi = parseInt(hms[2] || "0", 10);
    const s = parseInt(hms[3] || "0", 10);
    return h * 3600 + mi * 60 + s;
  }

  function renderLetter() {
    setText("#letter-text", CONTENT.letter.text || "");
    setText("#letter-signature", CONTENT.coupleNames.you || "");
  }

  function renderGallery() {
    const photos = CONTENT.gallery || [];
    if (!photos.length) return;
    const track = $("#gallery-track");
    const dots = $("#gallery-dots");
    track.innerHTML = "";
    dots.innerHTML = "";
    photos.forEach((p, i) => {
      const slide = document.createElement("div");
      slide.className = "gallery-slide";

      const img = document.createElement("img");
      img.src = p.url || "";
      img.alt = p.caption || "";
      img.loading = "lazy";
      slide.appendChild(img);

      if (p.caption) {
        const caption = document.createElement("p");
        caption.className = "gallery-caption";
        caption.textContent = p.caption;
        slide.appendChild(caption);
      }

      track.appendChild(slide);

      const dot = document.createElement("span");
      dot.className = "gallery-dot" + (i === 0 ? " is-active" : "");
      dots.appendChild(dot);
    });
    showSection("section-gallery");

    track.addEventListener("scroll", () => {
      const idx = Math.round(track.scrollLeft / track.clientWidth);
      $$(".gallery-dot").forEach((d, i) => d.classList.toggle("is-active", i === idx));
      galleryIndex = idx;
    }, { passive: true });

    $("#gallery-prev").onclick = () => scrollGallery(-1);
    $("#gallery-next").onclick = () => scrollGallery(1);
  }

  function scrollGallery(dir) {
    const track = $("#gallery-track");
    const max = track.children.length - 1;
    galleryIndex = Math.min(max, Math.max(0, galleryIndex + dir));
    track.scrollTo({ left: galleryIndex * track.clientWidth, behavior: "smooth" });
    LoveSound.click();
  }

  function renderLoveList() {
    const items = CONTENT.loveList || [];
    if (!items.length) return;
    setText("#lovelist-name", CONTENT.coupleNames.you || "ti");
    const ul = $("#lovelist-items");
    ul.innerHTML = items.map(i => `<li>${escapeHtml(i)}</li>`).join("");
    showSection("section-lovelist");
  }

  function renderPlace() {
    const place = CONTENT.ourPlace || {};
    if (!place.text && !place.image) return;
    setText("#place-title", place.title || "Nuestro lugar");
    setText("#place-text", place.text || "");
    if (place.image) {
      $("#place-image").src = place.image;
    } else {
      $("#place-image").closest(".place-image-wrap").style.display = "none";
    }
    showSection("section-place");
  }

  function renderBucketList() {
    const items = CONTENT.bucketList || [];
    if (!items.length) return;
    const ul = $("#bucketlist-items");
    ul.innerHTML = items.map(i => `<li>${escapeHtml(i)}</li>`).join("");
    showSection("section-bucketlist");
  }

  function renderCoupons() {
    const coupons = CONTENT.coupons || [];
    if (!coupons.length) return;
    const grid = $("#coupons-grid");
    const usedKey = "love-coupons-used";
    const used = JSON.parse(localStorage.getItem(usedKey) || "[]");

    grid.innerHTML = coupons.map((text, i) => `
      <div class="coupon ${used.includes(i) ? "is-used" : ""}" data-i="${i}">
        <span class="coupon-icon">♥</span>
        <span class="coupon-text">${escapeHtml(text)}</span>
        <button class="coupon-btn" ${used.includes(i) ? "disabled" : ""}>${used.includes(i) ? "Canjeado" : "Canjear"}</button>
      </div>
    `).join("");

    grid.addEventListener("click", (e) => {
      const btn = e.target.closest(".coupon-btn");
      if (!btn || btn.disabled) return;
      const card = btn.closest(".coupon");
      const i = Number(card.dataset.i);
      const usedNow = JSON.parse(localStorage.getItem(usedKey) || "[]");
      if (usedNow.includes(i)) return;
      usedNow.push(i);
      localStorage.setItem(usedKey, JSON.stringify(usedNow));
      card.classList.add("is-used");
      btn.disabled = true;
      btn.textContent = "Canjeado";
      LoveSound.redeem();
      burstConfetti(28);
      openModal({ title: "¡Vale canjeado!", text: coupons[i] });
    });

    showSection("section-coupons");
  }

  function renderRoulette() {
    const options = CONTENT.roulette || [];
    if (options.length < 2) return;
    const wheel = $("#roulette-wheel");
    const n = options.length;
    const colors = ["#7c2942", "#b45166", "#c9a15a", "#591d30", "#eccdd0", "#9c4a5c"];
    wheel.innerHTML = options.map((label, i) => {
      const angle = (360 / n) * i;
      const color = colors[i % colors.length];
      return `<div class="roulette-slice" style="transform: rotate(${angle}deg); clip-path: polygon(50% 50%, 0 0, 100% 0); background:${color};">
        <span>${escapeHtml(label)}</span>
      </div>`;
    }).join("");
    // Simpler & robust: use conic-gradient background instead of clipped slices for color wheel
    const step = 360 / n;
    const gradientStops = options.map((_, i) => `${colors[i % colors.length]} ${i * step}deg ${(i + 1) * step}deg`).join(", ");
    wheel.style.background = `conic-gradient(${gradientStops})`;
    wheel.querySelectorAll(".roulette-slice").forEach((el, i) => {
      el.style.background = "transparent";
      el.style.clipPath = "none";
      const mid = step * i + step / 2;
      el.style.transform = `rotate(${mid}deg)`;
    });

    let currentRotation = 0;
    let spinning = false;
    $("#roulette-spin").addEventListener("click", () => {
      if (spinning) return;
      spinning = true;
      const extraSpins = 5 + Math.floor(Math.random() * 3);
      const chosenIndex = Math.floor(Math.random() * n);
      const targetAngle = 360 - (chosenIndex * step + step / 2);
      currentRotation += extraSpins * 360 + (targetAngle - (currentRotation % 360));
      wheel.style.transform = `rotate(${currentRotation}deg)`;

      let tickCount = 0;
      const tickTimer = setInterval(() => {
        LoveSound.tick();
        tickCount++;
        if (tickCount > 22) clearInterval(tickTimer);
      }, 140);

      setTimeout(() => {
        spinning = false;
        LoveSound.reveal();
        burstConfetti(40);
        openModal({ title: "¡Elegido!", text: options[chosenIndex] });
      }, 3300);
    });

    showSection("section-roulette");
  }

  function renderCounter() {
    const dateStr = CONTENT.anniversary?.date;
    if (!dateStr) return;
    const start = new Date(dateStr + "T00:00:00");
    if (isNaN(start)) return;
    setText("#counter-label", CONTENT.anniversary.label || "Llevamos juntos");

    function update() {
      const now = new Date();
      let diffMs = now - start;
      if (diffMs < 0) diffMs = 0;
      const totalDays = Math.floor(diffMs / 86400000);
      const years = Math.floor(totalDays / 365);
      const months = Math.floor((totalDays % 365) / 30);
      const days = totalDays % 30;
      const el = $("#counter-numbers");
      el.innerHTML = `
        <div class="counter-unit"><span class="num">${totalDays}</span><span class="lbl">días</span></div>
        <div class="counter-unit"><span class="num">${years}</span><span class="lbl">años</span></div>
        <div class="counter-unit"><span class="num">${months}</span><span class="lbl">meses</span></div>
      `;
    }
    update();
    setInterval(update, 60000);
    showSection("section-counter");
  }

  function renderQuestion() {
    const q = CONTENT.question || {};
    setText("#question-text", q.text || "¿Quieres ser mi novia?");
    $("#question-yes").textContent = q.yes || "Sí";
    $("#question-no").textContent = q.no || "No";

    const noBtn = $("#question-no");
    const yesBtn = $("#question-yes");
    const wrap = $(".question-buttons");

    noBtn.addEventListener("pointerenter", dodge);
    noBtn.addEventListener("click", dodge);

    function dodge() {
      const rect = wrap.getBoundingClientRect();
      const btnRect = noBtn.getBoundingClientRect();
      const maxX = rect.width - btnRect.width;
      const maxY = 70;
      const x = Math.random() * maxX - maxX / 2;
      const y = Math.random() * maxY - maxY / 2;
      noBtn.classList.add("is-dodging");
      noBtn.style.transform = `translate(${x}px, ${y}px)`;
      LoveSound.dodge();
    }

    yesBtn.addEventListener("click", () => {
      LoveSound.celebrate();
      burstConfetti(90);
      openModal({
        title: q.successTitle || "¡Dijiste que sí!",
        text: q.successText || "Este momento queda guardado para siempre."
      });
    });

    showSection("section-question");
  }

  function renderClosing() {
    setText("#closing-text", CONTENT.closing?.text || "");
    setText("#closing-signature", CONTENT.closing?.signature || CONTENT.coupleNames.you || "");
    showSection("section-closing");
  }

  /* ---------------- interactions ---------------- */

  function openModal({ title, text }) {
    $("#modal-title").textContent = title || "";
    $("#modal-text").textContent = text || "";
    $("#modal").hidden = false;
  }
  function closeModal() { $("#modal").hidden = true; }

  function setupEnvelope() {
    const btn = $("#envelope-btn");
    btn.addEventListener("click", () => {
      if (btn.classList.contains("is-open")) return;
      btn.classList.add("is-open");
      LoveSound.open();
      startVideoPlayback();
      setTimeout(() => {
        const hero = $("#section-hero");
        hero.style.transition = "opacity .6s ease";
        hero.style.opacity = "0";
        setTimeout(() => {
          // display:none además de opacity:0, para que no quede un bloque
          // en blanco del alto de toda la pantalla si se hace scroll hacia
          // arriba después de abrir el sobre.
          hero.style.display = "none";
          $("#reveal-content").hidden = false;
          $("#reveal-content").scrollIntoView({ behavior: "smooth" });
          initScrollReveal();
        }, 500);
      }, 550);
    }, { once: true });
  }

  function setupLetter() {
    const btn = $("#letter-open-btn");
    btn.addEventListener("click", () => {
      $("#letter-body").hidden = false;
      btn.hidden = true;
      LoveSound.open();
    });
  }

  function setupMusicToggle() {
    const btn = $("#music-toggle");
    if (CONTENT.music?.enabled === false) { btn.hidden = true; return; }
    btn.addEventListener("click", () => {
      const playing = LoveSound.toggleMusic();
      btn.setAttribute("aria-pressed", String(playing));
      btn.setAttribute("aria-label", playing ? "Silenciar música" : "Activar música");
    });
  }

  function setupModal() {
    $("#modal-close").addEventListener("click", closeModal);
    $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
  }

  function initScrollReveal() {
    $$(".section").forEach(s => s.classList.add("reveal"));
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    $$(".section").forEach(s => obs.observe(s));
  }

  /* ---------------- background petals ---------------- */

  function initPetals() {
    const canvas = $("#petals-canvas");
    const ctx = canvas.getContext("2d");
    let w, h, petals;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    function makePetals() {
      const count = reduceMotion ? 0 : Math.min(26, Math.floor(w / 40));
      petals = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * -h,
        r: 4 + Math.random() * 6,
        speed: 0.4 + Math.random() * 0.8,
        drift: Math.random() * 1.4 - 0.7,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.02
      }));
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(180, 81, 102, 0.28)";
      petals.forEach(p => {
        p.y += p.speed;
        p.x += Math.sin(p.angle) * p.drift * 0.4;
        p.angle += p.spin;
        if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w; }
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r, p.r * 0.6, p.angle, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }
    resize(); makePetals();
    window.addEventListener("resize", () => { resize(); makePetals(); });
    if (!reduceMotion) requestAnimationFrame(draw);
  }

  function burstConfetti(count = 50) {
    const canvas = $("#confetti-canvas");
    const ctx = canvas.getContext("2d");
    const w = canvas.width = window.innerWidth;
    const h = canvas.height = window.innerHeight;
    const colors = ["#7c2942", "#b45166", "#c9a15a", "#eccdd0", "#591d30"];
    const pieces = Array.from({ length: count }, () => ({
      x: w / 2, y: h * 0.35,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * -10 - 4,
      size: 5 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.3,
      life: 0
    }));
    const maxLife = 110;
    function frame() {
      ctx.clearRect(0, 0, w, h);
      let alive = false;
      pieces.forEach(p => {
        if (p.life > maxLife) return;
        alive = true;
        p.vy += 0.35;
        p.x += p.vx; p.y += p.vy; p.rot += p.vrot; p.life++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - p.life / maxLife);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      if (alive) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, w, h);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- utils ---------------- */

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]));
  }
  function escapeAttr(str) { return escapeHtml(str); }

  /* ---------------- boot ---------------- */

  async function boot() {
    try {
      initPetals();
      await loadContent();

      renderHero();
      renderVideo();
      renderLetter();
      renderGallery();
      renderLoveList();
      renderPlace();
      renderBucketList();
      renderCoupons();
      renderRoulette();
      renderCounter();
      renderQuestion();
      renderClosing();

      setupEnvelope();
      setupLetter();
      setupMusicToggle();
      setupModal();

      $("#loading-screen").style.display = "none";
      $("#app").hidden = false;
    } catch (err) {
      console.error("Error al iniciar la página:", err);
      $("#loading-screen").style.display = "none";
      $("#error-screen").hidden = false;
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
