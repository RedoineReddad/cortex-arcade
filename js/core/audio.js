// Tiny WebAudio synth: no audio files shipped.
let ctx = null;
let muted = false;
try { muted = localStorage.getItem('cortex.muted') === '1'; } catch {}

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function tone(freq = 440, dur = 0.12, type = 'sine', vol = 0.15, when = 0) {
  if (muted) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  good: () => { tone(880, 0.08, 'triangle'); tone(1320, 0.12, 'triangle', 0.12, 0.06); },
  bad: () => { tone(180, 0.18, 'square', 0.08); },
  tick: () => tone(1200, 0.03, 'sine', 0.05),
  go: () => { tone(523, 0.1); tone(659, 0.1, 'sine', 0.15, 0.1); tone(784, 0.18, 'sine', 0.15, 0.2); },
  end: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.15, 'triangle', 0.12, i * 0.09)); },
  note: (i) => tone([262, 294, 330, 392, 440, 523, 587, 659, 784][i % 9], 0.3, 'triangle', 0.18),
};

export const isMuted = () => muted;
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('cortex.muted', m ? '1' : '0'); } catch {}
}
