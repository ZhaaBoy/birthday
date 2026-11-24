/* =========================================================
   Birthday Surprise — app.js
   JavaScript murni, tanpa dependensi. Semua konten dibaca dari
   window.SITE (js/config.js).

   Isi file:
     1. Util
     2. Pengisi konten (teks, glyph, tombol, polaroid)
     3. FX        partikel canvas: bintang, kelopak, bokeh hati, semburan kado
     4. Music     musik latar dan widgetnya
     5. Clock     jam tepercaya dari server, lalu Countdown Scene 1
     6. Gift      Scene 2
     7. Letter    Scene 4 (typewriter)
     8. Memories  Scene 5 (galeri)
     9. Player    Scene 6 (video)
    10. Rotator   Scene 8 (judul berputar)
    11. Pengatur scene dan start
   ========================================================= */
(() => {
  'use strict';

  const SITE = window.SITE;
  if (!SITE) {
    console.warn('[birthday] js/config.js tidak termuat, halaman tidak bisa diisi.');
    return;
  }

  /* =======================================================
     1. Util
     ======================================================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const pad2 = (n) => String(n).padStart(2, '0');
  const text = (v) => (v == null ? '' : String(v));
  const list = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
  const pick = (path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), SITE);
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  const el = (tag, cls) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  };

  // Memecah teks per karakter yang terlihat, supaya emoji tidak terbelah saat diketik.
  const graphemes = (value) => {
    const str = text(value);
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
      return Array.from(seg.segment(str), (s) => s.segment);
    }
    return Array.from(str);
  };

  // Acak dengan benih tetap: kemiringan polaroid galeri sama di setiap kunjungan.
  const seeded = (a) => () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /* =======================================================
     2. Pengisi konten
     ======================================================= */
  const GLYPH = { star: '✦', arrow: '→', play: '▶︎', replay: '↺' };
  const PLACEHOLDER = {
    photo: 'assets/photos/placeholder.svg',
    poster: 'assets/video/poster-placeholder.svg'
  };

  const glyph = (name) => {
    const node = el('span', `glyph glyph--${name}`);
    node.textContent = GLYPH[name];
    node.setAttribute('aria-hidden', 'true');
    return node;
  };

  // Menulis teks dari config, ditambah glyph hiasan sesuai mode.
  function decorate(node, value, mode) {
    const t = text(value);
    node.textContent = '';
    switch (mode) {
      case 'wrap':   node.append(glyph('star'), ` ${t} `, glyph('star')); break;
      case 'arrow':  node.append(`${t} `, glyph('arrow')); break;
      case 'play':   node.append(`${t} `, glyph('play')); break;
      case 'star':   node.append(`${t} `, glyph('star')); break;
      case 'replay': node.append(glyph('replay'), ` ${t}`); break;
      default:       node.textContent = t;
    }
  }

  function setButton(btn, value, mode) {
    const label = el('span', 'btn__label');
    decorate(label, value, mode);
    btn.replaceChildren(el('span', 'btn__bg'), label);
  }

  // Gambar dengan cadangan: kalau file belum ada, pakai placeholder.
  function withFallback(img, src, fallback) {
    img.addEventListener('load', () => img.classList.add('is-loaded'));
    img.addEventListener('error', function onError() {
      img.removeEventListener('error', onError);
      img.src = fallback;
    });
    img.src = src || fallback;
  }

  function polaroid(src) {
    const figure = el('figure', 'polaroid');
    const photo = el('div', 'polaroid__photo');
    const img = new Image();
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    withFallback(img, src, PLACEHOLDER.photo);
    photo.appendChild(img);
    figure.appendChild(photo);
    return figure;
  }

  function fillContent() {
    // Judul tab browser: tabTitle di config, atau judul hero bila tidak diisi.
    const title = text(SITE.tabTitle).trim() || list(pick('hero.title')).join(' ');
    if (title) document.title = title;

    $$('[data-text]').forEach((node) => decorate(node, pick(node.dataset.text), node.dataset.glyph));
    $$('[data-btn]').forEach((btn) => setButton(btn, pick(btn.dataset.btn), btn.dataset.glyph));

    // Polaroid Hero: paling banyak enam, posisinya diatur CSS (.hp--1 sampai .hp--6)
    const heroWrap = $('#hero-polaroids');
    list(pick('hero.polaroids')).slice(0, 6).forEach((src, i) => {
      const slot = el('div', `hp hp--${i + 1}`);
      slot.style.setProperty('--k', i);
      slot.appendChild(polaroid(src));
      heroWrap.appendChild(slot);
    });

    // Baris miring di Penutup
    const lines = $('#finale-lines');
    list(pick('finale.lines')).forEach((line) => {
      const p = el('p');
      p.textContent = text(line);
      lines.appendChild(p);
    });

    $('#finale-title').setAttribute('aria-label', list(pick('finale.phrases')).join('. '));
    $('#gift').setAttribute('aria-label', text(pick('gift.hint')));
  }

  /* =======================================================
     3. FX: partikel di canvas
     - canvas belakang: kelopak jatuh (Scene 1), bokeh hati (Scene 3)
     - canvas depan:    bintang (mulai Scene 2), semburan kado
     ======================================================= */
  const FX = (() => {
    const back = $('#fx-back');
    const front = $('#fx-front');
    const bctx = back.getContext('2d');
    const fctx = front.getContext('2d');

    const rgb = (name) => `rgb(${cssVar(name)})`;
    const COLOR = {
      star: rgb('--white-rgb'),
      rose: rgb('--rose-rgb'),
      cream: rgb('--cream-rgb'),
      bright: rgb('--primary-bright-rgb')
    };

    const TAU = Math.PI * 2;
    const STAR_MAX = 170;
    const layers = {
      petals: { a: 0, t: 0 },
      hearts: { a: 0, t: 0 },
      stars: { a: 0, t: 0 }
    };
    const stars = [];
    const petals = [];
    const hearts = [];
    const burst = [];

    let W = 0;
    let H = 0;
    let dense = false;
    let starTarget = 80;
    let sprites = null;
    let raf = 0;
    let last = 0;
    let clock = 0;
    let backDirty = false;

    /* ----- bentuk dan sprite ----- */
    function heartPath(c, cx, cy, w, h) {
      const x = cx;
      const y = cy - h / 2;
      const top = h * 0.3;
      c.beginPath();
      c.moveTo(x, y + top);
      c.bezierCurveTo(x, y, x - w / 2, y, x - w / 2, y + top);
      c.bezierCurveTo(x - w / 2, y + (h + top) / 2, x, y + (h + top) / 2, x, y + h);
      c.bezierCurveTo(x, y + (h + top) / 2, x + w / 2, y + (h + top) / 2, x + w / 2, y + top);
      c.bezierCurveTo(x + w / 2, y, x, y, x, y + top);
      c.closePath();
    }

    // Kilau empat sudut
    function sparklePath(c, x, y, r) {
      c.beginPath();
      c.moveTo(x, y - r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.quadraticCurveTo(x, y, x, y + r);
      c.quadraticCurveTo(x, y, x - r, y);
      c.quadraticCurveTo(x, y, x, y - r);
      c.closePath();
    }

    function sprite(size, color, draw) {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      g.fillStyle = color;
      draw(g, size);
      return c;
    }

    function buildSprites() {
      const S = 48;
      const heart = (color) => sprite(S, color, (g) => {
        heartPath(g, S / 2, S / 2, S * 0.86, S * 0.8);
        g.fill();
      });
      const petal = (color) => sprite(S, color, (g) => {
        g.translate(S / 2, S / 2);
        g.beginPath();
        g.moveTo(0, -S * 0.46);
        g.bezierCurveTo(S * 0.4, -S * 0.16, S * 0.28, S * 0.34, 0, S * 0.46);
        g.bezierCurveTo(-S * 0.28, S * 0.34, -S * 0.4, -S * 0.16, 0, -S * 0.46);
        g.fill();
      });
      const sparkle = (color) => sprite(S, color, (g) => {
        sparklePath(g, S / 2, S / 2, S * 0.48);
        g.fill();
      });
      // Hati buram untuk bokeh: bentuk digambar di luar canvas, yang terlihat
      // hanya bayangannya. Cara ini jalan di semua browser tanpa ctx.filter.
      const bokeh = (color) => sprite(256, color, (g, B) => {
        const OFF = 2000;
        g.shadowColor = color;
        g.shadowBlur = 16;
        g.shadowOffsetX = OFF;
        heartPath(g, B / 2 - OFF, B / 2, B * 0.6, B * 0.56);
        g.fill();
      });

      sprites = {
        petals: [petal(COLOR.rose), petal(COLOR.bright), heart(COLOR.rose), heart(COLOR.bright)],
        hearts: [bokeh(COLOR.bright), bokeh(COLOR.rose)],
        burstHearts: [heart(COLOR.rose), heart(COLOR.cream), heart(COLOR.bright)],
        burstSparks: [sparkle(COLOR.cream), sparkle(COLOR.rose)]
      };
    }

    /* ----- partikel ----- */
    function newPetal(anywhere) {
      return {
        x: Math.random(),
        y: anywhere ? rand(-0.1, 1) * H : -30,
        size: rand(8, 19),
        vy: rand(16, 40),
        amp: rand(10, 34),
        freq: rand(0.3, 0.9),
        phase: rand(0, TAU),
        rot: rand(0, TAU),
        spin: rand(-0.7, 0.7),
        a: rand(0.25, 0.7),
        sprite: sprites.petals[Math.floor(Math.random() * sprites.petals.length)]
      };
    }

    function seed() {
      for (let i = 0; i < STAR_MAX; i++) {
        stars.push({
          x: Math.random(),
          y: Math.random(),
          r: rand(0.5, 1.5),
          spark: Math.random() < 0.2,
          speed: rand(0.6, 2.4),
          phase: rand(0, TAU),
          floor: rand(0.12, 0.45),
          vx: rand(-0.0022, 0.0022),
          vy: rand(-0.0016, 0.0016),
          on: 0
        });
      }
      for (let i = 0; i < 28; i++) petals.push(newPetal(true));

      const k = clamp(Math.min(W, H) / 768, 0.6, 1.5);
      for (let i = 0; i < 10; i++) {
        hearts.push({
          x: Math.random(),
          y: Math.random(),
          size: rand(220, 520) * k,
          vy: rand(5, 13),
          amp: rand(14, 36),
          freq: rand(0.08, 0.22),
          phase: rand(0, TAU),
          tilt: rand(-0.35, 0.35),
          a: rand(0.1, 0.2),
          sprite: sprites.hearts[i % 2]
        });
      }
    }

    /* ----- gambar ----- */
    function drawBack(dt) {
      bctx.clearRect(0, 0, W, H);

      if (layers.hearts.a > 0) {
        for (const h of hearts) {
          const margin = h.size / H;
          h.y -= (h.vy * dt) / H;
          if (h.y < -margin) {
            h.y = 1 + margin;
            h.x = Math.random();
          }
          const x = h.x * W + Math.sin(clock * h.freq + h.phase) * h.amp;
          bctx.save();
          bctx.globalAlpha = h.a * layers.hearts.a;
          bctx.translate(x, h.y * H);
          bctx.rotate(h.tilt);
          bctx.drawImage(h.sprite, -h.size / 2, -h.size / 2, h.size, h.size);
          bctx.restore();
        }
      }

      if (layers.petals.a > 0) {
        for (let i = 0; i < petals.length; i++) {
          let p = petals[i];
          p.y += p.vy * dt;
          p.rot += p.spin * dt;
          if (p.y > H + 30) p = petals[i] = newPetal(false);
          const x = p.x * W + Math.sin(clock * p.freq + p.phase) * p.amp;
          bctx.save();
          bctx.globalAlpha = p.a * layers.petals.a;
          bctx.translate(x, p.y);
          bctx.rotate(p.rot);
          bctx.drawImage(p.sprite, -p.size / 2, -p.size / 2, p.size, p.size);
          bctx.restore();
        }
      }
    }

    function drawStar(s, alpha, twinkle) {
      const x = s.x * W;
      const y = s.y * H;
      fctx.globalAlpha = alpha * (s.floor + (1 - s.floor) * twinkle);
      if (s.spark) {
        sparklePath(fctx, x, y, s.r * (2.4 + 2.2 * twinkle));
      } else {
        fctx.beginPath();
        fctx.arc(x, y, s.r, 0, TAU);
      }
      fctx.fill();
    }

    function drawStars(dt, alpha) {
      const ease = Math.min(1, dt * 2.2);
      fctx.fillStyle = COLOR.star;
      for (let i = 0; i < STAR_MAX; i++) {
        const s = stars[i];
        s.on += ((i < starTarget ? 1 : 0) - s.on) * ease;
        if (s.on < 0.02) continue;
        s.x = (s.x + s.vx * dt + 1) % 1;
        s.y = (s.y + s.vy * dt + 1) % 1;
        drawStar(s, alpha * s.on, 0.5 + 0.5 * Math.sin(clock * s.speed + s.phase));
      }
      fctx.globalAlpha = 1;
    }

    function drawBurst(dt) {
      for (let i = burst.length - 1; i >= 0; i--) {
        const p = burst[i];
        p.life += dt;
        if (p.life < 0) continue;            // belum waktunya keluar
        if (p.life >= p.ttl) {
          burst.splice(i, 1);
          continue;
        }
        const drag = Math.max(0, 1 - 1.1 * dt);
        p.vx *= drag;
        p.vy = p.vy * drag + p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;
        const k = p.life / p.ttl;
        const fade = k < 0.1 ? k / 0.1 : k > 0.6 ? (1 - k) / 0.4 : 1;
        const size = p.size * (0.6 + 0.4 * Math.min(1, k * 4));
        fctx.save();
        fctx.globalAlpha = fade * p.a;
        fctx.translate(p.x, p.y);
        fctx.rotate(p.rot);
        fctx.drawImage(p.sprite, -size / 2, -size / 2, size, size);
        fctx.restore();
      }
    }

    function frame(now) {
      raf = 0;
      // Stempel waktu frame pertama bisa lebih awal dari saat loop dimulai, jadi dt dijepit di 0.
      const dt = clamp((now - last) / 1000, 0, 0.05);
      last = now;
      clock += dt;

      let alive = burst.length > 0;
      for (const key in layers) {
        const L = layers[key];
        if (L.a !== L.t) {
          const step = dt / 0.9;
          L.a = L.t > L.a ? Math.min(L.t, L.a + step) : Math.max(L.t, L.a - step);
        }
        if (L.a > 0 || L.t > 0) alive = true;   // lapisan yang sedang menuju tampil juga dihitung hidup
      }

      if (layers.petals.a > 0 || layers.hearts.a > 0) {
        drawBack(dt);
        backDirty = true;
      } else if (backDirty) {
        bctx.clearRect(0, 0, W, H);
        backDirty = false;
      }

      fctx.clearRect(0, 0, W, H);
      if (layers.stars.a > 0) drawStars(dt, layers.stars.a);
      if (burst.length) drawBurst(dt);

      if (alive) raf = requestAnimationFrame(frame);
    }

    function run() {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    // Reduced motion: tanpa partikel bergerak, hanya langit bintang diam.
    function drawStatic() {
      bctx.clearRect(0, 0, W, H);
      fctx.clearRect(0, 0, W, H);
      if (layers.stars.t > 0) {
        fctx.fillStyle = COLOR.star;
        for (let i = 0; i < starTarget; i++) drawStar(stars[i], 1, 0.55);
        fctx.globalAlpha = 1;
      }
    }

    function updateStarTarget() {
      const base = W < 700 ? 50 : 80;
      starTarget = Math.min(STAR_MAX, Math.round(base * (dense ? 1.9 : 1)));
    }

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      const df = Math.min(dpr, 2);
      const db = Math.min(dpr, 1.5);      // latar buram tidak butuh resolusi penuh
      front.width = Math.round(W * df);
      front.height = Math.round(H * df);
      back.width = Math.round(W * db);
      back.height = Math.round(H * db);
      fctx.setTransform(df, 0, 0, df, 0, 0);
      bctx.setTransform(db, 0, 0, db, 0, 0);
      updateStarTarget();
      if (REDUCED && stars.length) drawStatic();
    }

    function init() {
      resize();
      buildSprites();
      seed();
      let pending = 0;
      window.addEventListener('resize', () => {
        cancelAnimationFrame(pending);
        pending = requestAnimationFrame(resize);
      });
    }

    // Menentukan lapisan mana yang hidup di scene ini; sisanya memudar.
    function set(names, options = {}) {
      for (const key in layers) layers[key].t = names.includes(key) ? 1 : 0;
      dense = !!options.dense;
      updateStarTarget();
      if (REDUCED) drawStatic();
      else run();
    }

    // Hati dan kilau menyembur ke atas dari titik (x, y).
    function burstAt(x, y) {
      if (REDUCED) return;
      for (let i = 0; i < 90; i++) {
        const isHeart = i % 5 < 3;
        const pool = isHeart ? sprites.burstHearts : sprites.burstSparks;
        const angle = -Math.PI / 2 + rand(-1.15, 1.15);
        const speed = rand(220, 760);
        burst.push({
          x: x + rand(-14, 14),
          y: y + rand(-6, 6),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: rand(420, 620),
          size: isHeart ? rand(10, 26) : rand(8, 20),
          rot: rand(-0.5, 0.5),
          spin: rand(-2.4, 2.4),
          a: rand(0.65, 1),
          life: -rand(0, 0.22),            // sebagian menyusul, supaya terasa menyembur
          ttl: rand(1.3, 2.5),
          sprite: pool[Math.floor(Math.random() * pool.length)]
        });
      }
      run();
    }

    return { init, set, burstAt };
  })();

  /* =======================================================
     4. Music: musik latar dan widget di kanan bawah
     ======================================================= */
  const Music = (() => {
    const audio = $('#bgm');
    const widget = $('#music');
    const label = $('.music__label', widget);
    const LABEL = { playing: '♪ playing', paused: '♪ paused' };
    const NORMAL = 1;
    const DUCKED = 0.15;

    let fadeRaf = 0;
    let ducked = false;
    let resumeAfterDuck = false;
    let canSetVolume = true;

    function setVolume(v) {
      try { audio.volume = clamp(v, 0, 1); } catch (_) { /* volume terkunci di perangkat ini */ }
    }

    function fadeTo(target, ms) {
      cancelAnimationFrame(fadeRaf);
      if (!canSetVolume) return;
      const from = audio.volume;
      const t0 = performance.now();
      const step = (now) => {
        const k = clamp((now - t0) / ms, 0, 1);
        setVolume(from + (target - from) * k);
        if (k < 1) fadeRaf = requestAnimationFrame(step);
      };
      fadeRaf = requestAnimationFrame(step);
    }

    // play() bisa ditolak (file belum ada, atau belum ada gesture). Itu bukan error fatal.
    function play() {
      const p = audio.play();
      if (p && p.catch) p.catch(() => {});
    }

    function sync() {
      const on = !audio.paused;
      widget.classList.toggle('is-playing', on);
      widget.setAttribute('aria-pressed', String(on));
      label.textContent = on ? LABEL.playing : LABEL.paused;
    }

    function init() {
      if (SITE.music) audio.src = SITE.music;

      // iOS mengunci volume lewat JS. Kalau begitu, ducking diganti jeda.
      setVolume(0.5);
      canSetVolume = audio.volume === 0.5;
      setVolume(NORMAL);

      ['play', 'playing', 'pause', 'ended', 'error'].forEach((type) => audio.addEventListener(type, sync));
      widget.addEventListener('click', toggle);
      sync();
    }

    // Dipanggil di dalam klik kado: browser hanya mengizinkan play() dari gesture.
    // Mulai dari volume 0, lalu dinaikkan saat Hero masuk.
    function prime() {
      if (canSetVolume) setVolume(0);
      play();
    }

    function fadeIn() {
      fadeTo(ducked ? DUCKED : NORMAL, 1800);
    }

    function toggle() {
      if (audio.paused) {
        cancelAnimationFrame(fadeRaf);
        setVolume(ducked ? DUCKED : NORMAL);
        resumeAfterDuck = false;
        play();
      } else {
        resumeAfterDuck = false;
        audio.pause();
      }
    }

    // Turun ke 15% selama video berjalan, kembali normal saat dijeda atau selesai.
    function duck(on) {
      if (ducked === on) return;
      ducked = on;
      if (canSetVolume) {
        if (!audio.paused) fadeTo(on ? DUCKED : NORMAL, 600);
      } else if (on && !audio.paused) {
        resumeAfterDuck = true;
        audio.pause();
      } else if (!on && resumeAfterDuck) {
        resumeAfterDuck = false;
        play();
      }
    }

    const show = (visible) => widget.classList.toggle('is-visible', visible);

    return { init, prime, fadeIn, duck, show };
  })();

  /* =======================================================
     5. Clock dan Countdown (Scene 1)
     ======================================================= */

  // Jam tepercaya untuk kunci countdown.
  // Jam perangkat bisa dimajukan dari pengaturan HP, jadi waktu "sekarang" diambil dari
  // server, lalu dilanjutkan dengan jam monoton browser (performance.now) yang tidak
  // ikut berubah ketika jam perangkat diganti. Dimatikan saat demoMode atau bila
  // onlineClock: false di config; dalam keadaan itu yang dipakai jam perangkat.
  const Clock = (() => {
    const online = SITE.onlineClock !== false && !SITE.demoMode;
    const TIMEOUT = 4000;        // batas tunggu satu sumber
    const RETRY = 5000;          // jeda antar percobaan selama belum berhasil
    const JUMP = 2000;           // selisih jam perangkat vs jam monoton yang dianggap lompatan
    const SANE = 1.7e12;         // jawaban di bawah ini (tahun 2023) pasti bukan waktu sekarang

    let base = 0;                // waktu server (ms epoch) pada titik jangkar
    let perfBase = 0;            // performance.now() pada titik jangkar
    let wallBase = 0;            // Date.now() pada titik jangkar
    let verified = false;
    let pending = null;
    let lastTry = -Infinity;

    const estimate = () => base + (performance.now() - perfBase);
    const now = () => (verified ? estimate() : Date.now());
    const trusted = () => !online || verified;

    async function ask(url, options, read) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
      try {
        const t0 = performance.now();
        const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal, ...options });
        const at = (t0 + performance.now()) / 2;       // titik tengah permintaan
        const time = await read(res);
        return Number.isFinite(time) && time > SANE ? { time, at } : null;
      } catch (err) {
        return null;
      } finally {
        clearTimeout(timer);
      }
    }

    // Server lokal (Live Server dan sejenisnya) memakai jam perangkat yang sama,
    // jadi tidak bisa dijadikan pembanding.
    const ownHost = /^https?:$/.test(location.protocol)
      && !/^(localhost$|127\.|\[::1\]$)/.test(location.hostname);

    const SOURCES = [
      // 1. Server tempat situs ini dihosting: header Date, ketelitian satu detik.
      () => (ownHost
        ? ask(`${location.pathname}?_=${Math.random().toString(36).slice(2)}`, { method: 'HEAD' },
          (res) => Date.parse(res.headers.get('date') || '') + 500)
        : null),
      // 2 dan 3. Layanan waktu publik, dipakai juga saat halaman dibuka dari file://.
      () => ask('https://www.cloudflare.com/cdn-cgi/trace', { referrerPolicy: 'no-referrer' }, async (res) => {
        const found = /^ts=(\d+(?:\.\d+)?)$/m.exec(await res.text());
        return found ? parseFloat(found[1]) * 1000 : NaN;
      }),
      () => ask('https://time.akamai.com/?ms', { referrerPolicy: 'no-referrer' },
        async (res) => parseFloat(await res.text()) * 1000)
    ];

    // Semua sumber ditanya bersamaan. Jawaban pertama langsung dipakai; jawaban
    // berikutnya hanya menggantikan bila jelas lebih maju, karena jawaban basi dari
    // cache selalu tertinggal dan tidak pernah lebih cepat dari waktu sebenarnya.
    function sync() {
      if (!online) return Promise.resolve(true);
      if (pending) return pending;
      lastTry = performance.now();

      let answered = false;
      let settle;
      pending = new Promise((resolve) => { settle = resolve; });

      const round = SOURCES.map((source) => Promise.resolve(source()).then((sample) => {
        if (!sample) return;
        const candidate = sample.time + (performance.now() - sample.at);
        if (!answered || candidate - estimate() > 1500) {
          base = sample.time;
          perfBase = sample.at;
          wallBase = Date.now() - (performance.now() - sample.at);
          verified = true;
        }
        answered = true;
        settle(true);
      }));

      const current = pending;
      Promise.all(round).then(() => {
        pending = null;
        settle(answered);
      });
      return current;
    }

    // Dipanggil tiap detak countdown: sinkron lagi selama belum berhasil, atau bila
    // jam perangkat melompat (diubah manual, atau perangkat baru bangun dari tidur).
    function poll() {
      if (!online || pending) return;
      const jumped = verified
        && Math.abs((Date.now() - wallBase) - (performance.now() - perfBase)) > JUMP;
      if ((!verified || jumped) && performance.now() - lastTry >= RETRY) sync();
    }

    const ready = (maxWait) => Promise.race([
      sync(),
      new Promise((resolve) => setTimeout(resolve, maxWait))
    ]);

    return { now, trusted, poll, ready };
  })();

  const Countdown = (() => {
    const cfg = SITE.countdown || {};
    const boxes = ['days', 'hours', 'minutes', 'seconds'].map((u) => $(`.clock__box[data-unit="${u}"]`));
    const statusEl = $('#cd-status');
    const button = $('#cd-button');
    const remainEl = $('#cd-remaining');

    let target = 0;
    let timer = 0;
    let state = null;            // 'waiting' | 'checking' | 'ready'

    // Ganti satu digit. Angka lama menggulung ke atas, angka baru masuk dari bawah.
    function setDigit(slot, ch, animate) {
      if (slot.dataset.v === ch) return;
      slot.dataset.v = ch;
      const old = slot.lastElementChild;
      const next = el('span');
      next.textContent = ch;
      if (animate && old && !REDUCED) {
        old.className = 'is-out';
        next.className = 'is-in';
        slot.appendChild(next);
        setTimeout(() => old.remove(), 440);
      } else {
        slot.replaceChildren(next);
      }
    }

    function setBox(box, value, animate) {
      const str = pad2(value);
      while (box.children.length < str.length) box.prepend(el('span', 'digit'));
      while (box.children.length > str.length) box.firstElementChild.remove();
      Array.from(box.children).forEach((slot, i) => setDigit(slot, str[i], animate));
    }

    function remainingText(d, h, m, s) {
      const parts = d > 0 ? [d, h, m, s] : h > 0 ? [h, m, s] : [m, s];
      let out = text(cfg.remaining);
      if (out.includes('{mm}:{ss}') && !/\{(dd|hh)\}/.test(out)) {
        out = out.replace('{mm}:{ss}', parts.map(pad2).join(':'));
      }
      return out.replace('{dd}', pad2(d)).replace('{hh}', pad2(h)).replace('{mm}', pad2(m)).replace('{ss}', pad2(s));
    }

    // waiting  : belum waktunya, tombol terkunci
    // checking : jam perangkat bilang sudah waktunya, tapi jam server belum terbaca
    // ready    : sudah waktunya, tombol aktif
    function setState(next, animate) {
      if (state === next) return;
      state = next;
      const isReady = next === 'ready';

      statusEl.textContent = text(isReady ? cfg.ready : next === 'checking' ? cfg.checking : cfg.waiting);
      remainEl.classList.toggle('is-hidden', next !== 'waiting');

      button.disabled = !isReady;
      button.classList.toggle('btn--locked', !isReady);
      button.classList.toggle('btn--active', isReady);
      if (isReady) {
        setButton(button, cfg.openButton, 'wrap');
        button.dataset.goto = 'gift';
      } else {
        setButton(button, cfg.locked);
        delete button.dataset.goto;
      }

      if (animate) {
        statusEl.classList.remove('is-swapped');
        void statusEl.offsetWidth;          // mulai ulang animasi
        statusEl.classList.add('is-swapped');
      }
    }

    function tick(animate) {
      Clock.poll();
      const ms = target - Clock.now();
      if (ms <= 0) {
        boxes.forEach((box) => setBox(box, 0, animate));
        // Tanpa konfirmasi jam server, kunci tidak dibuka.
        if (!Clock.trusted()) {
          setState('checking', animate);
          return;
        }
        setState('ready', animate);
        clearInterval(timer);
        timer = 0;
        return;
      }
      const total = Math.ceil(ms / 1000);
      const d = Math.floor(total / 86400);
      const h = Math.floor((total % 86400) / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      [d, h, m, s].forEach((value, i) => setBox(boxes[i], value, animate));
      remainEl.textContent = remainingText(d, h, m, s);
      setState('waiting', false);
    }

    function init() {
      if (SITE.demoMode) {
        target = Clock.now() + 10000;
      } else {
        // Offset zona (+07:00) ada di dalam string, jadi hasilnya sama di zona waktu mana pun.
        target = new Date(SITE.targetDate).getTime();
        if (Number.isNaN(target)) {
          console.warn(`[birthday] targetDate tidak valid: "${SITE.targetDate}". Countdown dianggap sudah selesai.`);
          target = Clock.now();
        }
      }
      tick(false);
      if (state !== 'ready') timer = setInterval(() => tick(true), 200);
    }

    // Hitung ulang tanpa animasi, dipakai tepat sebelum scene pertama tampil.
    const refresh = () => { if (state !== 'ready') tick(false); };

    return { init, refresh };
  })();

  /* =======================================================
     6. Gift (Scene 2)
     ======================================================= */
  const Gift = (() => {
    const button = $('#gift');
    const scene = button.closest('.scene');
    const veil = $('#veil');
    let opened = false;

    function open() {
      if (opened || current !== 'gift') return;
      opened = true;

      Music.prime();                         // harus di dalam klik
      button.classList.add('is-open');       // tutup terlempar, glow melebar
      scene.classList.add('is-opened');

      const body = $('.gift__body', button).getBoundingClientRect();
      setTimeout(() => FX.burstAt(body.left + body.width / 2, body.top + body.height * 0.12), 170);

      // Layar meredup jadi langit berbintang kira-kira satu detik, lalu Hero masuk.
      setTimeout(() => {
        veil.classList.add('is-on');
        go('hero', {
          gap: 1300,
          onShow() {
            veil.classList.remove('is-on');
            Music.fadeIn();
          }
        });
      }, 1150);
    }

    button.addEventListener('click', open);
    return {};
  })();

  /* =======================================================
     7. Letter (Scene 4): typewriter
     ======================================================= */
  const Letter = (() => {
    const cfg = SITE.letter || {};
    const card = $('#letter-card');
    const scroller = $('#letter-scroll');
    const greetEl = $('#letter-greeting');
    const bodyEl = $('#letter-body');
    const nextEl = $('#letter-next');

    const SPEED = 30;                        // ms per karakter
    const greeting = graphemes(cfg.greeting);
    const rest = list(cfg.paragraphs).concat(list(cfg.closing)).map(text).filter(Boolean).join('\n\n');
    const body = graphemes((greeting.length && rest ? '\n\n' : '') + rest);
    const total = greeting.length + body.length;

    let raf = 0;
    let startTimer = 0;
    let typed = 0;
    let acc = 0;
    let last = 0;
    let scrollPos = 0;
    let done = false;

    $('#letter-full').textContent = greeting.join('') + body.join('');

    function paint() {
      greetEl.textContent = greeting.slice(0, Math.min(typed, greeting.length)).join('');
      bodyEl.textContent = body.slice(0, Math.max(0, typed - greeting.length)).join('');
    }

    function stop() {
      cancelAnimationFrame(raf);
      clearTimeout(startTimer);
      raf = 0;
    }

    function finish() {
      stop();
      typed = total;
      paint();
      done = true;
      card.classList.add('is-done');         // kartu jadi bisa di-scroll untuk dibaca ulang
      nextEl.classList.add('is-shown');
    }

    function frame(now) {
      const dt = clamp(now - last, 0, 100);
      last = now;

      if (typed < total) {
        acc += dt;
        if (acc >= SPEED) {
          const n = Math.floor(acc / SPEED);
          acc -= n * SPEED;
          typed = Math.min(total, typed + n);
          paint();
        }
      }

      // Tinggi kartu tetap: isi bergulir ke atas mengikuti kursor.
      const max = scroller.scrollHeight - scroller.clientHeight;
      if (max > scrollPos) {
        const step = Math.max(0.4, (max - scrollPos) * (1 - Math.exp(-dt / 130)));
        scrollPos = Math.min(max, scrollPos + step);
        scroller.scrollTop = scrollPos;
      }

      if (typed >= total && max - scrollPos < 0.5) {
        finish();
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    function start() {
      stop();
      done = false;
      typed = 0;
      acc = 0;
      scrollPos = 0;
      paint();
      scroller.scrollTop = 0;
      card.classList.remove('is-done');
      nextEl.classList.remove('is-shown');

      if (REDUCED) {
        finish();
        return;
      }
      startTimer = setTimeout(() => {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }, 900);
    }

    // Tambahan di luar referensi: klik kartu saat masih mengetik menampilkan seluruh teks.
    card.addEventListener('click', () => {
      if (!done && current === 'letter') finish();
    });

    return { start, stop };
  })();

  /* =======================================================
     8. Memories (Scene 5): galeri polaroid
     ======================================================= */
  const Memories = (() => {
    const scene = $('.scene--memories');
    const gallery = $('#gallery');

    function build() {
      const rnd = seeded(20261231);
      list(pick('memories.photos')).forEach((src, i) => {
        let r = rnd() * 10 - 5;              // -5 sampai 5 derajat
        if (Math.abs(r) < 1) r = r < 0 ? r - 1.2 : r + 1.2;

        const tilt = el('div', 'g-item__tilt');
        tilt.style.setProperty('--r', `${r.toFixed(2)}deg`);
        tilt.style.setProperty('--dx', `${(rnd() * 10 - 5).toFixed(1)}px`);
        tilt.style.setProperty('--dy', `${(rnd() * 12 - 6).toFixed(1)}px`);
        tilt.appendChild(polaroid(src));

        const item = el('div', 'g-item');
        item.style.setProperty('--n', i);
        item.appendChild(tilt);
        gallery.appendChild(item);
      });
    }

    function enter() {
      scene.scrollTop = 0;
    }

    return { build, enter };
  })();

  /* =======================================================
     9. Player (Scene 6): video dengan kontrol kustom
     ======================================================= */
  const Player = (() => {
    const cfg = SITE.video || {};
    const root = $('#player');
    const frameEl = $('.player__frame', root);
    const video = $('#video');
    const poster = $('.player__poster', root);
    const big = $('.player__big', root);
    const toggleBtn = $('.player__toggle', root);
    const fsBtn = $('.player__fs', root);
    const timeEl = $('.player__time', root);
    const progress = $('.player__progress', root);
    const fill = $('.player__fill', root);

    let raf = 0;
    let dragging = false;

    const fmt = (t) => {
      const s = Number.isFinite(t) && t > 0 ? Math.floor(t) : 0;
      return `${Math.floor(s / 60)}:${pad2(s % 60)}`;
    };

    function paint() {
      const d = video.duration;
      const ratio = Number.isFinite(d) && d > 0 ? clamp(video.currentTime / d, 0, 1) : 0;
      fill.style.transform = `scaleX(${ratio})`;
      timeEl.textContent = `${fmt(video.currentTime)} / ${fmt(d)}`;
      progress.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    }

    function loop() {
      paint();
      raf = video.paused || video.ended ? 0 : requestAnimationFrame(loop);
    }

    function play() {
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
    }

    function toggle() {
      if (video.ended) {
        video.currentTime = 0;
        play();
      } else if (video.paused) {
        play();
      } else {
        video.pause();
      }
    }

    function seekTo(clientX) {
      const rect = progress.getBoundingClientRect();
      if (!rect.width || !Number.isFinite(video.duration)) return;
      video.currentTime = clamp((clientX - rect.left) / rect.width, 0, 1) * video.duration;
      paint();
    }

    function toggleFullscreen() {
      const active = document.fullscreenElement || document.webkitFullscreenElement;
      if (active) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) exit.call(document);
        return;
      }
      const request = root.requestFullscreen || root.webkitRequestFullscreen;
      if (request) {
        const p = request.call(root);
        if (p && p.catch) p.catch(() => {});
      } else if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();       // iPhone: hanya elemen video yang bisa layar penuh
      }
    }

    function init() {
      big.setAttribute('aria-label', 'Play');
      toggleBtn.setAttribute('aria-label', 'Play / Pause');
      fsBtn.setAttribute('aria-label', 'Fullscreen');
      progress.setAttribute('aria-label', 'Seek');
      $('.icon--replay', big).textContent = GLYPH.replay;

      withFallback(poster, cfg.poster, PLACEHOLDER.poster);
      if (cfg.src) video.src = cfg.src;
      paint();

      video.addEventListener('play', () => {
        root.classList.add('is-started', 'is-playing');
        root.classList.remove('is-ended');
        Music.duck(true);
        if (!raf) loop();
      });
      video.addEventListener('pause', () => {
        root.classList.remove('is-playing');
        Music.duck(false);
        paint();
      });
      video.addEventListener('ended', () => {
        root.classList.remove('is-playing');
        root.classList.add('is-ended');
        Music.duck(false);
        paint();
      });
      video.addEventListener('seeked', () => {
        root.classList.toggle('is-ended', video.ended);
        paint();
      });
      ['loadedmetadata', 'durationchange', 'timeupdate'].forEach((type) => video.addEventListener(type, paint));

      frameEl.addEventListener('click', (e) => {
        if (e.target.closest('.player__fs')) return;
        toggle();
      });
      toggleBtn.addEventListener('click', toggle);
      fsBtn.addEventListener('click', toggleFullscreen);

      progress.addEventListener('pointerdown', (e) => {
        dragging = true;
        if (progress.setPointerCapture) progress.setPointerCapture(e.pointerId);
        seekTo(e.clientX);
      });
      progress.addEventListener('pointermove', (e) => { if (dragging) seekTo(e.clientX); });
      ['pointerup', 'pointercancel'].forEach((type) => progress.addEventListener(type, () => { dragging = false; }));
      progress.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        if (!Number.isFinite(video.duration)) return;
        e.preventDefault();
        video.currentTime = clamp(video.currentTime + (e.key === 'ArrowRight' ? 5 : -5), 0, video.duration);
      });
    }

    // Setiap kali scene dibuka, pemutar kembali ke keadaan awal.
    function enter() {
      root.classList.remove('is-started', 'is-playing', 'is-ended');
      if (video.readyState > 0) video.currentTime = 0;
      paint();
    }

    function leave() {
      if (!video.paused) video.pause();
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
    }

    return { init, enter, leave };
  })();

  /* =======================================================
     10. Rotator (Scene 8): judul yang diketik, ditahan, dihapus, berulang
     ======================================================= */
  const Rotator = (() => {
    const out = $('#finale-text');
    const phrases = list(pick('finale.phrases')).map(graphemes).filter((p) => p.length);
    const TYPE = 85;
    const ERASE = 45;
    const HOLD = 1800;
    const GAP = 450;

    let timer = 0;
    let run = 0;

    function stop() {
      run++;
      clearTimeout(timer);
    }

    function start() {
      stop();
      if (!phrases.length) return;
      const mine = run;
      let index = 0;
      let count = 0;
      let typing = true;

      if (REDUCED) {                         // tanpa ketikan: frasa tampil langsung dan berganti utuh
        out.textContent = phrases[0].join('');
        const swap = () => {
          if (mine !== run) return;
          index = (index + 1) % phrases.length;
          out.textContent = phrases[index].join('');
          timer = setTimeout(swap, 3200);
        };
        if (phrases.length > 1) timer = setTimeout(swap, 3200);
        return;
      }

      out.textContent = '';
      const tick = () => {
        if (mine !== run) return;
        const phrase = phrases[index];
        if (typing) {
          count++;
          out.textContent = phrase.slice(0, count).join('');
          if (count >= phrase.length) {
            typing = false;
            timer = setTimeout(tick, HOLD);
          } else {
            timer = setTimeout(tick, TYPE);
          }
        } else {
          count--;
          out.textContent = phrase.slice(0, count).join('');
          if (count <= 0) {
            typing = true;
            index = (index + 1) % phrases.length;
            timer = setTimeout(tick, GAP);
          } else {
            timer = setTimeout(tick, ERASE);
          }
        }
      };
      timer = setTimeout(tick, 900);
    }

    return { start, stop };
  })();

  /* =======================================================
     11. Pengatur scene
     ======================================================= */
  const ORDER = ['countdown', 'gift', 'hero', 'letter', 'memories', 'video', 'wishes', 'finale'];
  const FADE_OUT = 600;                      // scene lama memudar
  const GAP = 380;                           // jeda sebelum scene baru mulai masuk (0.8 detik, di CSS)

  const sceneEl = {};
  const backdropEl = {};
  $$('.scene').forEach((node) => { sceneEl[node.dataset.scene] = node; });
  $$('.backdrop').forEach((node) => { backdropEl[node.dataset.backdrop] = node; });

  // Lapisan partikel per scene. Bintang aktif mulai Scene 2.
  const FX_LAYERS = {
    countdown: ['petals'],
    hero: ['stars', 'hearts']
  };
  const HOOKS = {
    letter: { enter: Letter.start, leave: Letter.stop },
    memories: { enter: Memories.enter },
    video: { enter: Player.enter, leave: Player.leave },
    finale: { enter: Rotator.start, leave: Rotator.stop }
  };

  let current = null;
  let navigating = false;

  function show(name) {
    const node = sceneEl[name];
    node.classList.remove('is-leaving');
    node.classList.add('is-active');
    node.setAttribute('aria-hidden', 'false');

    for (const key in backdropEl) backdropEl[key].classList.toggle('is-active', key === name);
    FX.set(FX_LAYERS[name] || ['stars'], { dense: name === 'wishes' });
    Music.show(ORDER.indexOf(name) >= ORDER.indexOf('hero'));   // widget tampil mulai Scene 3

    current = name;
    const hook = HOOKS[name];
    if (hook && hook.enter) hook.enter();
  }

  function go(name, options = {}) {
    if (navigating || name === current || !sceneEl[name]) return;
    navigating = true;

    const previous = current;
    const gap = previous ? (options.gap == null ? GAP : options.gap) : 0;

    if (previous) {
      const hook = HOOKS[previous];
      if (hook && hook.leave) hook.leave();
      const node = sceneEl[previous];
      node.classList.add('is-leaving');
      setTimeout(() => {
        node.classList.remove('is-active', 'is-leaving');
        node.setAttribute('aria-hidden', 'true');
      }, FADE_OUT + 20);
    }

    setTimeout(() => {
      show(name);
      if (options.onShow) options.onShow();
    }, gap);
    setTimeout(() => { navigating = false; }, Math.max(gap, FADE_OUT) + 60);
  }

  // Semua tombol navigasi memakai data-goto.
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-goto]');
    if (trigger && !trigger.disabled) go(trigger.dataset.goto);
  });

  // Judul yang memakai \n di config: tiap baris harus tampil utuh. Kalau layarnya
  // terlalu sempit, hurufnya dikecilkan seperlunya (paling kecil 55% dari ukuran asal,
  // di bawah itu teks dibiarkan terbungkus).
  function fitTitles() {
    $$('.title').forEach((title) => {
      if (!title.textContent.includes('\n')) return;
      title.style.fontSize = '';

      const parent = getComputedStyle(title.parentElement);
      const available = title.parentElement.clientWidth
        - parseFloat(parent.paddingLeft) - parseFloat(parent.paddingRight) - 6;

      title.style.width = 'max-content';     // lebar baris terpanjang tanpa terbungkus
      const needed = title.offsetWidth;
      title.style.width = '';

      if (available > 0 && needed > available) {
        const base = parseFloat(getComputedStyle(title).fontSize);
        const fitted = Math.floor((base * available / needed) * 10) / 10;
        title.style.fontSize = `${Math.max(base * 0.55, fitted)}px`;
      }
    });
  }

  /* ---------- Start ---------- */
  fillContent();
  Memories.build();
  FX.init();
  Music.init();
  Player.init();
  Countdown.init();

  function start() {
    // ?scene=nama membuka satu scene langsung, berguna saat mengedit konten.
    // Hanya aktif selama demoMode: true, supaya di situs yang sudah dibagikan
    // kunci countdown tidak bisa dilewati lewat alamat halaman.
    const wanted = SITE.demoMode ? new URLSearchParams(window.location.search).get('scene') : null;
    show(ORDER.includes(wanted) ? wanted : 'countdown');
  }

  // Tunggu font sebentar supaya judul tidak berganti bentuk saat pertama tampil.
  // Paling lama 1,8 detik: kalau Google Fonts lambat, mulai dengan font cadangan.
  function whenFontsReady(maxWait) {
    const link = $('#font-css');
    const cssLoaded = new Promise((resolve) => {
      if (!link || link.sheet) { resolve(); return; }
      link.addEventListener('load', resolve, { once: true });
      link.addEventListener('error', resolve, { once: true });
    });
    const faces = [
      'italic 700 1em "Playfair Display"',
      '800 1em "Playfair Display"',
      'italic 500 1em "Cormorant Garamond"',
      '700 1em "Josefin Sans"'
    ];
    const loaded = cssLoaded.then(() => (
      document.fonts && document.fonts.load ? Promise.all(faces.map((face) => document.fonts.load(face))) : null
    ));
    const timeout = new Promise((resolve) => setTimeout(resolve, maxWait));
    return Promise.race([loaded, timeout]).catch(() => {});
  }

  // Lebar judul bergantung pada font dan ukuran layar, jadi dihitung ulang saat keduanya berubah.
  let fitPending = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(fitPending);
    fitPending = requestAnimationFrame(fitTitles);
  });
  if (document.fonts && document.fonts.addEventListener) {
    document.fonts.addEventListener('loadingdone', fitTitles);
  }

  // Jam server ditunggu paling lama 2,5 detik supaya angka pertama yang tampil sudah benar.
  Promise.all([whenFontsReady(1800), Clock.ready(2500)]).then(() => {
    fitTitles();
    Countdown.refresh();
    start();
  });
})();
