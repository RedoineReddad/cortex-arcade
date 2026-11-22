import * as Phaser from 'phaser';
import { sfx } from '../../audio/sfx';
import { createStore, type Store } from '../../core/store';
import { BaseGameScene } from '../../phaser/BaseGameScene';
import { EdgePulse, TEX, TactileButton, addGlow, burst, floatText, flashFill, pop, pulseGlow, shake, wobble } from '../../phaser/fx';
import { fontPx } from '../../phaser/layout';
import { THEME, css } from '../../phaser/theme';
import {
  COLORS,
  createInitialState,
  reduce,
  timeLeftMs,
  toResult,
  windowLeft,
  type ColorControlAction,
  type ColorControlEvent,
  type ColorControlState,
  type Rule,
  type StroopColor,
} from './logic';
import { colorControlMeta } from './meta';

export const INK: Record<StroopColor, number> = {
  red: 0xff4d5e,
  blue: 0x3d8bff,
  green: 0x2fd37a,
  yellow: 0xffd23f,
};

const KEYMAP: Record<string, StroopColor> = { r: 'red', b: 'blue', g: 'green', y: 'yellow', '1': 'red', '2': 'blue', '3': 'green', '4': 'yellow' };

export class ColorControlScene extends BaseGameScene {
  private store!: Store<ColorControlState, ColorControlAction, ColorControlEvent>;
  private unsub: (() => void) | null = null;

  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private ruleBg!: Phaser.GameObjects.NineSlice;
  private ruleText!: Phaser.GameObjects.Text;
  private ruleHint!: Phaser.GameObjects.Text;
  private wordText!: Phaser.GameObjects.Text;
  private wordGlow: Phaser.Filters.Glow | null = null;
  private comboText!: Phaser.GameObjects.Text;
  private bar!: Phaser.GameObjects.Graphics;
  private buttons = new Map<StroopColor, TactileButton>();
  private edge!: EdgePulse;
  private revealedTrial = -1;
  private wordY = 0;
  private barY = 0;
  private lastSpeedBucket = 0;

  constructor() {
    super(colorControlMeta);
  }

  protected build() {
    this.store = createStore(reduce, createInitialState(this.seed));
    this.unsub = this.store.subscribe((state, events) => this.onEvents(state, events));
    this.revealedTrial = -1;
    this.lastSpeedBucket = 0;
    const vp = this.vp;
    const text = (size: number, color: number = THEME.ink) => ({ fontFamily: THEME.font, color: css(color), ...fontPx(size, vp) });
    const slice = Math.round(vp.u(18)) + 1;

    this.scoreText = this.add.text(0, 0, '0', text(22)).setOrigin(0, 0.5);
    this.timeText = this.add.text(0, 0, '45s', text(22)).setOrigin(1, 0.5);
    this.ruleBg = this.add.nineslice(0, 0, TEX.round(vp.dpr), undefined, 100, 100, slice, slice, slice, slice).setTint(THEME.panel);
    this.ruleText = this.add.text(0, 0, 'INK', text(34)).setOrigin(0.5);
    this.ruleHint = this.add.text(0, 0, '', text(16)).setOrigin(0.5).setAlpha(0.85);
    this.wordText = this.add.text(0, 0, '', text(84)).setOrigin(0.5).setAlpha(0);
    this.wordGlow = addGlow(this.wordText, THEME.ink, 0);
    this.comboText = this.add.text(0, 0, '', text(18, THEME.gold)).setOrigin(0.5).setAlpha(0);
    this.bar = this.add.graphics();

    for (const c of COLORS) {
      this.buttons.set(
        c,
        new TactileButton(this, {
          text: c.toUpperCase(),
          color: INK[c],
          textColor: 0x10122a,
          fontSize: 24,
          onPress: () => this.respond(c),
        }),
      );
    }
    this.input.keyboard?.on('keydown', this.onKeyboard, this);
    this.edge = new EdgePulse(this);
    this.setRule('ink', false);
  }

