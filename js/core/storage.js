// Persistence: every play is stored as {g: gameId, s: score, r: rating(0-100), t: timestamp}.
import { todayKey } from './util.js';

const KEY = 'cortex.v1';
let mem = { plays: [], daily: {} };

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) mem = Object.assign({ plays: [], daily: {} }, JSON.parse(raw));
  } catch {}
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch {}
}
load();

export function recordPlay(g, s, r) {
  mem.plays.push({ g, s, r, t: Date.now() });
  if (mem.plays.length > 3000) mem.plays.splice(0, mem.plays.length - 3000);
  save();
}

export const playsOf = (g) => mem.plays.filter((p) => p.g === g);
export const allPlays = () => mem.plays;

export function best(g) {
  const p = playsOf(g);
  return p.length ? Math.max(...p.map((x) => x.s)) : null;
}

export function lastRating(g) {
  const p = playsOf(g);
  return p.length ? p[p.length - 1].r : null;
}

/** Difficulty level 1..5 adapted from the average of the last 3 ratings. */
export function levelFor(g) {
  const p = playsOf(g).slice(-3);
  if (!p.length) return 1;
  const avg = p.reduce((a, x) => a + x.r, 0) / p.length;
  return Math.max(1, Math.min(5, 1 + Math.floor(avg / 22)));
}

export function getDaily(day = todayKey()) { return mem.daily[day] || null; }
export function setDaily(day, data) { mem.daily[day] = data; save(); }
export const allDaily = () => mem.daily;

export function streak() {
  const days = new Set(mem.plays.map((p) => todayKey(new Date(p.t))));
  let n = 0;
  const d = new Date();
  if (!days.has(todayKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(todayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export function resetAll() { mem = { plays: [], daily: {} }; save(); }
export function exportData() { return JSON.stringify(mem); }
