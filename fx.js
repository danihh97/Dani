/* AhorraFuel · capa visual: pin 3D, mascota inclinable, contadores, tarjetas interactivas.
   No toca app.js. Si algo falla o el equipo es lento, la web queda como estaba. */
(() => {
  const d = document, root = d.documentElement;
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const $ = (s) => [...d.querySelectorAll(s)];
  const once = (els, fn, t) => {
    const o = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { o.unobserve(e.target); fn(e.target); }
    }), { threshold: t || 0.2 });
    els.forEach((e) => o.observe(e));
  };

  // 1) Contadores de la franja de cifras
  once($('.stats b'), (el) => {
    const m = el.textContent.match(/^(\d+)(.*)$/);
    if (!m || !+m[1]) return;
    const n = +m[1], s = m[2], t0 = performance.now();
    (function f(t) {
      const k = Math.min(1, (t - t0) / 900);
      el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))) + s;
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  }, 0.6);

  // 2) Tarjetas: entrada escalonada + inclinación 3D con brillo (solo ratón)
  $('.grid').forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty('--i', i)));
  once($('.grid>.card'), (c) => c.classList.add('in'), 0.15);
  if (matchMedia('(pointer:fine)').matches) {
    $('.grid>.card').forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        c.style.setProperty('--ry', x * 8 + 'deg'); c.style.setProperty('--rx', -y * 8 + 'deg');
        c.style.setProperty('--gx', (x + 0.5) * 100 + '%'); c.style.setProperty('--gy', (y + 0.5) * 100 + '%');
      });
      c.addEventListener('pointerleave', () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
    });
  }

  // 3) Mascota: se inclina hacia el puntero o el giro del móvil; al tocarla cambia el consejo del globo
  const mas = d.querySelector('.af-mascot .mas'), bub = d.getElementById('afMascotBubble');
  if (mas) {
    const tilt = (x, y) => { mas.style.setProperty('--ry', x * 14 + 'deg'); mas.style.setProperty('--rx', -y * 10 + 'deg'); };
    addEventListener('pointermove', (e) => tilt(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5), { passive: true });
    addEventListener('deviceorientation', (e) => {
      if (e.gamma == null) return;
      tilt(Math.max(-1, Math.min(1, e.gamma / 45)) / 2, Math.max(-1, Math.min(1, (e.beta - 45) / 45)) / 2);
    }, { passive: true });
    const tips = [
      '⛽ Elige <strong>provincia</strong> y combustible y te enseño la más barata.',
      '📍 Pulsa <strong>Cerca de mí</strong> y busco en 30 km a la redonda.',
      '💚 Entre la más barata y la más cara hay <strong>ahorro</strong> en cada depósito.'
    ];
    let i = 0;
    const next = () => { if (bub && !root.classList.contains('af-has-results')) bub.innerHTML = tips[i++ % tips.length]; };
    mas.setAttribute('role', 'button'); mas.tabIndex = 0;
    mas.addEventListener('click', next);
    mas.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } });
  }

  // 4) Pin 3D con lluvia de gotas (Three.js, solo en equipos capaces y cuando hay tiempo libre)
  function scene() {
    const host = d.querySelector('.hero .art');
    if (!host || !window.THREE) return;
    const T = THREE, c = d.createElement('canvas');
    c.className = 'fx3d'; c.setAttribute('aria-hidden', 'true'); host.prepend(c);
    let r;
    try { r = new T.WebGLRenderer({ canvas: c, alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch (e) { c.remove(); return; }
    r.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    const sc = new T.Scene(), cam = new T.PerspectiveCamera(40, 1, 0.1, 50);
    cam.position.z = 7;
    sc.add(new T.HemisphereLight(0xffffff, 0x0a3a1c, 0.9));
    const L = new T.DirectionalLight(0xffffff, 1.1); L.position.set(3, 4, 5); sc.add(L);

    const pts = [];
    for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI; pts.push(new T.Vector2(Math.sin(a) * Math.sin(a / 2), -Math.cos(a))); }
    const g = new T.LatheGeometry(pts, 40);
    const mat = (col, rough) => new T.MeshPhysicalMaterial({ color: col, roughness: rough, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.15, side: T.DoubleSide });

    const pin = new T.Group();
    pin.add(new T.Mesh(g, mat(0x72e62a, 0.3)));
    const cv = d.createElement('canvas'); cv.width = cv.height = 128;
    const x = cv.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 128);
    x.fillStyle = '#06210f'; x.font = 'bold 88px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('€', 64, 70);
    const disc = new T.Mesh(new T.CircleGeometry(0.4, 32), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv) }));
    disc.position.set(0, 0.42, 0.8); pin.add(disc); sc.add(pin);

    const dm = [mat(0xfbbf24, 0.2), mat(0x72e62a, 0.25)], ds = [];
    for (let i = 0; i < 12; i++) {
      const k = new T.Mesh(g, dm[i % 2]);
      k.scale.setScalar(0.12 + Math.random() * 0.1); k.rotation.z = Math.PI;
      k.userData = { x: Math.random(), z: -2 + Math.random() * 3, s: 0.25 + Math.random() * 0.4, p: Math.random() };
      ds.push(k); sc.add(k);
    }

    let hw = 1, hh = 1;
    const rs = () => {
      const W = c.clientWidth, H = c.clientHeight; if (!W || !H) return;
      r.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix();
      hh = Math.tan(20 * Math.PI / 180) * 7; hw = hh * cam.aspect;
      pin.scale.setScalar(Math.min(hh, hw) * 0.45);
    };
    new ResizeObserver(rs).observe(c); rs();

    let on = true, dead = false, px = 0, py = 0, slow = 0, last = performance.now();
    new IntersectionObserver((e) => { on = e[0].isIntersecting; }).observe(host);
    addEventListener('pointermove', (e) => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; }, { passive: true });
    const stop = () => { dead = true; c.remove(); r.dispose(); };
    (function f(t) {
      if (dead) return;
      requestAnimationFrame(f);
      const dt = t - last; last = t;
      if (!on || d.hidden) return;
      if (dt > 40 && ++slow > 30) { stop(); return; } // equipo lento: se desactiva solo
      const s = t / 1000;
      pin.rotation.y += (Math.sin(s * 0.8) * 0.5 + px * 0.8 - pin.rotation.y) * 0.06;
      pin.rotation.x += (py * 0.4 - pin.rotation.x) * 0.06;
      pin.position.set(hw * 0.55, hh * 0.5 + Math.sin(s * 1.2) * 0.12, 0);
      ds.forEach((k) => {
        const u = k.userData, y = (u.p + s * u.s * 0.12) % 1;
        k.position.set((u.x - 0.5) * 2 * hw, hh - y * 2 * hh, u.z); k.rotation.y = s;
      });
      r.render(sc, cam);
    })(last);
  }

  const cn = navigator.connection || {};
  const capable = (navigator.hardwareConcurrency || 4) >= 4 && !cn.saveData && !/2g/.test(cn.effectiveType || '');
  if (capable) {
    const load = () => {
      const s = d.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      s.onload = () => { try { scene(); } catch (e) { const k = d.querySelector('.fx3d'); if (k) k.remove(); } };
      d.head.appendChild(s);
    };
    'requestIdleCallback' in window ? requestIdleCallback(load, { timeout: 2500 }) : setTimeout(load, 1500);
  }

  root.classList.add('fx');
})();
