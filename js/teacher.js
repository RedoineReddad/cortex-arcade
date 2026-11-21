// Professor Gloop: the drill book's teacher. A goofy, sloth-ish alien in a lab coat who follows the
// pointer, points with his stick and hands out tips. Pure SVG, no assets.
//
//   const prof = createTeacher();            // the floating one (attached to <body>)
//   prof.say('Nice!', { point: element });   // speech bubble, stick aimed at an element
//   const mini = createTeacher({ fixed: false }); // an inline copy (used inside the tutorial dialog)

const SVG = `
<svg viewBox="0 0 120 170" aria-hidden="true" focusable="false">
  <ellipse class="t-shadow" cx="60" cy="164" rx="30" ry="5"/>
  <g class="t-body">
    <g class="t-legs">
      <path class="t-skin" d="M47 140 L45 156 M73 140 L75 156" stroke-width="9" stroke-linecap="round" fill="none"/>
      <path class="t-line" d="M47 140 L45 156 M73 140 L75 156" stroke-width="12" stroke-linecap="round" fill="none" opacity="0"/>
      <ellipse class="t-foot" cx="43" cy="158" rx="11" ry="5.5"/>
      <ellipse class="t-foot" cx="77" cy="158" rx="11" ry="5.5"/>
    </g>
    <path class="t-arm-back t-coat" d="M40 98 Q28 110 33 126 L40 124 Q37 112 46 104 Z"/>
    <circle class="t-skin t-stroke" cx="35" cy="127" r="5"/>
    <path class="t-coat" d="M40 90 Q30 118 34 146 L86 146 Q90 118 80 90 Q60 82 40 90 Z"/>
    <path class="t-line" d="M60 104 L60 146 M50 89 L60 106 L70 89" fill="none"/>
    <rect class="t-shirt" x="55" y="90" width="10" height="12" rx="2"/>
    <path class="t-tie" d="M51 91 L60 95.5 L51 100 Z M69 91 L60 95.5 L69 100 Z"/>
    <circle class="t-tie" cx="60" cy="95.5" r="2.2"/>
    <rect class="t-pocket" x="66" y="114" width="12" height="10" rx="1.5"/>
    <path d="M69.5 108 V115" stroke="#cc1f2a" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M74 107 V115" stroke="#1e4bd7" stroke-width="2.4" stroke-linecap="round"/>
    <path class="t-skin t-stroke" d="M54 92 Q51 78 55 66 L65 66 Q69 78 66 92 Z"/>
    <g class="t-head">
      <g class="t-antennae">
        <path class="t-line" d="M49 32 Q44 18 37 11" fill="none"/>
        <path class="t-line" d="M71 32 Q77 18 85 10" fill="none"/>
        <circle class="t-bobble" cx="36" cy="10" r="4.2"/>
        <circle class="t-bobble" cx="86" cy="9" r="4.2"/>
      </g>
      <ellipse class="t-skin t-stroke" cx="60" cy="49" rx="35" ry="23"/>
      <path class="t-line" d="M55 27 q1 -7 5 -3 q2 -6 5 1" fill="none"/>
      <ellipse class="t-snout" cx="60" cy="60" rx="15" ry="9.5"/>
      <circle class="t-ink" cx="55.5" cy="57.5" r="1.4"/><circle class="t-ink" cx="64.5" cy="57.5" r="1.4"/>
      <g class="t-eye" data-cx="37" data-cy="43">
        <circle class="t-white" cx="37" cy="43" r="12.5"/>
        <circle class="t-pupil" cx="37" cy="43" r="5"/>
        <rect class="t-lid t-skin" x="23" y="29" width="28" height="0"/>
      </g>
      <g class="t-eye" data-cx="83" data-cy="43">
        <circle class="t-white" cx="83" cy="43" r="12.5"/>
        <circle class="t-pupil" cx="83" cy="43" r="5"/>
        <rect class="t-lid t-skin" x="69" y="29" width="28" height="0"/>
      </g>
      <circle class="t-glass" cx="37" cy="43" r="15"/>
      <circle class="t-glass" cx="83" cy="43" r="15"/>
      <path class="t-glass" d="M52 41 Q60 36 68 41"/>
      <g class="t-mouth">
        <path class="t-mouth-shut t-line" d="M47 65 Q60 73 73 65" fill="none"/>
        <path class="t-mouth-open" d="M48 65 Q60 80 72 65 Q60 69 48 65 Z"/>
      </g>
      <path class="t-teeth" d="M55.5 66.5 h4.2 v6 h-4.2 Z M60.3 66.5 h4.2 v6 h-4.2 Z"/>
    </g>
    <g class="t-arm" transform="translate(80 98) rotate(-20)">
      <path class="t-coat" d="M-2 -6 L24 -5 L25 5 L-2 7 Z"/>
      <path class="t-stick" d="M27 0 L74 0"/>
      <circle class="t-stick-tip" cx="75" cy="0" r="2.6"/>
      <circle class="t-skin t-stroke" cx="27" cy="0" r="5.2"/>
    </g>
  </g>
</svg>`;

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createTeacher({ fixed = true } = {}) {
  const root = document.createElement('div');
  root.className = 'teacher' + (fixed ? ' teacher-fixed' : ' teacher-inline');
  root.innerHTML = SVG;
  const bubble = document.createElement('div');
  bubble.className = 'teacher-bubble';
  bubble.setAttribute('role', 'status');
  bubble.setAttribute('aria-live', 'polite');
  bubble.hidden = true;
  root.append(bubble);
  const svg = root.querySelector('svg');
  const arm = root.querySelector('.t-arm');
  const eyes = [...root.querySelectorAll('.t-eye')];
  const lids = [...root.querySelectorAll('.t-lid')];

  let pointer = { x: innerWidth / 2, y: innerHeight / 2 };
  let pointAt = null; // element or {x,y}
  let pos = { x: innerWidth * 0.8, y: innerHeight * 0.85 }; // feet centre (fixed mode)
  let facing = 1;
  let size = { w: 80, h: 113 };
  let talkTimer = 0, hideTimer = 0, raf = 0, last = performance.now(), walk = 0;

  function measure() {
    // Never larger than 1/6 of the screen in either direction.
    const maxH = Math.min(innerHeight / 6, (innerWidth / 6) * (170 / 120), 170);
    size = { h: maxH, w: (maxH * 120) / 170 };
    if (fixed) { root.style.width = size.w + 'px'; root.style.height = size.h + 'px'; }
  }

  function target() {
    if (pointAt instanceof Element) {
      const r = pointAt.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return pointAt || pointer;
  }

  function aim() {
    const t = target();
    const r = svg.getBoundingClientRect();
    const sc = r.width / 120;
    // face the thing we look at
    const cx = r.left + r.width / 2;
    if (Math.abs(t.x - cx) > 12) facing = t.x >= cx ? 1 : -1;
    root.style.setProperty('--face', facing);
    // eyes (in svg units; mirror x when facing left)
    for (const e of eyes) {
      const ex = +e.dataset.cx, ey = +e.dataset.cy;
      const sx = facing === 1 ? r.left + ex * sc : r.right - ex * sc;
      const sy = r.top + ey * sc;
      let dx = t.x - sx, dy = t.y - sy;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(5.5, d / 12) / d;
      e.querySelector('.t-pupil').setAttribute('transform', `translate(${dx * k * facing} ${dy * k})`);
    }
    // stick arm from the shoulder (80, 98)
    const shx = facing === 1 ? r.left + 80 * sc : r.right - 80 * sc;
    const shy = r.top + 98 * sc;
    let ang = (Math.atan2(t.y - shy, (t.x - shx) * facing) * 180) / Math.PI;
    ang = Math.max(-75, Math.min(70, ang));
    arm.setAttribute('transform', `translate(80 98) rotate(${ang.toFixed(1)})`);
  }

  function place(dt) {
    const inGame = !!document.querySelector('.stage');
    root.classList.toggle('peek', inGame);
    let tx, ty;
    if (inGame) {
      // During play he ducks into the bottom-right corner so he never covers the game.
      tx = innerWidth - size.w * 0.55; ty = innerHeight + size.h * 0.42;
    } else {
      const side = pointer.x > innerWidth - size.w * 1.6 ? -1 : 1;
      tx = pointer.x + side * (size.w * 0.9 + 24);
      ty = pointer.y + size.h * 0.55;
      tx = Math.max(size.w / 2 + 6, Math.min(innerWidth - size.w / 2 - 6, tx));
      ty = Math.max(size.h + 6, Math.min(innerHeight - 6, ty));
    }
    const k = reduced() ? 1 : Math.min(1, dt * 3.2);
    const moved = Math.hypot(tx - pos.x, ty - pos.y);
    pos.x += (tx - pos.x) * k; pos.y += (ty - pos.y) * k;
    walk = moved > 8 && !reduced() ? walk + dt * 14 : walk * 0.9;
    const bob = Math.sin(walk) * Math.min(4, moved / 20);
    root.style.transform = `translate(${(pos.x - size.w / 2).toFixed(1)}px, ${(pos.y - size.h + bob).toFixed(1)}px)`;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (document.hidden) return;
    if (fixed) place(dt);
    aim();
  }

  // blinking
  let blinkT = 0;
  function blink() {
    if (reduced()) return;
    lids.forEach((l) => l.setAttribute('height', '28'));
    setTimeout(() => lids.forEach((l) => l.setAttribute('height', '0')), 120);
    blinkT = setTimeout(blink, 2500 + Math.random() * 3000);
  }

  const onMove = (e) => { pointer = { x: e.clientX, y: e.clientY }; };
  const onResize = () => measure();

  const api = {
    el: root,
    mount(parent = document.body) {
      measure();
      parent.append(root);
      addEventListener('pointermove', onMove, { passive: true });
      addEventListener('pointerdown', onMove, { passive: true });
      addEventListener('resize', onResize);
      raf = requestAnimationFrame(frame);
      blinkT = setTimeout(blink, 1500);
      return api;
    },
    /** Point the stick at an element or {x,y}; null goes back to following the pointer. */
    point(t) { pointAt = t; },
    /** Speech bubble. opts: {point: Element|{x,y}, ms} */
    say(text, opts = {}) {
      clearTimeout(hideTimer); clearTimeout(talkTimer);
      bubble.textContent = text;
      bubble.hidden = false;
      bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
      root.classList.add('talking');
      talkTimer = setTimeout(() => root.classList.remove('talking'), Math.min(2600, 300 + text.length * 35));
      if (opts.point !== undefined) pointAt = opts.point;
      const ms = opts.ms ?? Math.max(5000, text.length * 75);
      if (ms) hideTimer = setTimeout(api.hush, ms);
    },
    hush() {
      bubble.hidden = true;
      root.classList.remove('talking');
      pointAt = null;
    },
    destroy() {
      cancelAnimationFrame(raf); clearTimeout(blinkT); clearTimeout(hideTimer); clearTimeout(talkTimer);
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerdown', onMove);
      removeEventListener('resize', onResize);
      root.remove();
    },
  };
  bubble.addEventListener('click', () => api.hush());
  return api;
}
