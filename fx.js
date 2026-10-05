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

  // 4) Escena 3D a pantalla completa guiada por el scroll: pin + monedas + partículas de neón
  function scene() {
    if (!window.THREE) return;
    const T = THREE, c = d.createElement('canvas');
    c.className = 'fx3d'; c.setAttribute('aria-hidden', 'true'); d.body.prepend(c);
    let r;
    try { r = new T.WebGLRenderer({ canvas: c, alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch (e) { c.remove(); return; }
    r.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    const sc = new T.Scene(), cam = new T.PerspectiveCamera(45, 1, 0.1, 100);
    cam.position.z = 8;
    sc.add(new T.HemisphereLight(0xffffff, 0x0a3a1c, 0.9));
    const L = new T.DirectionalLight(0xffffff, 1.2); L.position.set(3, 4, 5); sc.add(L);
    const L2 = new T.PointLight(0x72e62a, 2, 20); L2.position.set(-4, -2, 3); sc.add(L2);
    const tex = (fn) => { const k = d.createElement('canvas'); k.width = k.height = 128; fn(k.getContext('2d')); return new T.CanvasTexture(k); };
    const glow = tex((x) => {
      const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    });
    const coin = (bg, fg, ring) => tex((x) => {
      x.fillStyle = bg; x.fillRect(0, 0, 128, 128);
      if (ring) { x.strokeStyle = ring; x.lineWidth = 8; x.beginPath(); x.arc(64, 64, 56, 0, 7); x.stroke(); }
      x.fillStyle = fg; x.font = 'bold 84px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('€', 64, 70);
    });

    // Partículas de neón
    const N = 700, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), cA = new T.Color(0x72e62a), cB = new T.Color(0xfbbf24);
    for (let i = 0; i < N; i++) {
      pos.set([(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 40, -6 + Math.random() * 10], i * 3);
      const k = Math.random() < 0.8 ? cA : cB; col.set([k.r, k.g, k.b], i * 3);
    }
    const pg = new T.BufferGeometry();
    pg.setAttribute('position', new T.BufferAttribute(pos, 3)); pg.setAttribute('color', new T.BufferAttribute(col, 3));
    const pts = new T.Points(pg, new T.PointsMaterial({ size: 0.22, map: glow, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.85 }));
    sc.add(pts);

    // Pin con euro
    const prof = [];
    for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI; prof.push(new T.Vector2(Math.sin(a) * Math.sin(a / 2), -Math.cos(a))); }
    const rig = new T.Group(), pin = new T.Group();
    pin.add(new T.Mesh(new T.LatheGeometry(prof, 40), new T.MeshPhysicalMaterial({ color: 0x72e62a, roughness: 0.3, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.15, side: T.DoubleSide })));
    const disc = new T.Mesh(new T.CircleGeometry(0.4, 32), new T.MeshBasicMaterial({ map: coin('#fff', '#06210f') }));
    disc.position.set(0, 0.42, 0.8); pin.add(disc);
    const halo = new T.Sprite(new T.SpriteMaterial({ map: glow, color: 0x72e62a, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.7 }));
    halo.scale.setScalar(4.4); halo.position.z = -0.8; pin.add(halo);
    rig.add(pin);

    // Anillos de neón y monedas en órbita
    const rings = [[1.7, 0x72e62a, 1.15], [2.2, 0xfbbf24, 1.45]].map(([R, co, tx]) => {
      const m = new T.Mesh(new T.TorusGeometry(R, 0.022, 12, 110), new T.MeshBasicMaterial({ color: co, transparent: true, opacity: 0.9 }));
      m.rotation.x = tx; rig.add(m); return m;
    });
    const gold = new T.MeshStandardMaterial({ color: 0xd99a12, metalness: 0.8, roughness: 0.3 });
    const face = new T.MeshStandardMaterial({ map: coin('#fbbf24', '#5a3a00', '#b7791f'), metalness: 0.6, roughness: 0.35 });
    const cg = new T.CylinderGeometry(0.34, 0.34, 0.07, 32), coins = [];
    for (let i = 0; i < 7; i++) {
      const g = new T.Group(), m = new T.Mesh(cg, [gold, face, face]);
      m.rotation.x = Math.PI / 2; g.add(m); g.userData = { a: i / 7 * Math.PI * 2, R: 1.9 + (i % 2) * 0.5 };
      coins.push(g); rig.add(g);
    }
    sc.add(rig);

    // Tamaño
    let W = 0, H = 0;
    const rs = () => {
      const w = c.clientWidth, h = c.clientHeight; if (!w || !h) return;
      if (w === W && Math.abs(h - H) < 150) return; // barras del móvil: no reajustar
      W = w; H = h; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    };
    new ResizeObserver(rs).observe(c); rs();

    // Interacción: tocar o hacer clic = giro completo + destello
    let px = 0, py = 0, turn = 0, turnCur = 0, pulse = 0, vel = 0, lastY = scrollY, slow = 0, dead = false, last = performance.now();
    addEventListener('pointermove', (e) => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; }, { passive: true });
    addEventListener('pointerdown', () => { turn += Math.PI * 2; pulse = 1; }, { passive: true });
    const hh = Math.tan(22.5 * Math.PI / 180) * 8, sm = (v) => Math.min(1, v);

    (function f(t) {
      if (dead) return;
      requestAnimationFrame(f);
      const dt = t - last; last = t;
      if (d.hidden) return;
      if (dt > 40 && ++slow > 30) { dead = true; c.remove(); r.dispose(); return; } // equipo lento: se apaga solo
      const s = t / 1000, hw = hh * cam.aspect;
      const h = d.documentElement.scrollHeight - innerHeight, p = h > 0 ? scrollY / h : 0;
      vel += ((scrollY - lastY) - vel) * 0.15; lastY = scrollY;
      turnCur += (turn - turnCur) * 0.08; pulse *= 0.93;

      cam.position.set(px * 0.6, -p * 14, 8); cam.lookAt(0, cam.position.y, 0);
      pts.position.y = s * 0.15; pts.rotation.y = s * 0.02;

      const tx = hw * 0.58 * Math.cos(p * Math.PI * 3), ty = cam.position.y + hh * (0.3 - 0.9 * sm(p * 6));
      rig.position.x += (tx - rig.position.x) * 0.06; rig.position.y += (ty - rig.position.y) * 0.06;
      const sc1 = Math.min(hh, hw * 1.2) * (0.5 - 0.25 * sm(p * 4)) * (1 + pulse * 0.12);
      rig.scale.setScalar(sc1);
      pin.rotation.y = Math.sin(s * 0.7) * 0.45 + px * 0.7 + p * Math.PI * 6 + turnCur;
      pin.rotation.x = py * 0.4;
      halo.material.opacity = 0.6 + pulse * 0.4;

      const sp = 0.6 + Math.min(Math.abs(vel) * 0.03, 3);
      rings[0].rotation.z = s * 0.5; rings[1].rotation.z = -s * 0.35;
      coins.forEach((g) => {
        const u = g.userData; u.a += 0.012 * sp;
        g.position.set(Math.cos(u.a) * u.R, Math.sin(u.a) * u.R * 0.35, Math.sin(u.a) * u.R * 0.9);
        g.rotation.y = s * 2 + u.a;
      });
      c.style.opacity = 1 - 0.45 * sm(p * 8); // detrás del contenido: más suave al bajar
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
