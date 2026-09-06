document.addEventListener("DOMContentLoaded", () => {
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -20px 0px" });
  
  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

  // 2. Hardware Accelerated Scroll Parallax
  const orb1 = document.getElementById('orb1');
  const orb2 = document.getElementById('orb2');
  const orb3 = document.getElementById('orb3');
  
  let scrollY = window.scrollY;
  let ticking = false;

  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (orb1) orb1.style.transform = `translateY(${scrollY * 0.1}px)`;
        if (orb2) orb2.style.transform = `translateY(${scrollY * -0.05}px)`;
        if (orb3) orb3.style.transform = `translateY(${scrollY * 0.02}px)`;
        ticking = false;
      });
      ticking = true;
    }
  });

  
  document.addEventListener('mousedown', (e) => {
    
    const tagsToIgnore = ['P', 'H1', 'H2', 'H3', 'H4', 'SPAN', 'IMG', 'A'];
    if(tagsToIgnore.includes(e.target.tagName)) return;

    const ripple = document.createElement('div');
    ripple.className = 'click-ripple';
    ripple.style.left = `${e.clientX}px`;
    ripple.style.top = `${e.clientY}px`;
    document.body.appendChild(ripple);

    // Garbage collection
    setTimeout(() => {
      ripple.remove();
    }, 500);
  });
});