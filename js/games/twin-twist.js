// Twin Twist 3D: Shepard–Metzler mental rotation. Same shape, or its mirror image?
import { rand, pick, clamp } from '../core/util.js';

/* ---------- polycube maths (pure, exported for testing) ---------- */
export const ROTS = (() => {
  const perms = [[0, 1, 2, 1], [1, 2, 0, 1], [2, 0, 1, 1], [0, 2, 1, -1], [2, 1, 0, -1], [1, 0, 2, -1]];
  const out = [];
  for (const [a, b, c, ps] of perms)
    for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1])
      if (ps * sx * sy * sz === 1) out.push({ p: [a, b, c], s: [sx, sy, sz] });
  return out;
})();
const rot = (v, r) => [r.s[0] * v[r.p[0]], r.s[1] * v[r.p[1]], r.s[2] * v[r.p[2]]];
function norm(cells) {
  const mn = [0, 1, 2].map((i) => Math.min(...cells.map((c) => c[i])));
  return cells.map((c) => c.map((v, i) => v - mn[i])).map((c) => c.join(',')).sort().join(';');
}
export const canon = (cells) => ROTS.map((r) => norm(cells.map((c) => rot(c, r)))).sort()[0];
export const mirror = (cells) => cells.map(([x, y, z]) => [-x, y, z]);
export const isChiral = (cells) => canon(cells) !== canon(mirror(cells));

/** Shepard–Metzler style shape: straight arms joined at right angles, chiral, connected. */
export function makeShape(n) {
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (let attempt = 0; attempt < 500; attempt++) {
    const cells = [[0, 0, 0]];
    const has = new Set(['0,0,0']);
    let pos = [0, 0, 0], dir = pick(dirs), ok = true, arms = 0;
    while (cells.length < n && ok) {
      const len = Math.min(n - cells.length, rand(arms === 0 ? 2 : 1, 3));
      for (let i = 0; i < len; i++) {
        pos = pos.map((v, k) => v + dir[k]);
        const key = pos.join(',');
        if (has.has(key)) { ok = false; break; }
        has.add(key); cells.push(pos);
      }
      arms++;
      dir = pick(dirs.filter((d) => d.every((v, k) => v * dir[k] === 0))); // perpendicular turn
    }
    if (!ok || cells.length !== n || arms < 3) continue;
    // reject shapes with cubes touching side-on outside the chain (keeps the "arms" readable)
    let touching = 0;
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++)
      if (cells[i].reduce((a, v, k) => a + Math.abs(v - cells[j][k]), 0) === 1) touching++;
    if (touching) continue;
    if (!isChiral(cells)) continue;
    return cells;
  }
  return [[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [2, 2, 0], [2, 2, 1], [2, 2, 2]]; // chiral fallback
}

const PALETTE = [0x9db4ff, 0xa8e6cf, 0xffc3a0, 0xd5aaff, 0x9ad7f0, 0xf9b5c9];

