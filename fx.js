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

  // 4) Esfera LED guiada por el scroll: texto a un lado, esfera al otro, contenido distinto en cada paso
  function scene() {
    const T = window.THREE, host = d.querySelector('main .hero');
    if (!T || !host) return;
    const S = [
      ['Tu provincia o tu ubicación', 'Elige provincia y combustible, o pulsa «Cerca de mí» y buscamos en 30 km a la redonda.', '52', 'provincias y ciudades autónomas'],
      ['Todos los precios, ordenados', 'De la más barata a la más cara, con la fecha de actualización de cada dato.', '3', 'combustibles: 95, 98 y diésel'],
      ['Cuánto ahorras por depósito', 'La diferencia entre la más barata y la más cara, calculada para tu repostaje.', '3,00 €', 'de ahorro en un ejemplo de 50 L'],
      ['Y llegas con un toque', 'Abre la gasolinera elegida directamente en tu aplicación de mapas.', '0 €', 'gratis y sin registro']
    ];
    const sec = d.createElement('section');
    sec.className = 'fx-show web-only'; sec.setAttribute('aria-label', 'Cómo funciona AhorraFuel');
    sec.innerHTML = '<div class="fx-st"><canvas class="fx-cv" aria-hidden="true"></canvas><div class="fx-tx"><div class="fx-bl">' +
      S.map((s) => '<div class="fx-b"><h2>' + s[0] + '</h2><p>' + s[1] + '</p><div class="fx-n"><b>' + s[2] + '</b><span>' + s[3] + '</span></div></div>').join('') +
      '</div><a class="btn p" href="#buscar">Buscar gasolineras</a><div class="fx-pg">' + S.map(() => '<i></i>').join('') + '</div></div></div>';
    host.after(sec);
    const cv = sec.querySelector('.fx-cv'), bl = [...sec.querySelectorAll('.fx-b')], pg = [...sec.querySelectorAll('.fx-pg i')];
    let r;
    try { r = new T.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch (e) { sec.remove(); return; }
    r.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    const sc = new T.Scene(), cam = new T.PerspectiveCamera(35, 1, 0.1, 50);

    // Pantalla LED: lienzo de 192x96 "píxeles" que la esfera muestra como puntos
    const W = 192, H = 96;
    const mk = () => {
      const k = d.createElement('canvas'); k.width = W; k.height = H;
      const t = new T.CanvasTexture(k); t.magFilter = t.minFilter = T.NearestFilter; t.generateMipmaps = false;
      return { k, x: k.getContext('2d'), t };
    };
    const A = mk(), B = mk(), im = new Image(); im.src = '/mascota.webp';
    const txt = (x, s, px, col, X, Y) => { x.font = 'bold ' + px + 'px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = col; x.fillText(s, X, Y); };
    const draw = [
      (x) => { // pin con surtidor
        x.fillStyle = '#72e62a'; x.beginPath(); x.moveTo(48, 76); x.bezierCurveTo(20, 52, 28, 20, 48, 20); x.bezierCurveTo(68, 20, 76, 52, 48, 76); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(48, 42, 12, 0, 7); x.fill();
        x.fillStyle = '#06210f'; x.fillRect(42, 35, 9, 14); x.fillRect(53, 38, 2, 10);
      },
      (x) => { txt(x, '1,529', 17, '#72e62a', 48, 26); txt(x, '1,559', 17, '#fbbf24', 48, 48); txt(x, '1,589', 17, '#f87171', 48, 70); },
      (x) => { txt(x, '-3,00 €', 20, '#fbbf24', 48, 40); txt(x, '50 L', 11, '#a9c0b6', 48, 60); },
      (x) => { if (im.complete && im.naturalWidth) x.drawImage(im, 15, 9, 66, 78); else txt(x, 'GO', 24, '#72e62a', 48, 48); }
    ];
    const paint = (c, i) => { c.x.fillStyle = '#000'; c.x.fillRect(0, 0, W, H); draw[i](c.x); c.t.needsUpdate = true; };

    const u = { a: { value: A.t }, b: { value: B.t }, k: { value: 0 }, t: { value: 0 }, g: { value: new T.Vector2(W, H) } };
    const mat = new T.ShaderMaterial({
      uniforms: u,
      vertexShader: 'varying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){vUv=uv;vN=normalMatrix*normal;vec4 m=modelViewMatrix*vec4(position,1.);vV=-m.xyz;gl_Position=projectionMatrix*m;}',
      fragmentShader: 'uniform sampler2D a,b;uniform float k,t;uniform vec2 g;varying vec2 vUv;varying vec3 vN;varying vec3 vV;' +
        'void main(){vec2 p=vUv*g,c=floor(p),f=fract(p)-.5;vec2 q=(c+.5)/g;' +
        'float h=fract(sin(dot(c,vec2(12.9898,78.233)))*43758.5453);' +
        'vec3 col=(h<k?texture2D(b,q):texture2D(a,q)).rgb;' +
        'float m=smoothstep(.5,.28,length(f));' +
        'float fr=pow(1.-max(dot(normalize(vN),normalize(vV)),0.),2.5);' +
        'float fl=.93+.07*sin(t*3.+c.x*.3+c.y*.2);' +
        'gl_FragColor=vec4(vec3(.02,.05,.04)+col*m*1.25*fl+vec3(.1,.9,.3)*fr*.55,1.);}'
    });
    const ball = new T.Mesh(new T.SphereGeometry(1.5, 96, 64), mat); sc.add(ball);
    const gt = d.createElement('canvas'); gt.width = gt.height = 128;
    const gx = gt.getContext('2d'), gr = gx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.4, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    gx.fillStyle = gr; gx.fillRect(0, 0, 128, 128);
    const halo = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(gt), color: 0x72e62a, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.4 }));
    halo.scale.setScalar(6.4); halo.position.z = -1.5; sc.add(halo);

    const rs = () => {
      const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
      cam.position.z = (1.5 * h / 2 / (0.44 * Math.min(w, h))) / Math.tan(17.5 * Math.PI / 180);
    };
    new ResizeObserver(rs).observe(cv); rs();

    // Estado, arrastre e interacción
    let cur = -1, k = 0, yaw = 0, dr = 0, down = false, lx = 0, py = 0, on = false, slow = 0, dead = false, last = performance.now();
    new IntersectionObserver((e) => { on = e[0].isIntersecting; }, { rootMargin: '100px' }).observe(sec);
    cv.addEventListener('pointerdown', (e) => { down = true; lx = e.clientX; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', (e) => { if (down) { dr += (e.clientX - lx) * 0.01; lx = e.clientX; } });
    ['pointerup', 'pointercancel'].forEach((n) => cv.addEventListener(n, () => { down = false; }));
    addEventListener('pointermove', (e) => { py = e.clientY / innerHeight - 0.5; }, { passive: true });
    im.onload = () => { if (cur === 3 && !k) paint(A, 3); };
    const stage = (i) => {
      if (k) { A.x.drawImage(B.k, 0, 0); A.t.needsUpdate = true; k = 0; }
      if (cur < 0) paint(A, i); else { paint(B, i); k = 0.001; }
      cur = i;
      bl.forEach((e, j) => e.classList.toggle('on', j === i)); pg.forEach((e, j) => e.classList.toggle('on', j <= i));
    };

    (function f(t) {
      if (dead) return;
      requestAnimationFrame(f);
      const dt = t - last; last = t;
      if (!on || d.hidden) return;
      if (dt > 40 && ++slow > 30) { dead = true; sec.remove(); r.dispose(); return; } // equipo lento: se desactiva solo
      const s = t / 1000, rc = sec.getBoundingClientRect();
      const q = Math.max(0, Math.min(1, -rc.top / (rc.height - innerHeight))) * S.length, i = Math.min(S.length - 1, Math.floor(q));
      if (i !== cur) stage(i);
      if (k) { k += dt / 650; if (k >= 1) { A.x.drawImage(B.k, 0, 0); A.t.needsUpdate = true; k = 0; } }
      if (!down) dr *= 0.96;
      yaw += ((q - i - 0.5) * 0.7 + Math.sin(s * 0.5) * 0.1 + dr - yaw) * 0.08;
      ball.rotation.y = yaw; ball.rotation.x = 0.1 + py * 0.25;
      u.k.value = k; u.t.value = s;
      r.render(sc, cam);
    })(last);
  }

  const cn = navigator.connection || {};
  const capable = (navigator.hardwareConcurrency || 4) >= 4 && !cn.saveData && !/2g/.test(cn.effectiveType || '');
  if (capable) {
    const load = () => {
      const s = d.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      s.onload = () => { try { scene(); } catch (e) { const k = d.querySelector('.fx-show'); if (k) k.remove(); } };
      d.head.appendChild(s);
    };
    'requestIdleCallback' in window ? requestIdleCallback(load, { timeout: 2500 }) : setTimeout(load, 1500);
  }

  root.classList.add('fx');
})();
