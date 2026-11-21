// Professor Gloop: the drill book's teacher. A goofy, sloth-ish alien in a lab coat who follows the
// pointer, points with his stick and hands out tips. Pure SVG, no assets.
//
//   const prof = createTeacher();            // the floating one (attached to <body>)
//   prof.say('Nice!', { point: element });   // speech bubble, stick aimed at an element
//   const mini = createTeacher({ fixed: false }); // an inline copy (used inside the tutorial dialog)

const SVG = `
<svg viewBox="0 0 120 170" aria-hidden="true" focusable="false">
  <defs>
    <clipPath id="ID-l"><circle cx="27" cy="40" r="13"/></clipPath>
    <clipPath id="ID-r"><circle cx="93" cy="40" r="13"/></clipPath>
  </defs>
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
    <path class="t-claw" d="M32 131 l-1.5 4 M35.5 132 l0 4.5 M39 131 l1.5 4"/>
    <path class="t-coat" d="M40 90 Q28 120 34 146 L86 146 Q94 120 80 90 Q60 82 40 90 Z"/>
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
        <path class="t-line" d="M48 28 Q43 15 35 9" fill="none"/>
        <path class="t-line" d="M72 28 Q78 14 87 8" fill="none"/>
        <circle class="t-bobble" cx="34" cy="8" r="4.4"/>
        <circle class="t-bobble" cx="88" cy="7" r="4.4"/>
      </g>
      <path class="t-skin t-stroke" d="M27 52 Q24 25 60 24 Q96 25 93 52 Q96 79 60 80 Q24 79 27 52 Z"/>
      <path class="t-line" d="M53 26 q-1 -8 4 -6 q1 -6 5 -1 q4 -5 5 2" fill="none"/>
      <ellipse class="t-snout" cx="60" cy="56" rx="14" ry="8.5"/>
      <circle class="t-ink" cx="55.5" cy="54" r="1.5"/><circle class="t-ink" cx="64.5" cy="54" r="1.5"/>
      <g class="t-mouth">
        <path class="t-mouth-open" d="M41 65 Q60 84 79 65 Q60 71 41 65 Z"/>
        <path class="t-line" d="M39 63.5 q2 2 3 0 M78 63.5 q1 2 3 0" fill="none"/>
      </g>
      <path class="t-teeth" d="M54 66.6 h5.6 v8.5 q-2.8 1.6 -5.6 0 Z M60.4 66.6 h5.6 v8.5 q-2.8 1.6 -5.6 0 Z"/>
      <g class="t-eye" data-cx="27" data-cy="40">
        <circle class="t-white" cx="27" cy="40" r="13"/>
        <circle class="t-pupil" cx="27" cy="40" r="5.8"/>
        <g clip-path="url(#ID-l)"><rect class="t-lid t-skin" x="13" y="26" width="28" height="7" data-rest="7"/></g>
        <circle cx="27" cy="40" r="13" fill="none" stroke="#2a2f36" stroke-width="2.4"/>
      </g>
      <g class="t-eye" data-cx="93" data-cy="40">
        <circle class="t-white" cx="93" cy="40" r="13"/>
        <circle class="t-pupil" cx="93" cy="40" r="4.2"/>
        <g clip-path="url(#ID-r)"><rect class="t-lid t-skin" x="79" y="26" width="28" height="5" data-rest="5"/></g>
        <circle cx="93" cy="40" r="13" fill="none" stroke="#2a2f36" stroke-width="2.4"/>
      </g>
      <circle class="t-glass" cx="27" cy="40" r="15.5"/>
      <circle class="t-glass" cx="93" cy="40" r="15.5"/>
      <path class="t-glass" d="M42.5 38 Q60 31 77.5 38"/>
    </g>
    <g class="t-arm" transform="translate(80 98) rotate(-20)">
      <path class="t-coat" d="M-2 -6 L24 -5 L25 5 L-2 7 Z"/>
      <path class="t-stick" d="M27 0 L74 0"/>
      <circle class="t-stick-tip" cx="75" cy="0" r="2.6"/>
      <circle class="t-skin t-stroke" cx="27" cy="0" r="5.2"/>
      <path class="t-claw" d="M30 -4 l4 -2.5 M31 0 l4.5 0 M30 4 l4 2.5"/>
    </g>
  </g>
</svg>`;

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createTeacher({ fixed = true } = {}) {
  const root = document.createElement('div');
  root.className = 'teacher' + (fixed ? ' teacher-fixed' : ' teacher-inline');
  const uid = 'tp' + Math.random().toString(36).slice(2, 8);
  root.innerHTML = SVG.replaceAll('ID-', uid + '-');
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
      // Only his eyes and antennae peek over the bottom edge.
      tx = innerWidth - size.w * 0.4; ty = innerHeight + size.h * 0.68;
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
    setTimeout(() => lids.forEach((l) => l.setAttribute('height', l.dataset.rest || '0')), 120);
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
