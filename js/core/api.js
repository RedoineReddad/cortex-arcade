// The runtime handed to each mini game. Everything registered through it
// (timers, listeners, animation loops) is torn down automatically on end.
import { h, fmtTime } from './util.js';
import { sfx } from './audio.js';

export function createApi({ stage, hud, level, onEnd }) {
  const timeouts = new Set();
  const intervals = new Set();
  const rafs = new Set();
  const listeners = [];
  const cleanups = [];
  let ended = false;
  let paused = false;
  let streak = 0;

  const api = {
    stage,
    level, // 1..5 adaptive difficulty
    h,
    sfx,
    get ended() { return ended; },
    get paused() { return paused; },

    after(ms, fn) {
      const id = setTimeout(() => { timeouts.delete(id); if (!ended) fn(); }, ms);
      timeouts.add(id);
      return id;
    },
    every(ms, fn) {
      const id = setInterval(() => { if (!ended && !paused) fn(); }, ms);
      intervals.add(id);
      return id;
    },
    clear(id) { clearTimeout(id); clearInterval(id); timeouts.delete(id); intervals.delete(id); },
    /** requestAnimationFrame loop. fn(dtSeconds, elapsedSeconds). return false to stop. */
    loop(fn) {
      let last = performance.now();
      let el = 0;
      const tick = (now) => {
        rafs.delete(handle.id);
        if (ended) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!paused) {
          el += dt;
          if (fn(dt, el) === false) return;
        }
        handle.id = requestAnimationFrame(tick);
        rafs.add(handle.id);
      };
      const handle = { id: requestAnimationFrame(tick) };
      rafs.add(handle.id);
      return { stop: () => { cancelAnimationFrame(handle.id); rafs.delete(handle.id); } };
    },
    on(target, ev, fn, opts) {
      target.addEventListener(ev, fn, opts);
      listeners.push([target, ev, fn, opts]);
    },
    /** keyboard shortcut helper: map of key -> fn */
    keys(map) {
      api.on(window, 'keydown', (e) => {
        if (ended || paused) return;
        const fn = map[e.key] || map[e.key.toLowerCase()];
        if (fn) { e.preventDefault(); fn(e); }
      });
    },
    onCleanup(fn) { cleanups.push(fn); },
    /** Inject game-specific CSS; removed automatically when the game ends. */
    css(text) {
      const s = document.createElement('style');
      s.textContent = text;
      document.head.append(s);
      cleanups.push(() => s.remove());
      return s;
    },

    /** Countdown shown in the HUD. Calls onEnd when it hits 0. */
    timer(seconds, onDone) {
      let left = seconds;
      hud.time.textContent = fmtTime(left);
      hud.timeWrap.hidden = false;
      const t = {
        get left() { return left; },
        add(s) { left += s; hud.time.textContent = fmtTime(left); },
        stop() { api.clear(id); },
      };
      const id = api.every(100, () => {
        left -= 0.1;
        hud.time.textContent = fmtTime(left);
        hud.timeWrap.classList.toggle('low', left <= 5);
        if (left <= 0.001) { api.clear(id); onDone && onDone(); }
      });
      return t;
    },
    /** Stopwatch, for games scored on speed. */
    stopwatch() {
      const t0 = performance.now();
      hud.timeWrap.hidden = false;
      const id = api.every(100, () => { hud.time.textContent = ((performance.now() - t0) / 1000).toFixed(1) + 's'; });
      return { get elapsed() { return (performance.now() - t0) / 1000; }, stop() { api.clear(id); } };
    },
    setScore(v) { hud.score.textContent = v; hud.scoreWrap.hidden = false; },
    setInfo(txt) { hud.info.textContent = txt; hud.info.hidden = !txt; },
    setProgress(f) { hud.progress.style.width = Math.max(0, Math.min(1, f)) * 100 + '%'; },

    /** Feedback: plays a sound and flashes a mark near (x,y) or the centre. */
    good(x, y) { streak++; sfx.good(); flash('✓', 'good', x, y); return streak; },
    bad(x, y) { streak = 0; sfx.bad(); flash('✗', 'bad', x, y); stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake'); },
    get streak() { return streak; },

    /** Show a big transient message in the middle of the stage. */
    banner(text, ms = 900, cls = '') {
      const b = h('div.banner' + (cls ? '.' + cls : ''), text);
      stage.append(b);
      setTimeout(() => b.remove(), ms);
      return b;
    },

    /**
     * On-screen numeric keypad (also listens to the physical keyboard).
     * opts: {parent, maxLen, negative, onSubmit(value:string), onChange(value), autoSubmit(value)->bool}
     */
    keypad(opts = {}) {
      const parent = opts.parent || stage;
      let val = '';
      const display = h('div.kp-display', ' ');
      const set = (v) => {
        val = v;
        display.textContent = val || ' ';
        opts.onChange && opts.onChange(val);
        if (opts.autoSubmit && val && opts.autoSubmit(val)) submit();
      };
      const submit = () => { if (val === '' || val === '-') return; const v = val; set(''); opts.onSubmit && opts.onSubmit(v); };
      const press = (k) => {
        if (ended || paused) return;
        if (k === '⌫') set(val.slice(0, -1));
        else if (k === '±' || k === '-') set(val.startsWith('-') ? val.slice(1) : '-' + val);
        else if (k === '⏎') submit();
        else if (/^\d$/.test(k) && val.replace('-', '').length < (opts.maxLen || 4)) set(val + k);
      };
      const keysArr = ['7', '8', '9', '4', '5', '6', '1', '2', '3', opts.negative ? '±' : '⌫', '0', '⏎'];
      const grid = h('div.kp-grid', keysArr.map((k) =>
        h('button.kp-key' + (k === '⏎' ? '.kp-enter' : ''), { type: 'button', onpointerdown: (e) => { e.preventDefault(); press(k); } }, k)));
      if (opts.negative) grid.append(h('button.kp-key.kp-wide', { type: 'button', onpointerdown: (e) => { e.preventDefault(); press('⌫'); } }, '⌫ delete'));
      const wrap = h('div.keypad', opts.hideDisplay ? null : display, grid);
      parent.append(wrap);
      api.on(window, 'keydown', (e) => {
        if (/^\d$/.test(e.key)) press(e.key);
        else if (e.key === 'Backspace') press('⌫');
        else if (e.key === 'Enter') press('⏎');
        else if (e.key === '-' && opts.negative) press('-');
        else return;
        e.preventDefault();
      });
      return { el: wrap, display, get value() { return val; }, clear: () => set(''), set };
    },

    /** Lazy-load three.js (only the 3D games pay for it). */
    three() { return import('three'); },

    /** Finish the game. result = {score, stats: {label: value}, rating?} */
    end(result) {
      if (ended) return;
      teardown();
      sfx.end();
      onEnd(result || { score: 0 });
    },

    pause(p) { paused = p; },
  };

  function flash(sym, cls, x, y) {
    const r = stage.getBoundingClientRect();
    const f = h('div.flash.' + cls, sym);
    f.style.left = (x != null ? x - r.left : r.width / 2) + 'px';
    f.style.top = (y != null ? y - r.top : r.height / 2) + 'px';
    stage.append(f);
    setTimeout(() => f.remove(), 600);
  }

  function teardown() {
    ended = true;
    timeouts.forEach(clearTimeout);
    intervals.forEach(clearInterval);
    rafs.forEach(cancelAnimationFrame);
    listeners.forEach(([t, e, f, o]) => t.removeEventListener(e, f, o));
    cleanups.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  }

  api._abort = teardown;
  return api;
}
