(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Lightweight starfield: no images, libraries, or network requests.
  const canvas = document.createElement('canvas');
  canvas.id = 'cosmic-stars';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  let width = 0, height = 0, stars = [], frame = 0;
  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth; height = window.innerHeight;
    canvas.width = Math.floor(width * ratio); canvas.height = Math.floor(height * ratio);
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (frame) window.cancelAnimationFrame(frame);
    const count = Math.min(150, Math.floor(width * height / 8500));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      radius: Math.random() * 1.35 + .25, phase: Math.random() * Math.PI * 2,
      speed: Math.random() * .018 + .004
    }));
    draw();
  };
  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    stars.forEach(star => {
      star.phase += reducedMotion ? 0 : star.speed;
      const alpha = .28 + (Math.sin(star.phase) + 1) * .28;
      ctx.beginPath(); ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(207,220,255,' + alpha + ')'; ctx.fill();
    });
    if (!reducedMotion) frame = window.requestAnimationFrame(draw);
  };
  document.querySelectorAll('body > section').forEach(section => { section.style.position = 'relative'; section.style.zIndex = '1'; });
  resize();
  window.addEventListener('resize', resize, { passive: true });
  if (reducedMotion) window.cancelAnimationFrame(frame);

  const hero = document.querySelector('.content-wrapper > .row:first-of-type');
  if (hero) {
    const intro = document.createElement('section');
    intro.className = 'cosmic-hero';
    intro.innerHTML = '<div><div class="cosmic-eyebrow">✦ Mission control · Spotify signal online</div><h1>Your sound universe</h1><p>Your listening habits, orbiting in one place. Explore your top tracks, artists and the soundtrack of right now.</p></div><div class="cosmic-hero-actions"><button class="cosmic-control" id="cosmic-mode-toggle" type="button" aria-pressed="false">✧ Nebula mode</button></div>';
    hero.parentNode.insertBefore(intro, hero);
    const search = document.createElement('div');
    search.className = 'cosmic-search-wrap';
    search.innerHTML = '<span class="cosmic-search-status" aria-live="polite">Filter your top tracks</span><input class="cosmic-search" id="cosmic-track-search" type="search" placeholder="⌕ Search tracks or artists…" aria-label="Search top tracks">';
    const trackCard = Array.from(document.querySelectorAll('.card')).find(card => card.querySelector('.table tbody'));
    if (trackCard) trackCard.querySelector('.card-body').insertBefore(search, trackCard.querySelector('.table-responsive'));
    document.getElementById('cosmic-mode-toggle').addEventListener('click', event => {
      const active = document.body.classList.toggle('cosmic-mode');
      event.currentTarget.setAttribute('aria-pressed', String(active));
      event.currentTarget.textContent = active ? '✦ Nebula mode on' : '✧ Nebula mode';
    });
    const input = document.getElementById('cosmic-track-search');
    input.addEventListener('input', () => {
      const query = input.value.trim().toLocaleLowerCase();
      const rows = Array.from(document.querySelectorAll('.trackRow'));
      let visible = 0;
      rows.forEach(row => {
        const match = row.textContent.toLocaleLowerCase().includes(query);
        row.hidden = !match;
        if (match) visible++;
      });
      document.querySelector('.cosmic-search-status').textContent =
        query ? visible + ' of ' + rows.length + ' tracks' : 'Filter your top tracks';
    });
    const tbody = document.querySelector('.table tbody');
    if (tbody) new MutationObserver(() => input.dispatchEvent(new Event('input'))).observe(tbody, { childList: true });
  }
  const revealTargets = document.querySelectorAll('.card, .cosmic-hero, .contact-section');
  if ('IntersectionObserver' in window && !reducedMotion) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    revealTargets.forEach((element, index) => {
      element.classList.add('cosmic-reveal');
      element.style.transitionDelay = Math.min(index % 5, 4) * 65 + 'ms';
      observer.observe(element);
    });
  }
})();
