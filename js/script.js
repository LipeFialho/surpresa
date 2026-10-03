/* =========================================================
   Declaração — interações
   ========================================================= */
(() => {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------
     1. Barra de progresso da leitura
     --------------------------------------------------------- */
  const progressBar = document.getElementById("progressBar");

  const updateProgress = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
    progressBar.style.width = pct + "%";
  };

  /* ---------------------------------------------------------
     2. Parallax (imagens se movem na rolagem)
     --------------------------------------------------------- */
  const parallaxEls = Array.from(document.querySelectorAll(".parallax"));

  const updateParallax = () => {
    if (prefersReduced) return;
    const vh = window.innerHeight;
    const isNarrow = window.innerWidth <= 900;

    for (const el of parallaxEls) {
      // em telas pequenas a galeria vira coluna única: parallax só atrapalha
      if (isNarrow && !el.classList.contains("hero__bg")) {
        if (el.style.transform) {
          el.style.transform = "";
          el.dataset.cur = "0";
        }
        continue;
      }

      const rect = el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) continue;

      const cur = parseFloat(el.dataset.cur || "0");
      const rawTop = rect.top - cur; // topo sem o transform atual
      const speed = parseFloat(el.dataset.speed || "0.15");
      const offset = (rawTop + rect.height / 2 - vh / 2) * speed;

      el.dataset.cur = String(offset);
      el.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
    }
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateProgress();
      updateParallax();
      ticking = false;
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------------------------------------------------------
     3. Reveal on scroll
     --------------------------------------------------------- */
  const revealEls = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window && !prefersReduced) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const siblings = Array.from(el.parentElement.children).filter((c) =>
              c.classList.contains("reveal")
            );
            const idx = siblings.indexOf(el);
            el.style.transitionDelay = `${Math.max(idx, 0) * 90}ms`;
            el.classList.add("is-visible");
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------------------------------------------------------
     4. Luz que segue o cursor
     --------------------------------------------------------- */
  const glow = document.querySelector(".cursor-glow");
  let glowX = window.innerWidth / 2;
  let glowY = window.innerHeight / 2;
  let targetX = glowX;
  let targetY = glowY;

  window.addEventListener(
    "pointermove",
    (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (glow) glow.style.opacity = "1";
    },
    { passive: true }
  );

  const animateGlow = () => {
    glowX += (targetX - glowX) * 0.12;
    glowY += (targetY - glowY) * 0.12;
    if (glow) glow.style.transform = `translate3d(${glowX}px, ${glowY}px, 0)`;
    requestAnimationFrame(animateGlow);
  };
  if (!prefersReduced) animateGlow();

  /* ---------------------------------------------------------
     5. Estrelas/partículas de fundo
     --------------------------------------------------------- */
  const starsCanvas = document.getElementById("stars");
  if (starsCanvas && !prefersReduced) {
    const ctx = starsCanvas.getContext("2d");
    let stars = [];

    const makeStars = () => {
      starsCanvas.width = window.innerWidth;
      starsCanvas.height = window.innerHeight;
      const count = Math.min(120, Math.floor(window.innerWidth / 12));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * starsCanvas.width,
        y: Math.random() * starsCanvas.height,
        r: Math.random() * 1.6 + 0.3,
        a: Math.random(),
        s: Math.random() * 0.018 + 0.004,
        hue: Math.random() > 0.55 ? 276 : 262
      }));
    };

    const drawStars = () => {
      ctx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
      for (const st of stars) {
        st.a += st.s;
        const alpha = 0.35 + Math.abs(Math.sin(st.a)) * 0.6;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${st.hue}, 85%, 78%, ${alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `hsla(${st.hue}, 90%, 65%, 0.9)`;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      requestAnimationFrame(drawStars);
    };

    makeStars();
    drawStars();
    window.addEventListener("resize", makeStars);
  }

  /* ---------------------------------------------------------
     6. Efeito de digitação no título do hero
     --------------------------------------------------------- */
  const typeLines = document.querySelectorAll("[data-type]");
  if (typeLines.length && !prefersReduced) {
    typeLines.forEach((line, i) => {
      const full = line.textContent.trim();
      line.textContent = "";
      let n = 0;
      const startDelay = 350 + i * 620;

      setTimeout(() => {
        const tick = setInterval(() => {
          line.textContent = full.slice(0, ++n);
          if (n >= full.length) clearInterval(tick);
        }, 65);
      }, startDelay);
    });
  }

  /* ---------------------------------------------------------
     7. Botão "Não" que foge do mouse
     --------------------------------------------------------- */
  const btnNo = document.getElementById("btnNo");
  const btnYes = document.getElementById("btnYes");
  const askBox = document.getElementById("askBox");
  let flying = false;
  let noCount = 0;
  let lastTouch = 0;

  const BOX_PAD = 16;

  // o botão vive em position:absolute dentro de .ask, então as coordenadas
  // que interessam são as relativas à caixinha (não à tela)
  const boxRect = () => (askBox ? askBox.getBoundingClientRect() : null);

  const clampToBox = () => {
    if (!btnNo || !flying || !askBox) return;
    const b = boxRect();
    const left = parseFloat(btnNo.style.left) || 0;
    const top = parseFloat(btnNo.style.top) || 0;
    const maxX = Math.max(BOX_PAD, b.width - btnNo.offsetWidth - BOX_PAD);
    const maxY = Math.max(BOX_PAD, b.height - btnNo.offsetHeight - BOX_PAD);
    btnNo.style.left = Math.min(Math.max(left, BOX_PAD), maxX) + "px";
    btnNo.style.top = Math.min(Math.max(top, BOX_PAD), maxY) + "px";
  };

  // elementos que o "Não" não deve cobrir enquanto foge
  const avoidRects = () => {
    if (!askBox) return [];
    const sel = ".kicker, .ask__heart, .ask__title, .ask__hint, .btn--yes";
    return Array.from(askBox.querySelectorAll(sel)).map((el) => {
      const r = el.getBoundingClientRect();
      const b = boxRect();
      return { left: r.left - b.left - 8, top: r.top - b.top - 6, right: r.right - b.left + 8, bottom: r.bottom - b.top + 6 };
    });
  };

  const overlaps = (left, top, w, h, rects) =>
    rects.some(
      (q) => left < q.right && left + w > q.left && top < q.bottom && top + h > q.top
    );

  const placeRandomly = (fromX, fromY) => {
    if (!btnNo || !askBox) return;
    const b = boxRect();
    const w = btnNo.offsetWidth;
    const h = btnNo.offsetHeight;

    const minX = BOX_PAD;
    const maxX = Math.max(minX, b.width - w - BOX_PAD);
    const minY = BOX_PAD;
    const maxY = Math.max(minY, b.height - h - BOX_PAD);

    const blocked = avoidRects();

    let left = 0;
    let top = 0;
    let tries = 0;
    let ok = false;

    // cantos livres usados só se aleatório falhar (caixa muito cheia)
    const fallbacks = [
      [minX, minY],
      [maxX, minY],
      [minX, maxY],
      [maxX, maxY],
      [minX, (minY + maxY) / 2],
      [maxX, (minY + maxY) / 2]
    ];

    do {
      left = minX + Math.random() * (maxX - minX);
      top = minY + Math.random() * (maxY - minY);
      tries++;

      // centro do candidato em coordenadas de tela
      const cx = b.left + left + w / 2;
      const cy = b.top + top + h / 2;

      const longeDoMouse =
        fromX === undefined || Math.hypot(cx - fromX, cy - fromY) > 170;

      if (longeDoMouse && !overlaps(left, top, w, h, blocked)) {
        ok = true;
        break;
      }
    } while (tries < 40);

    if (!ok) {
      const spot = fallbacks.find(([fx, fy]) => !overlaps(fx, fy, w, h, blocked));
      if (spot) {
        left = spot[0];
        top = spot[1];
      }
    }

    btnNo.style.left = left + "px";
    btnNo.style.top = top + "px";
  };

  const startFlying = (fromX, fromY) => {
    if (!btnNo || flying || !askBox) return;
    flying = true;

    // trava onde ele está agora, já em coordenadas da caixa, antes do salto
    const r = btnNo.getBoundingClientRect();
    const b = boxRect();
    btnNo.style.left = r.left - b.left + "px";
    btnNo.style.top = r.top - b.top + "px";
    btnNo.classList.add("is-flying", "running");

    placeRandomly(fromX, fromY);
  };

  window.addEventListener("resize", clampToBox);

  const fleeFromPointer = (clientX, clientY) => {
    if (!btnNo) return;
    const r = btnNo.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const distance = Math.hypot(clientX - cx, clientY - cy);

    const reach = flying ? 140 : 115;
    if (distance < reach) {
      noCount++;
      if (!flying) startFlying(clientX, clientY);
      else placeRandomly(clientX, clientY);

      // frases de deboche
      const hints = [
        "ops, errou o alvo 😜",
        "esse botão tá estragado...",
        "não funciona, juro 💜",
        "tentativa " + noCount + " e ainda nada 🙃",
        "só o Sim funciona ✨"
      ];
      const hint = document.querySelector(".ask__hint");
      if (hint && noCount % 2 === 0) {
        hint.textContent = hints[Math.min(noCount / 2 - 1, hints.length - 1)];
      }
    }
  };

  if (btnNo) {
    window.addEventListener(
      "pointermove",
      (e) => fleeFromPointer(e.clientX, e.clientY),
      { passive: true }
    );
    // mobile: toque direto
    btnNo.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        lastTouch = Date.now();
        noCount++;
        const t = e.touches[0];
        const px = t ? t.clientX : undefined;
        const py = t ? t.clientY : undefined;
        if (!flying) startFlying(px, py);
        else placeRandomly(px, py);
      },
      { passive: false }
    );
    // fallback: clique também foge
    btnNo.addEventListener("click", (e) => {
      e.preventDefault();
      if (Date.now() - lastTouch < 700) return;
      noCount++;
      if (!flying) startFlying(e.clientX, e.clientY);
      else placeRandomly(e.clientX, e.clientY);
    });
  }

  /* ---------------------------------------------------------
     8. Botão "Sim" → comemoração + confetes
     --------------------------------------------------------- */
  const celebrate = document.getElementById("celebrate");
  const btnBack = document.getElementById("btnBack");
  const confettiCanvas = document.getElementById("confetti");
  let confettiAnim = null;

  const runConfetti = () => {
    if (!confettiCanvas || prefersReduced) return;
    const ctx = confettiCanvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      confettiCanvas.width = window.innerWidth * dpr;
      confettiCanvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const colors = ["#a855f7", "#c084fc", "#6d28d9", "#e9d5ff", "#f0abfc", "#ffffff"];
    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    const pieces = Array.from({ length: 160 }, () => ({
      x: Math.random() * W(),
      y: Math.random() * -H(),
      w: Math.random() * 10 + 5,
      h: Math.random() * 7 + 4,
      color: colors[(Math.random() * colors.length) | 0],
      vy: Math.random() * 3 + 1.6,
      vx: (Math.random() - 0.5) * 2.2,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.16,
      sway: Math.random() * Math.PI * 2
    }));

    let running = true;
    const loop = () => {
      if (!running) return;
      ctx.clearRect(0, 0, W(), H());

      for (const p of pieces) {
        p.sway += 0.03;
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.sway) * 0.7;
        p.rot += p.vr;

        if (p.y > H() + 20) {
          p.y = -20;
          p.x = Math.random() * W();
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      confettiAnim = requestAnimationFrame(loop);
    };
    loop();

    // para o confete depois de um tempo (e economiza bateria)
    setTimeout(() => {
      running = false;
      cancelAnimationFrame(confettiAnim);
      ctx.clearRect(0, 0, W(), H());
    }, 14000);

    window.addEventListener("resize", resize, { once: true });
  };

  if (btnYes && celebrate) {
    btnYes.addEventListener("click", () => {
      btnYes.classList.add("growing");
      // esconde o botão "Não" para ele não fugir da tela de sucesso
      if (btnNo) btnNo.style.display = "none";

      setTimeout(() => {
        celebrate.classList.add("show");
        celebrate.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        runConfetti();
        btnYes.classList.remove("growing");
      }, 620);
    });
  }

  if (btnBack && celebrate) {
    btnBack.addEventListener("click", () => {
      celebrate.classList.remove("show");
      celebrate.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (btnNo) {
        btnNo.style.display = "";
        btnNo.classList.remove("is-flying", "running");
        btnNo.style.left = "";
        btnNo.style.top = "";
        flying = false;
        noCount = 0;
        const hint = document.querySelector(".ask__hint");
        if (hint) hint.textContent = "Só existe uma resposta certa. 💜";
      }
      document.getElementById("pergunta").scrollIntoView({ behavior: "smooth" });
    });
  }
})();