  protected layout() {
    const { u, w, h, colW, colX, top } = this.vp;
    this.scoreText.setPosition(colX, top);
    this.timeText.setPosition(colX + colW, top);

    const ruleW = Math.min(colW, u(320));
    const ruleH = u(64);
    const ruleY = top + u(64);
    this.ruleBg.setSize(ruleW, ruleH).setPosition(w / 2, ruleY);
    this.ruleText.setPosition(w / 2, ruleY - u(6));
    this.ruleHint.setPosition(w / 2, ruleY + u(18));

    const gap = u(12);
    const btnH = Math.max(u(56), Math.min(u(96), h * 0.12));
    const btnW = (colW - gap) / 2;
    const gridTop = h - u(24) - btnH * 2 - gap;
    COLORS.forEach((c, i) => {
      this.buttons.get(c)!.setBox(colX + (i % 2) * (btnW + gap), gridTop + Math.floor(i / 2) * (btnH + gap), btnW, btnH);
    });

    const midTop = ruleY + ruleH / 2;
    const midH = gridTop - midTop;
    this.wordY = midTop + midH * 0.45;
    this.barY = midTop + midH * 0.78;
    this.comboText.setPosition(w / 2, midTop + midH * 0.12);
    const wordSize = Math.min(84, Math.max(44, (colW / this.vp.dpr) * 0.2));
    this.wordText.setFontSize(Math.round(u(wordSize))).setPosition(w / 2, this.wordY);
    this.drawBar(1, THEME.ink);
  }

  protected begin() {
    this.store.dispatch({ type: 'start', now: this.now() });
  }

  protected teardown() {
    this.unsub?.();
    this.unsub = null;
    this.input.keyboard?.off('keydown', this.onKeyboard, this);
    this.buttons.clear();
  }

  update() {
    const s = this.store?.getState();
    if (!s || s.phase !== 'playing') return;
    const now = this.now();
    this.store.dispatch({ type: 'tick', now });
    const st = this.store.getState();
    if (st.phase !== 'playing' || !st.trial) return;
    this.timeText.setText(`${Math.ceil(timeLeftMs(st, now) / 1000)}s`);
    if (now >= st.trial.shownAt && this.revealedTrial !== st.trial.index) this.reveal(st);
    const left = windowLeft(st, now);
    this.drawBar(left, left < 0.3 ? THEME.bad : left < 0.6 ? THEME.gold : THEME.good);
  }

  // ---------------------------------------------------------------- input

  private respond(color: StroopColor) {
    this.store.dispatch({ type: 'respond', color, now: this.now() });
  }

  private onKeyboard(e: KeyboardEvent) {
    const c = KEYMAP[e.key.toLowerCase()];
    if (!c) return;
    e.preventDefault();
    this.buttons.get(c)?.press();
    this.respond(c);
  }

  // ---------------------------------------------------------------- rendering

  private setRule(rule: Rule, animate: boolean) {
    const isInk = rule === 'ink';
    this.ruleText.setText(isInk ? 'INK' : 'WORD');
    this.ruleHint.setText(isInk ? 'tap the colour of the letters' : 'tap what the word says');
    this.ruleBg.setTintMode(Phaser.TintModes.MULTIPLY).setTint(isInk ? 0x5b4bd6 : 0x1f7a8c);
    if (!animate) return;
    flashFill(this, this.ruleBg, 0xffffff, isInk ? 0x5b4bd6 : 0x1f7a8c, 120);
    this.tweens.killTweensOf([this.ruleBg, this.ruleText]);
    this.ruleBg.setScale(1, 1);
    this.tweens.add({ targets: [this.ruleBg, this.ruleText, this.ruleHint], scaleY: { from: 0.2, to: 1 }, duration: 220, ease: 'Back.easeOut' });
    floatText(this, this.vp.cx, this.ruleBg.y - this.vp.u(44), 'SWITCH!', THEME.gold, 20);
    sfx.combo(false);
  }

  private reveal(s: ColorControlState) {
    const t = s.trial!;
    this.revealedTrial = t.index;
    this.wordText.setText(t.word.toUpperCase()).setColor(css(INK[t.ink]));
    this.tweens.killTweensOf(this.wordText);
    this.wordText.setPosition(this.vp.cx, this.wordY).setAlpha(1).setScale(0.6);
    this.tweens.add({ targets: this.wordText, scale: 1, duration: 140, ease: 'Back.easeOut' });
  }

