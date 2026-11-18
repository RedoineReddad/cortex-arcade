// Cube Stack 3D: count every cube in a slowly rotating stack, hidden supports included.
import { rand, pick, clamp } from '../core/util.js';

const LAYER_COLORS = [0xb7a6f5, 0x93d9c0, 0xf7c39b, 0x9cc8f5]; // lavender, mint, peach, sky
const COLOR_Q = { ORANGE: 0xf6a35c, BLUE: 0x6ea8f0 };

/** Heightmap stack generator (pure). Returns {n, hm: number[n][n], total}. */
export function makeStack(level, round) {
  const n = level <= 2 ? 3 : level === 3 ? pick([3, 4]) : 4;
  const maxH = level <= 2 ? 3 : 4;
  const ranges = [[5, 8], [7, 11], [9, 14], [11, 17], [13, 20]];
  const [lo, hi] = ranges[level - 1];
  const target = clamp(rand(lo, hi) + (round >= 5 ? 1 : 0), 5, Math.min(20, n * n * maxH));
  for (let attempt = 0; attempt < 200; attempt++) {
    const hm = Array.from({ length: n }, () => new Array(n).fill(0));
    hm[rand(0, n - 1)][rand(0, n - 1)] = 1;
    let total = 1;
    while (total < target) {
      const cands = [];
      for (let x = 0; x < n; x++) for (let z = 0; z < n; z++) {
        if (hm[x][z] >= maxH) continue;
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => hm[x + dx]?.[z + dz] > 0);
        if (hm[x][z] === 0 && !nb) continue;
        cands.push({ x, z, w: hm[x][z] > 0 ? 2.2 : 1 });
      }
      let r = Math.random() * cands.reduce((a, c) => a + c.w, 0);
      const c = cands.find((c) => (r -= c.w) <= 0) || cands[cands.length - 1];
      hm[c.x][c.z]++;
      total++;
    }
    // fairness: no interior "wells" that could stay hidden from every angle
    let ok = true;
    for (let x = 1; x < n - 1; x++) for (let z = 1; z < n - 1; z++) {
      const v = hm[x][z];
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) => hm[x + dx][z + dz] >= v + 2)) ok = false;
    }
    // need at least one hidden support (a column of height ≥ 2)
    if (!hm.flat().some((v) => v >= 2)) ok = false;
    if (ok) return { n, hm, total };
  }
  return { n: 3, hm: [[2, 1, 0], [1, 1, 0], [0, 0, 0]], total: 5 };
}

