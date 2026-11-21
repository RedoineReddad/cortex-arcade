// "How to play" dialog and per-game guides (tips + tutorial steps).
//
// A guide lives in js/guides/<game-id>.js:
//   export default {
//     tips: { low: [..], mid: [..], high: [..] },   // shown by the professor after a game (rating <50, 50–99, ≥100)
//     tutorial: [                                    // 3–5 steps
//       { say: 'One or two short sentences.', demo: (h) => h('div.tut-row', ...) },
//     ],
//   };
// `demo` builds a small illustration for the 210px-tall stage; use the .tut-* classes from style.css,
// or inject a <style> with a game-specific class prefix.
import { h } from './core/util.js';
import { createTeacher } from './teacher.js';

const cache = new Map();
export function loadGuide(id) {
  if (!cache.has(id)) cache.set(id, import(`./guides/${id}.js`).then((m) => m.default).catch(() => null));
  return cache.get(id);
}

const GENERIC = {
  low: ['Warm-ups count too. Try once more and watch your score climb.', 'Slow down a little: accuracy first, speed comes on its own.'],
  mid: ['Solid round. Keep your eyes on the twist; that is where points hide.', 'Good! Try to beat this score tomorrow.'],
  high: ['Outstanding! The game will get harder next time to keep up with you.', 'Top marks. Your brain is clearly awake today.'],
};

export function pickTip(guide, rating) {
  const band = rating >= 100 ? 'high' : rating >= 50 ? 'mid' : 'low';
  const list = (guide && guide.tips && guide.tips[band]) || GENERIC[band];
  return list[Math.floor(Math.random() * list.length)];
}

/** Open the tutorial for game g. onStart() is called if the player presses Start on the last step. */
export async function openTutorial(g, onStart) {
  const guide = await loadGuide(g.id);
  const steps = guide && guide.tutorial && guide.tutorial.length
    ? guide.tutorial
    : g.howto.map((t) => ({ say: t })).concat([{ say: 'The twist: ' + g.twist }]);

  const stage = h('div.tut-stage.graph');
  const say = h('p.tut-say', { 'aria-live': 'polite' });
  const dots = h('div.tut-dots', steps.map(() => h('i')));
  const back = h('button.btn.ghost', { type: 'button' }, 'Back');
  const next = h('button.btn.primary', { type: 'button' }, 'Next');
  const close = h('button.icon-btn', { type: 'button', 'aria-label': 'Close tutorial' }, '✕');
  const profBox = h('div.tut-prof');
  const dlg = h('dialog.tut', { 'aria-labelledby': 'tut-title', style: { '--c-l': '', '--c-d': '' } },
    h('div.tut-head', h('h2#tut-title', 'How to play ' + g.title), close),
    stage,
    h('div.tut-talk', profBox, say),
    h('div.tut-foot', dots, h('div.tut-nav', back, next)));
  // carry the subject colour into the dialog
  const host = document.querySelector('#main');
  if (host) { dlg.style.setProperty('--c-l', host.style.getPropertyValue('--c-l')); dlg.style.setProperty('--c-d', host.style.getPropertyValue('--c-d')); }
  document.body.append(dlg);
  const prof = createTeacher({ fixed: false }).mount(profBox);

  let i = 0;
  const show = () => {
    const s = steps[i];
    stage.replaceChildren();
    let demo = null;
    try { demo = s.demo ? s.demo(h) : null; } catch (e) { console.error(e); }
    if (demo) stage.append(demo); else stage.append(h('div.tut-big', g.title));
    stage.hidden = false;
    say.textContent = s.say;
    prof.point(stage);
    prof.el.classList.add('talking');
    setTimeout(() => prof.el.classList.remove('talking'), Math.min(2400, 300 + s.say.length * 30));
    [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
    back.disabled = i === 0;
    back.style.visibility = i === 0 ? 'hidden' : '';
    next.textContent = i === steps.length - 1 ? 'Start' : 'Next';
  };
  const onNav = () => finish(false);
  addEventListener('hashchange', onNav);
  const finish = (start) => {
    removeEventListener('hashchange', onNav);
    if (!dlg.isConnected) return;
    prof.destroy();
    dlg.close();
    dlg.remove();
    if (start && onStart) onStart();
  };
  back.onclick = () => { if (i > 0) { i--; show(); } };
  next.onclick = () => { if (i < steps.length - 1) { i++; show(); } else finish(true); };
  close.onclick = () => finish(false);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); finish(false); });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') next.click();
    else if (e.key === 'ArrowLeft') back.click();
  });
  show();
  dlg.showModal();
  next.focus();
}
