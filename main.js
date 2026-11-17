document.addEventListener("DOMContentLoaded", () => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1. Scroll Reveal (compositor-only, unobserves after trigger)
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
        b.classList.toggle("bg-[#191d26]", isCurrent);
        b.classList.toggle("text-[#eef0f5]", isCurrent);
        b.classList.toggle("border-[#f59e0b]/50", isCurrent);
        b.classList.toggle("text-[#9aa1b2]", !isCurrent);
        b.classList.toggle("border-white/10", !isCurrent);
      });

      updateReadout(elIr, activeMode.ir);
      updateReadout(elFlood, activeMode.flood);
      updateReadout(elGas, activeMode.gas);
      updateReadout(elLatency, activeMode.latency);

      if (elStatus) {
        elStatus.textContent = activeMode.status;
        elStatus.className = activeMode.alert
          ? "font-mono text-xs text-[#fbbf24] transition-colors duration-150"
          : "font-mono text-xs text-[#9aa1b2] transition-colors duration-150";
      }
      if (elDot) {
        elDot.className = activeMode.alert
          ? "w-2 h-2 rounded-full bg-[#f59e0b] transition-colors duration-150"
          : "w-2 h-2 rounded-full bg-[#4cc38a] transition-colors duration-150";
      }
    });
  });

  // Smoothly interpolated oscilloscope trace (pauses when offscreen or reduced-motion)
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

      // Smoothly approach target amplitude and frequency
      if (prefersReduced) {
        currentAmp = activeMode.amp;
        currentFreq = activeMode.freq;
      } else {
        currentAmp += (activeMode.amp - currentAmp) * 0.1;
        currentFreq += (activeMode.freq - currentFreq) * 0.1;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(238, 240, 245, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      ctx.strokeStyle = activeMode.alert ? "#f59e0b" : "#4cc38a";
      ctx.lineWidth = 1.5;
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

  // 3. Progressive Disclosure Expanders (grid-rows recipe)
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

  // 4. Stack Category Filter
  const filterBtns = document.querySelectorAll("[data-stack-filter]");
  const stackItems = document.querySelectorAll("[data-stack-cat]");

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.getAttribute("data-stack-filter");
      filterBtns.forEach((b) => {
        const active = b === btn;
        b.setAttribute("aria-pressed", String(active));
        b.classList.toggle("bg-[#191d26]", active);
        b.classList.toggle("text-[#eef0f5]", active);
        b.classList.toggle("border-[#f59e0b]/50", active);
        b.classList.toggle("text-[#9aa1b2]", !active);
        b.classList.toggle("border-white/10", !active);
      });

      stackItems.forEach((item) => {
        const cat = item.getAttribute("data-stack-cat");
        const show = filter === "all" || cat === filter;
        item.classList.toggle("hidden", !show);
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