  private drawBar(fraction: number, color: number) {
    const { u, colW, cx } = this.vp;
    const bw = Math.min(colW, u(320));
    const bh = u(10);
    this.bar.clear();
    this.bar.fillStyle(THEME.panel, 1).fillRoundedRect(cx - bw / 2, this.barY - bh / 2, bw, bh, bh / 2);
    if (fraction > 0.01) this.bar.fillStyle(color, 1).fillRoundedRect(cx - bw / 2, this.barY - bh / 2, bw * fraction, bh, bh / 2);
  }

  private hideWord() {
    this.tweens.killTweensOf(this.wordText);
    this.tweens.add({ targets: this.wordText, alpha: 0, scale: 0.85, duration: 120 });
  }

  private onEvents(state: ColorControlState, events: ColorControlEvent[]) {
    const { u } = this.vp;
    const prev = state.responses[state.responses.length - 1];
    for (const e of events) {
      switch (e.type) {
        case 'correct': {
          sfx.correct(e.streak);
          const btn = this.buttons.get(prev.trial.answer)!;
          burst(this, btn.x, btn.y, INK[prev.trial.answer], 14 + Math.min(e.streak, 10));
          burst(this, this.vp.cx, this.wordY, INK[prev.trial.ink], 10, 0.7);
          pulseGlow(this, this.wordGlow, THEME.good, 6, 260);
          floatText(this, this.vp.cx, this.wordY - u(60), `+${e.points}`, THEME.good);
          this.hideWord();
          break;
        }
        case 'wrong': {
          sfx.wrong();
          shake(this, 0.01, 200);
          this.edge.pulse(THEME.bad);
          wobble(this, this.wordText, u(18));
          const right = this.buttons.get(e.expected)!;
          flashFill(this, right.bg, 0xffffff, INK[e.expected], 260);
          pop(this, right, 1.08, 140);
          this.time.delayedCall(260, () => this.hideWord());
          if (e.lostStreak >= 3) this.flashCombo('combo lost', THEME.inkMuted);
          break;
        }
        case 'timeout': {
          sfx.wrong();
          this.edge.pulse(THEME.gold, 0.45);
          floatText(this, this.vp.cx, this.wordY - u(60), 'Too slow!', THEME.gold, 24);
          const right = this.buttons.get(e.expected)!;
          flashFill(this, right.bg, 0xffffff, INK[e.expected], 260);
          this.hideWord();
          if (e.lostStreak >= 3) this.flashCombo('combo lost', THEME.inkMuted);
          break;
        }
        case 'combo':
          this.flashCombo(`${e.streak} IN A ROW`, THEME.gold, e.milestone);
          if (e.milestone) {
            sfx.combo(true);
            burst(this, this.comboText.x, this.comboText.y, THEME.gold, 30, 1.1);
          }
          break;
        case 'speed': {
          // Announce each 250ms step of speed-up.
          const bucket = Math.floor((state.config.startWindowMs - e.windowMs) / 250);
          if (e.faster && bucket > this.lastSpeedBucket) {
            this.lastSpeedBucket = bucket;
            floatText(this, this.vp.cx, this.barY + u(26), 'FASTER', THEME.accent, 16);
          }
          break;
        }
        case 'trial':
          if (e.trial.switched) this.setRule(e.trial.rule, true);
          else if (e.trial.index === 0) this.setRule(e.trial.rule, false);
          break;
        case 'finished':
          sfx.finish();
          this.wordText.setText("Time's up!").setColor(css(THEME.ink)).setAlpha(1).setScale(0.6);
          this.tweens.add({ targets: this.wordText, scale: 1, duration: 200, ease: 'Back.easeOut' });
          this.drawBar(0, THEME.ink);
          this.timeText.setText('0s');
          burst(this, this.vp.cx, this.wordY, THEME.gold, 40, 1.4);
          this.finishWith(toResult(state));
          break;
        default:
          break;
      }
    }
    this.scoreText.setText(String(state.score));
  }

  private flashCombo(label: string, color: number, big = false) {
    this.comboText.setText(label).setColor(css(color));
    this.tweens.killTweensOf(this.comboText);
    this.comboText.setAlpha(1).setScale(1);
    pop(this, this.comboText, big ? 1.35 : 1.12, big ? 150 : 90);
    this.tweens.add({ targets: this.comboText, alpha: 0, delay: 650, duration: 300 });
  }
}
