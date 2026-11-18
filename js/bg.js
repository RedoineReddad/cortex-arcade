// Ambient "neural network" background with three.js. Pauses while a game runs.
export async function startBackground(canvas) {
  const THREE = await import('three');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 14;

  const N = 90;
  const pos = new Float32Array(N * 3);
  const vel = [];
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 30;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 18;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    vel.push(new THREE.Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.3));
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dot = document.createElement('canvas');
  dot.width = dot.height = 32;
  const g = dot.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: 0x8b9cff, size: 0.35, map: new THREE.CanvasTexture(dot), transparent: true, opacity: 0.9, depthWrite: false,
  }));
  scene.add(points);

  const MAXL = 400;
  const lPos = new Float32Array(MAXL * 6);
  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3));
  const lines = new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({ color: 0x6d7cff, transparent: true, opacity: 0.18 }));
  scene.add(lines);

  const resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  let mx = 0, my = 0;
  window.addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });

  let last = performance.now();
  const tick = (now) => {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const view = document.body.dataset.view;
    const inGame = !!document.querySelector('.stage');
    canvas.classList.toggle('off', inGame);
    if (inGame || document.hidden) return;
    for (let i = 0; i < N; i++) {
      const v = vel[i];
      pos[i * 3] += v.x * dt; pos[i * 3 + 1] += v.y * dt; pos[i * 3 + 2] += v.z * dt;
      if (Math.abs(pos[i * 3]) > 15) v.x *= -1;
      if (Math.abs(pos[i * 3 + 1]) > 9) v.y *= -1;
      if (Math.abs(pos[i * 3 + 2]) > 5) v.z *= -1;
    }
    pGeo.attributes.position.needsUpdate = true;
    let k = 0;
    for (let i = 0; i < N && k < MAXL; i++) {
      for (let j = i + 1; j < N && k < MAXL; j++) {
        const dx = pos[i * 3] - pos[j * 3], dy = pos[i * 3 + 1] - pos[j * 3 + 1], dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < 9) {
          lPos.set([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]], k * 6);
          k++;
        }
      }
    }
    lGeo.setDrawRange(0, k * 2);
    lGeo.attributes.position.needsUpdate = true;
    camera.position.x += (mx * 3 - camera.position.x) * 0.03;
    camera.position.y += (-my * 2 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);
    scene.rotation.y += dt * 0.02 * (view === 'home' ? 1 : 0.3);
    renderer.render(scene, camera);
  };
  requestAnimationFrame(tick);
}