export default async function start(api) {
  const { h, level } = api;
  const ROUNDS = 8;
  const viewDur = [8, 7.5, 7, 6.5, 6][level - 1];
  let round = 0, correct = 0, score = 0, phase = 'load', t = 0, cur = null, firstColour = level >= 3 ? 3 : 5;

  api.css(`
    .stage:has(.cu-view) { justify-content:flex-start; }
    .cu-q { font-size:clamp(1.15rem,4.6vw,1.6rem); font-weight:800; text-align:center; min-height:1.3em; }
    .cu-q b { padding:0 .35em; border-radius:8px; color:#1b1530; }
    .cu-sub { font-size:.9rem; margin-top:-8px; min-height:1.2em; }
    .cu-view { position:relative; flex:1 1 0; min-height:150px; width:100%; max-width:820px; }
    .cu-view canvas { position:absolute; inset:0; width:100%; height:100%; display:block; transition:opacity .6s; touch-action:none; }
    .cu-view.hide canvas { opacity:.06; }
    .cu-bar { position:absolute; left:50%; bottom:4px; transform:translateX(-50%); width:min(240px,60%); height:5px; border-radius:9px; background:var(--line); overflow:hidden; }
    .cu-bar i { display:block; height:100%; width:0; background:var(--c); }
    .cu-veil { position:absolute; inset:0; display:grid; place-items:center; font-size:clamp(3rem,14vw,5rem); font-weight:900; color:var(--c); opacity:0; transition:opacity .4s; pointer-events:none; }
    .cu-view.hide .cu-veil { opacity:.85; }
    .cu-main { flex:1 1 0; min-height:0; width:100%; display:flex; flex-direction:column; align-items:center; gap:12px; }
    .stage .cu-kp { width:min(300px,100%); }
    @media (min-width:760px) and (min-aspect-ratio:5/4) {
      .cu-main { flex-direction:row; justify-content:center; align-items:stretch; max-width:1000px; }
      .cu-view { height:auto; }
      .stage .cu-kp { align-self:center; flex:0 0 280px; }
    }
    @media (max-height:700px) { .stage .cu-kp .kp-key { height:42px; } .stage .cu-kp .kp-display { min-height:44px; font-size:1.6rem; } }
  `);

  const q = h('div.cu-q', 'Loading 3D…');
  const sub = h('div.g-sub.cu-sub');
  const barFill = h('i');
  const veil = h('div.cu-veil', '?');
  const view = h('div.cu-view', veil, h('div.cu-bar', barFill));
  const main = h('div.cu-main', view);
  api.stage.append(q, sub, main);
  const kp = api.keypad({ maxLen: 2, onSubmit: submit, parent: main });
  kp.el.classList.add('cu-kp');
  api.setScore(0);
  api.setProgress(0);

  const THREE = await api.three();
  if (api.ended) return;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  view.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a6f99, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.position.set(4, 9, 6);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(-6, 2, -4);
  scene.add(fill);

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const edgeGeo = new THREE.EdgesGeometry(boxGeo);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x2a2547, transparent: true, opacity: 0.6 });
  const mats = {};
  const matFor = (hex) => (mats[hex] ||= new THREE.MeshLambertMaterial({ color: hex, transparent: true, opacity: 1, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
  const turntable = new THREE.Group();
  scene.add(turntable);
  let stackGroup = null, floor = null;

  const resize = () => {
    const w = view.clientWidth, hgt = view.clientHeight;
    if (!w || !hgt) return;
    renderer.setSize(w, hgt, false);
    camera.aspect = w / hgt;
    camera.updateProjectionMatrix();
    if (cur) frame();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(view);
  api.onCleanup(() => {
    ro.disconnect();
    clearStack();
    boxGeo.dispose(); edgeGeo.dispose(); edgeMat.dispose();
    Object.values(mats).forEach((m) => m.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    delete window.__cortexDebug;
  });

  function clearStack() {
    if (stackGroup) turntable.remove(stackGroup);
    if (floor) { turntable.remove(floor); floor.geometry.dispose(); floor.material.dispose(); floor = null; }
    stackGroup = null;
  }

  function frame() {
    const { n, maxH } = cur;
    const r = Math.sqrt(2 * (n / 2) ** 2 + (maxH / 2) ** 2) * 1.2;
    const vf = (camera.fov * Math.PI) / 180;
    const hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    const dist = r / Math.sin(Math.min(vf, hf) / 2);
    const el = (38 * Math.PI) / 180;
    const cy = maxH / 2 - 0.2;
    camera.position.set(0, cy + dist * Math.sin(el), dist * Math.cos(el));
    camera.lookAt(0, cy, 0);
  }

  function build() {
    clearStack();
    const st = makeStack(level, round);
    const colourRound = round >= firstColour - 1;
    let colOf = null, ask = null, answer = st.total;
    if (colourRound) {
      // each column is one solid colour, so the count stays deducible from what is visible
      const cols = [];
      for (let x = 0; x < st.n; x++) for (let z = 0; z < st.n; z++) if (st.hm[x][z]) cols.push([x, z]);
      for (let tries = 0; tries < 50; tries++) {
        colOf = {};
        cols.forEach(([x, z]) => (colOf[x + ',' + z] = Math.random() < 0.5 ? 'ORANGE' : 'BLUE'));
        const set = new Set(Object.values(colOf));
        if (set.size === 2) break;
      }
      ask = pick(['ORANGE', 'BLUE']);
      answer = cols.reduce((a, [x, z]) => a + (colOf[x + ',' + z] === ask ? st.hm[x][z] : 0), 0);
    }
    stackGroup = new THREE.Group();
    const off = (st.n - 1) / 2;
    for (let x = 0; x < st.n; x++) for (let z = 0; z < st.n; z++) {
      for (let y = 0; y < st.hm[x][z]; y++) {
        const hex = colOf ? COLOR_Q[colOf[x + ',' + z]] : LAYER_COLORS[y % LAYER_COLORS.length];
        const m = new THREE.Mesh(boxGeo, matFor(hex));
        m.position.set(x - off, y + 0.5, z - off);
        m.add(new THREE.LineSegments(edgeGeo, edgeMat));
        stackGroup.add(m);
      }
    }
    turntable.add(stackGroup);
    floor = new THREE.Mesh(new THREE.BoxGeometry(st.n + 0.5, 0.12, st.n + 0.5), new THREE.MeshLambertMaterial({ color: 0x8c93c4, transparent: true, opacity: 0.35 }));
    floor.position.y = -0.07;
    turntable.add(floor);
    turntable.rotation.y = Math.random() * Math.PI * 2;
    cur = { ...st, maxH: Math.max(...st.hm.flat()), answer, ask, t0: performance.now() };
    frame();
    q.replaceChildren(...(ask ? ['How many ', h('b', { style: { background: '#' + COLOR_Q[ask].toString(16) } }, ask), ' cubes?'] : ['How many cubes in total?']));
    sub.textContent = ask ? 'Each column is one solid colour. Count the hidden ones too.' : 'Cubes can’t float: count the hidden supports too.';
  }

  function setOpacity(o) { Object.values(mats).forEach((m) => { m.opacity = o; m.depthWrite = o > 0.99; }); edgeMat.opacity = o > 0.99 ? 0.6 : 0.9; }

  function nextRound() {
    if (api.ended) return;
    if (round >= ROUNDS) return finish();
    api.setInfo(`Round ${round + 1}/${ROUNDS}`);
    api.setProgress(round / ROUNDS);
    build();
    setOpacity(1);
    view.classList.remove('hide');
    kp.clear();
    phase = 'view';
    t = 0;
    if (round === firstColour - 1) api.banner('Colour round!', 1000);
  }

  function submit(v) {
    if (phase !== 'view' && phase !== 'answer') return;
    const guess = Number(v);
    const ok = guess === cur.answer;
    const tAns = (performance.now() - cur.t0) / 1000;
    if (ok) {
      correct++;
      const bonus = 2 * clamp(1 - (tAns - viewDur) / 6, 0, 1);
      score += 12.5 + bonus;
      api.good();
      api.banner(`✓ ${cur.answer}`, 1300);
    } else {
      api.bad();
      api.banner(`${cur.answer}, not ${guess}`, 1700);
    }
    api.setScore(Math.round(score));
    round++;
    api.setProgress(round / ROUNDS);
    // X-ray reveal so the player sees the hidden supports
    phase = 'reveal';
    view.classList.remove('hide');
    setOpacity(0.42);
    api.after(ok ? 1500 : 2300, nextRound);
  }

  function finish() {
    api.end({ score: Math.round(score), stats: { Correct: `${correct} / ${ROUNDS}`, Accuracy: Math.round((100 * correct) / ROUNDS) + '%' } });
  }

  api.loop((dt) => {
    if (phase === 'view') {
      t += dt;
      turntable.rotation.y += dt * (4.6 / viewDur);
      barFill.style.width = clamp(100 - (t / viewDur) * 100, 0, 100) + '%';
      if (t >= viewDur) { phase = 'answer'; view.classList.add('hide'); }
    } else if (phase === 'reveal') {
      turntable.rotation.y += dt * 0.9;
      barFill.style.width = '0%';
    }
    renderer.render(scene, camera);
  });

  window.__cortexDebug = { get answer() { return cur && cur.answer; }, get phase() { return phase; }, get round() { return round; } };
  resize();
  nextRound();
}
