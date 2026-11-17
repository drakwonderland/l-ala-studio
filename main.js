document.addEventListener("DOMContentLoaded", () => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 0. Smooth Initial Skeleton Resolution (zero layout shift via .load-stage)
  const loadStages = document.querySelectorAll(".load-stage[data-loaded='false']");
  if (loadStages.length) {
    const resolveLoadStages = () => {
      loadStages.forEach((stage) => stage.setAttribute("data-loaded", "true"));
    };
    if (prefersReduced) {
      resolveLoadStages();
    } else {
      const minDelay = new Promise((res) => setTimeout(res, 420));
      const fontsReady = document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve();
      Promise.all([minDelay, Promise.race([fontsReady, new Promise((res) => setTimeout(res, 800))])]).then(
        resolveLoadStages
      );
    }
  }

  // 1. Scroll Reveal + Staggered Children (compositor-only, unobserves after trigger)
  document.querySelectorAll(".reveal").forEach((section) => {
    section.querySelectorAll(".reveal-item").forEach((item, idx) => {
      const capped = Math.min(idx, 5);
      item.style.setProperty("--stagger-delay", `${capped * 45}ms`);
    });
  });

  const revealEls = document.querySelectorAll(".reveal");
  if (!prefersReduced && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -16px 0px" }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("active"));
  }

  // 1b. Scroll Progress Hairline (GPU transform: scaleX) + Active Nav Tracking
  const progressBar = document.getElementById("scroll-progress");
  let scrollTicking = false;
  const updateScrollProgress = () => {
    if (progressBar) {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = maxScroll > 0 ? Math.min(Math.max(window.scrollY / maxScroll, 0), 1) : 0;
      progressBar.style.transform = `scaleX(${ratio})`;
    }
    scrollTicking = false;
  };
  if (progressBar) {
    updateScrollProgress();
    window.addEventListener(
      "scroll",
      () => {
        if (!scrollTicking) {
          window.requestAnimationFrame(updateScrollProgress);
          scrollTicking = true;
        }
      },
      { passive: true }
    );
  }

  const navLinks = document.querySelectorAll(".nav-link[data-section]");
  if (navLinks.length && "IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("id");
            navLinks.forEach((link) => {
              link.setAttribute("aria-current", String(link.getAttribute("data-section") === id));
            });
          }
        });
      },
      { rootMargin: "-30% 0px -55% 0px" }
    );
    navLinks.forEach((link) => {
      const target = document.getElementById(link.getAttribute("data-section"));
      if (target) sectionObserver.observe(target);
    });
  }

  // 1c. Compositor-Only Click Ring (transform + opacity only, zero layout/paint)
  if (!prefersReduced) {
    document.addEventListener(
      "pointerdown",
      (e) => {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        const ring = document.createElement("span");
        ring.className = "click-ring";
        ring.style.left = `${e.clientX}px`;
        ring.style.top = `${e.clientY}px`;
        document.body.appendChild(ring);
        ring.addEventListener("animationend", () => ring.remove(), { once: true });
      },
      { passive: true }
    );
  }

  // 2. Interactive AlertShield Telemetry Bench
  const telemetryModes = {
    nominal: {
      ir: "27.4 °C",
      flood: "4 cm",
      gas: "180 ppm",
      latency: "0 ms (local)",
      status: "Nominal standby",
      alert: false,
      amp: 6,
      freq: 0.028,
    },
    flood: {
      ir: "26.8 °C",
      flood: "16 cm",
      gas: "185 ppm",
      latency: "40 ms (local)",
      status: "Flood threshold >= 15 cm",
      alert: true,
      amp: 16,
      freq: 0.045,
    },
    thermal: {
      ir: "64.2 °C",
      flood: "4 cm",
      gas: "210 ppm",
      latency: "0.100 °C err",
      status: "IR thermal threshold",
      alert: true,
      amp: 20,
      freq: 0.065,
    },
    gas: {
      ir: "28.1 °C",
      flood: "4 cm",
      gas: "640 ppm",
      latency: "1.01 s avg",
      status: "MQ-series gas alert",
      alert: true,
      amp: 22,
      freq: 0.085,
    },
  };

  let activeMode = telemetryModes.nominal;
  const modeButtons = document.querySelectorAll("[data-telemetry-mode]");
  const elIr = document.getElementById("tel-ir");
  const elFlood = document.getElementById("tel-flood");
  const elGas = document.getElementById("tel-gas");
  const elLatency = document.getElementById("tel-latency");
  const elStatus = document.getElementById("tel-status");
  const elDot = document.getElementById("tel-dot");

  const updateReadout = (el, nextText) => {
    if (!el || el.textContent === nextText) return;
    if (prefersReduced) {
      el.textContent = nextText;
      return;
    }
    el.classList.add("updating");
    window.requestAnimationFrame(() => {
      el.textContent = nextText;
      window.requestAnimationFrame(() => {
        el.classList.remove("updating");
      });
    });
  };

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-telemetry-mode");
      if (!telemetryModes[key]) return;
      activeMode = telemetryModes[key];

      modeButtons.forEach((b) => {
        const isCurrent = b === btn;
        b.setAttribute("aria-pressed", String(isCurrent));
        b.classList.toggle("bg-[#111214]", isCurrent);
        b.classList.toggle("text-[#f6f5f1]", isCurrent);
        b.classList.toggle("border-[#111214]", isCurrent);
        b.classList.toggle("text-[#4a4d52]", !isCurrent);
        b.classList.toggle("hover:text-[#111214]", !isCurrent);
        b.classList.toggle("border-black/15", !isCurrent);
      });

      updateReadout(elIr, activeMode.ir);
      updateReadout(elFlood, activeMode.flood);
      updateReadout(elGas, activeMode.gas);
      updateReadout(elLatency, activeMode.latency);

      if (elStatus) {
        elStatus.textContent = activeMode.status;
        elStatus.className = activeMode.alert
          ? "font-mono text-xs text-[#b91c1c] transition-colors duration-150"
          : "font-mono text-xs text-[#4a4d52] transition-colors duration-150";
      }
      if (elDot) {
        elDot.className = activeMode.alert
          ? "w-2 h-2 rounded-full bg-[#b91c1c] transition-colors duration-150"
          : "w-2 h-2 rounded-full bg-[#1d3557] transition-colors duration-150";
      }
    });
  });

  // Smoothly interpolated oscilloscope trace on warm paper
  const canvas = document.getElementById("telemetry-wave");
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    let phase = 0;
    let currentAmp = activeMode.amp;
    let currentFreq = activeMode.freq;
    let rafId = null;
    let isVisible = true;

    const drawFrame = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      if (prefersReduced) {
        currentAmp = activeMode.amp;
        currentFreq = activeMode.freq;
      } else {
        currentAmp += (activeMode.amp - currentAmp) * 0.1;
        currentFreq += (activeMode.freq - currentFreq) * 0.1;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(17, 18, 20, 0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      ctx.strokeStyle = activeMode.alert ? "#b91c1c" : "#1d3557";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 3) {
        const y =
          height / 2 +
          Math.sin(x * currentFreq + phase) * currentAmp * 0.65 +
          Math.sin(x * currentFreq * 2.1 - phase * 1.4) * currentAmp * 0.25;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (!prefersReduced && isVisible) {
        phase += 0.06;
        rafId = window.requestAnimationFrame(drawFrame);
      }
    };

    if ("IntersectionObserver" in window) {
      const waveObserver = new IntersectionObserver((entries) => {
        isVisible = entries[0].isIntersecting;
        if (isVisible && !rafId && !prefersReduced) {
          rafId = window.requestAnimationFrame(drawFrame);
        } else if (!isVisible && rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = null;
        }
      });
      waveObserver.observe(canvas);
    }

    drawFrame();
  }

  // 3. Progressive Disclosure Architecture Expander
  document.querySelectorAll("[data-expander-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-expander-btn");
      const panel = document.getElementById(targetId);
      if (!panel) return;
      const isOpen = panel.getAttribute("data-open") === "true";
      const next = !isOpen;
      panel.setAttribute("data-open", String(next));
      btn.setAttribute("aria-expanded", String(next));
      const label = btn.querySelector("[data-expander-label]");
      if (label) {
        label.textContent = next ? "Hide architecture" : "Architecture";
      }
    });
  });

  // 4. Stack Category Filter with Fluid Sliding Indicator
  const filterTrack = document.getElementById("stack-filter-track");
  const filterIndicator = document.getElementById("stack-filter-indicator");
  const filterBtns = document.querySelectorAll("[data-stack-filter]");
  const stackItems = document.querySelectorAll("[data-stack-cat]");

  const moveIndicator = (targetBtn) => {
    if (!filterTrack || !filterIndicator || !targetBtn) return;
    const trackRect = filterTrack.getBoundingClientRect();
    const btnRect = targetBtn.getBoundingClientRect();
    const offsetX = btnRect.left - trackRect.left;
    filterIndicator.style.width = `${btnRect.width}px`;
    filterIndicator.style.transform = `translateX(${offsetX}px)`;
  };

  const activeFilterBtn = document.querySelector("[data-stack-filter][aria-pressed='true']");
  if (activeFilterBtn) {
    moveIndicator(activeFilterBtn);
  }
  window.addEventListener("resize", () => {
    const current = document.querySelector("[data-stack-filter][aria-pressed='true']");
    if (current) moveIndicator(current);
  });

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.getAttribute("data-stack-filter");
      moveIndicator(btn);

      filterBtns.forEach((b) => {
        const active = b === btn;
        b.setAttribute("aria-pressed", String(active));
        b.classList.toggle("text-[#f6f5f1]", active);
        b.classList.toggle("text-[#4a4d52]", !active);
        b.classList.toggle("hover:text-[#111214]", !active);
      });

      stackItems.forEach((item) => {
        const cat = item.getAttribute("data-stack-cat");
        const show = filter === "all" || cat === filter;
        if (show) {
          const wasHidden = item.classList.contains("hidden");
          item.classList.remove("hidden");
          if (wasHidden && !prefersReduced) {
            item.classList.add("entering");
            window.requestAnimationFrame(() => {
              item.classList.remove("entering");
            });
          }
        } else {
          item.classList.add("hidden");
        }
      });
    });
  });

  // 5. Stacked In-Place Copy Email Swap
  const copyBtn = document.getElementById("copy-email-btn");
  if (copyBtn) {
    let resetTimer = null;
    copyBtn.addEventListener("click", async () => {
      const email = "uEscobido@l-ala.studio";
      try {
        await navigator.clipboard.writeText(email);
        copyBtn.setAttribute("data-state", "done");
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          copyBtn.setAttribute("data-state", "idle");
        }, 1800);
      } catch {
        window.location.href = `mailto:${email}`;
      }
    });
  }
});