export default async function start(api) {
  const { h, level } = api;
  let score = 0, correct = 0, wrong = 0, n = 0, locked = true, trial = null, t0 = 0, layout = 'row';

  api.css(`
    .stage:has(.tw-view) { justify-content:flex-start; }
    .tw-view { position:relative; flex:1 1 0; min-height:200px; width:100%; max-width:900px; }
    .tw-view canvas { position:absolute; inset:0; width:100%; height:100%; display:block; touch-action:none; cursor:default; }
    .tw-lab { position:absolute; font-size:.8rem; font-weight:700; color:var(--muted); letter-spacing:.05em; text-transform:uppercase; pointer-events:none; }
    .tw-lab.b { color:var(--c); }
    .tw-sep { position:absolute; background:var(--line); pointer-events:none; }
    .tw-btns { width:min(460px,100%); }
    .tw-btns .choice { display:flex; flex-direction:column; align-items:center; gap:2px; }
    .tw-btns .choice small { font-size:.72rem; font-weight:600; color:var(--muted); }
    .tw-q { font-weight:800; font-size:clamp(1.05rem,4.2vw,1.35rem); text-align:center; }
  `);

  const labA = h('div.tw-lab', 'Shape A');
  const labB = h('div.tw-lab.b', 'Shape B · drag to turn');
  const sep = h('div.tw-sep');
  const view = h('div.tw-view', labA, labB, sep);
  const btns = h('div.choices.tw-btns',
    h('button.choice', { type: 'button', onclick: (e) => answer('same', e) }, 'Same', h('small', 'S / ←')),
    h('button.choice', { type: 'button', onclick: (e) => answer('mirror', e) }, 'Mirror', h('small', 'M / →')));
  api.stage.append(h('div.tw-q', 'Same shape, or mirror image?'), view, btns);
  api.setScore(0);

  const THREE = await api.three();
  if (api.ended) return;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setScissorTest(true);
  view.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 16);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a6f99, 1.25));
  const sun = new THREE.DirectionalLight(0xffffff, 2.9);
  sun.position.set(4, 7, 5);
  scene.add(sun);
  const back = new THREE.DirectionalLight(0xffffff, 0.5);
  back.position.set(-5, -3, -4);
  scene.add(back);

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const edgeGeo = new THREE.EdgesGeometry(boxGeo);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x262145, transparent: true, opacity: 0.55 });
  const mats = PALETTE.map((c) => new THREE.MeshLambertMaterial({ color: c, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
  const A = new THREE.Group(), B = new THREE.Group();
  scene.add(A, B);
  const spin = { A: null, B: null };
  let radius = 3, W = 1, H = 1, dragging = null;

  function fill(group, cells, mat) {
    group.clear();
    const c = [0, 1, 2].map((i) => cells.reduce((a, v) => a + v[i], 0) / cells.length);
    radius = Math.max(...cells.map((v) => Math.hypot(v[0] - c[0], v[1] - c[1], v[2] - c[2]))) + 0.9;
    for (const v of cells) {
      const m = new THREE.Mesh(boxGeo, mat);
      m.position.set(v[0] - c[0], v[1] - c[1], v[2] - c[2]);
      m.add(new THREE.LineSegments(edgeGeo, edgeMat));
      group.add(m);
    }
  }
  const randQuat = () => new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3));
  const randAxis = () => new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();

  function resize() {
    W = view.clientWidth; H = view.clientHeight;
    if (!W || !H) return;
    renderer.setSize(W, H, false);
    layout = W / H < 0.95 ? 'col' : 'row';
    if (layout === 'row') {
      Object.assign(labA.style, { left: '12px', top: '6px', right: '', bottom: '' });
      Object.assign(labB.style, { left: W / 2 + 12 + 'px', top: '6px', right: '', bottom: '' });
      Object.assign(sep.style, { left: W / 2 + 'px', top: '10%', width: '1px', height: '80%' });
    } else {
      Object.assign(labA.style, { left: '12px', top: '6px', right: '', bottom: '' });
      Object.assign(labB.style, { left: '12px', top: H / 2 + 6 + 'px', right: '', bottom: '' });
      Object.assign(sep.style, { left: '10%', top: H / 2 + 'px', width: '80%', height: '1px' });
    }
  }
  const ro = new ResizeObserver(resize);
  ro.observe(view);
  api.onCleanup(() => {
    ro.disconnect();
    boxGeo.dispose(); edgeGeo.dispose(); edgeMat.dispose();
    mats.forEach((m) => m.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    delete window.__cortexDebug;
  });

  const rectOf = (which) => {
    // viewport in CSS px, origin bottom-left (WebGL convention)
    if (layout === 'row') return which === 'A' ? [0, 0, W / 2, H] : [W / 2, 0, W / 2, H];
    return which === 'A' ? [0, H / 2, W, H / 2] : [0, 0, W, H / 2];
  };

  function renderPart(which, group) {
    const [x, y, w, hh] = rectOf(which);
    renderer.setViewport(x, y, w, hh);
    renderer.setScissor(x, y, w, hh);
    camera.aspect = w / hh;
    const vf = (camera.fov * Math.PI) / 180;
    const hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    camera.position.z = (radius * 1.05) / Math.sin(Math.min(vf, hf) / 2);
    camera.updateProjectionMatrix();
    A.visible = group === A; B.visible = group === B;
    renderer.render(scene, camera);
  }

  function newTrial() {
    const size = [rand(6, 7), rand(7, 8), 8, rand(8, 9), rand(9, 10)][level - 1];
    const cells = makeShape(size);
    const isMirror = Math.random() < 0.5;
    const mat = pick(mats);
    fill(A, cells, mat);
    fill(B, isMirror ? mirror(cells) : cells, mat);
    A.quaternion.copy(randQuat());
    B.quaternion.copy(randQuat());
    const sp = 0.25 + 0.06 * level;
    spin.A = { axis: randAxis(), speed: sp };
    spin.B = { axis: randAxis(), speed: sp * 0.8 };
    trial = { answer: isMirror ? 'mirror' : 'same' };
    [...btns.children].forEach((b) => b.classList.remove('right', 'wrong'));
    t0 = performance.now();
    locked = false;
    api.setInfo(`#${n + 1}`);
  }

  function answer(choice, e) {
    if (locked || api.ended || !trial) return;
    locked = true;
    n++;
    const i = choice === 'same' ? 0 : 1;
    const x = e && e.clientX ? e.clientX : undefined, y = e && e.clientY ? e.clientY : undefined;
    const dt = (performance.now() - t0) / 1000;
    if (choice === trial.answer) {
      correct++;
      const bonus = Math.round(5 * clamp(1 - (dt - 2.5) / 8, 0, 1));
      score += 10 + bonus;
      btns.children[i].classList.add('right');
      api.good(x, y);
    } else {
      wrong++;
      score = Math.max(0, score - 5);
      btns.children[i].classList.add('wrong');
      btns.children[1 - i].classList.add('right');
      api.bad(x, y);
      api.banner(trial.answer === 'same' ? 'It was the same' : 'It was a mirror', 1100);
    }
    api.setScore(score);
    api.after(choice === trial.answer ? 500 : 1300, newTrial);
  }

  // dragging the B shape
  const cv = renderer.domElement;
  const inB = (e) => {
    const r = cv.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    return layout === 'row' ? px > W / 2 : py > H / 2;
  };
  api.on(cv, 'pointerdown', (e) => {
    if (!inB(e)) return;
    dragging = { x: e.clientX, y: e.clientY, id: e.pointerId };
    try { cv.setPointerCapture(e.pointerId); } catch {}
  });
  api.on(cv, 'pointermove', (e) => {
    cv.style.cursor = dragging ? 'grabbing' : inB(e) ? 'grab' : 'default';
    if (!dragging || e.pointerId !== dragging.id) return;
    const dx = e.clientX - dragging.x, dy = e.clientY - dragging.y;
    dragging.x = e.clientX; dragging.y = e.clientY;
    const q = new THREE.Quaternion();
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * 0.012); B.quaternion.premultiply(q);
    q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * 0.012); B.quaternion.premultiply(q);
  });
  const up = () => { dragging = null; };
  api.on(cv, 'pointerup', up);
  api.on(cv, 'pointercancel', up);

  api.keys({ s: (e) => answer('same', e), ArrowLeft: (e) => answer('same', e), m: (e) => answer('mirror', e), ArrowRight: (e) => answer('mirror', e) });

  api.loop((dt) => {
    if (spin.A) A.rotateOnWorldAxis(spin.A.axis, spin.A.speed * dt);
    if (spin.B && !dragging) B.rotateOnWorldAxis(spin.B.axis, spin.B.speed * dt);
    if (W && H) { renderPart('A', A); renderPart('B', B); }
  });

  window.__cortexDebug = { get answer() { return trial && trial.answer; } };
  api.timer(60, () => api.end({ score, stats: { Correct: String(correct), Wrong: String(wrong), Accuracy: n ? Math.round((100 * correct) / n) + '%' : '—' } }));
  resize();
  newTrial();
}
