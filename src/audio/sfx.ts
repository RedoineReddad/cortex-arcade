/**
 * Tiny WebAudio synth so the games have tactile sound without any audio assets.
 * Framework-agnostic: scenes and the shell both call it.
 */
let ctx: AudioContext | null = null;
let enabled = true;
let hapticsEnabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}
export function setHapticsEnabled(on: boolean) {
  hapticsEnabled = on;
}

function audio(): AudioContext | null {
  if (!enabled || typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Call from a user gesture so iOS lets audio play later. */
export function unlockAudio() {
  audio();
}

interface Tone {
  freq: number;
  to?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

function play(tones: Tone[]) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + 0.005;
  for (const t of tones) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    const start = t0 + (t.delay ?? 0);
    osc.type = t.type ?? 'sine';
    osc.frequency.setValueAtTime(t.freq, start);
    if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, start + t.dur);
    const peak = t.gain ?? 0.18;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + t.dur);
    osc.connect(g).connect(ac.destination);
    osc.start(start);
    osc.stop(start + t.dur + 0.02);
  }
}

export function vibrate(pattern: number | number[]) {
  if (hapticsEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}

export const sfx = {
  tap: () => play([{ freq: 520, dur: 0.05, type: 'triangle', gain: 0.08 }]),
  correct: (streak = 1) => {
    const base = 660 * Math.pow(2, Math.min(streak, 12) / 24);
    play([
      { freq: base, dur: 0.09, type: 'triangle', gain: 0.16 },
      { freq: base * 1.5, dur: 0.14, type: 'sine', gain: 0.12, delay: 0.06 },
    ]);
  },
  wrong: () => {
    play([
      { freq: 220, to: 120, dur: 0.22, type: 'sawtooth', gain: 0.09 },
      { freq: 180, to: 90, dur: 0.22, type: 'square', gain: 0.05, delay: 0.02 },
    ]);
    vibrate(60);
  },
  combo: (milestone: boolean) =>
    play(
      (milestone ? [0, 4, 7, 12] : [0, 7]).map((semi, i) => ({
        freq: 880 * Math.pow(2, semi / 12),
        dur: 0.12,
        type: 'sine' as const,
        gain: 0.1,
        delay: i * 0.055,
      })),
    ),
  count: () => play([{ freq: 440, dur: 0.12, type: 'sine', gain: 0.14 }]),
  go: () => play([{ freq: 880, dur: 0.25, type: 'triangle', gain: 0.16 }]),
  tick: () => play([{ freq: 1200, dur: 0.03, type: 'square', gain: 0.03 }]),
  finish: () =>
    play([0, 4, 7, 12, 16].map((semi, i) => ({ freq: 523 * Math.pow(2, semi / 12), dur: 0.18, type: 'triangle' as const, gain: 0.12, delay: i * 0.08 }))),
};
