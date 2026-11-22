import * as Phaser from 'phaser';
import { sfx } from '../../audio/sfx';
import { createStore, type Store } from '../../core/store';
import { BaseGameScene } from '../../phaser/BaseGameScene';
import { EdgePulse, TEX, TactileButton, addGlow, burst, floatText, pop, pulseGlow, shake, wobble } from '../../phaser/fx';
import { fontPx } from '../../phaser/layout';
import { THEME, css } from '../../phaser/theme';
import {
  clockMs,
  createInitialState,
  currentProblem,
  reduce,
  toResult,
  type SpeedMathAction,
  type SpeedMathEvent,
  type SpeedMathState,
} from './logic';
import { speedMathMeta } from './meta';

type KeyId = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'back' | 'enter';
const KEY_ORDER: KeyId[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'enter'];

export class SpeedMathScene extends BaseGameScene {
  private store!: Store<SpeedMathState, SpeedMathAction, SpeedMathEvent>;
  private unsub: (() => void) | null = null;

  private progressText!: Phaser.GameObjects.Text;
  private clockText!: Phaser.GameObjects.Text;
  private penaltyText!: Phaser.GameObjects.Text;
  private pips!: Phaser.GameObjects.Graphics;
  private comboText!: Phaser.GameObjects.Text;
  private comboGlow: Phaser.Filters.Glow | null = null;
  private problemText!: Phaser.GameObjects.Text;
  private answerBox!: Phaser.GameObjects.NineSlice;
  private answerText!: Phaser.GameObjects.Text;
  private answerGlow: Phaser.Filters.Glow | null = null;
  private keys = new Map<KeyId, TactileButton>();
  private edge!: EdgePulse;
  private problemY = 0;
  private answerY = 0;

  constructor() {
    super(speedMathMeta);
  }

  protected build() {
    this.store = createStore(reduce, createInitialState(this.seed));
    this.unsub = this.store.subscribe((state, events) => this.onEvents(state, events));
    const vp = this.vp;
    const text = (size: number, color: number = THEME.ink, weight: 400 | 700 = 700) => ({
      fontFamily: THEME.font,
      color: css(color),
      ...fontPx(size, vp, weight),
    });

    this.progressText = this.add.text(0, 0, '1 / 20', text(18, THEME.inkMuted)).setOrigin(0, 0.5);
    this.clockText = this.add.text(0, 0, '0.0s', text(22)).setOrigin(1, 0.5);
    this.penaltyText = this.add.text(0, 0, '', text(15, THEME.bad)).setOrigin(1, 0.5);
    this.pips = this.add.graphics();
    this.comboText = this.add.text(0, 0, '', text(20, THEME.gold)).setOrigin(0.5).setAlpha(0);
    this.comboGlow = addGlow(this.comboText, THEME.gold, 0);

    this.problemText = this.add.text(0, 0, '', text(64)).setOrigin(0.5);
    const slice = Math.round(vp.u(18)) + 1;
    this.answerBox = this.add.nineslice(0, 0, TEX.round(vp.dpr), undefined, 100, 100, slice, slice, slice, slice);
    this.answerText = this.add.text(0, 0, '?', text(56, THEME.inkMuted)).setOrigin(0.5);
    this.answerGlow = addGlow(this.answerText, THEME.good, 0);

    for (const id of KEY_ORDER) {
      const label = id === 'back' ? '⌫' : id === 'enter' ? '✓' : id;
      const color = id === 'enter' ? 0x2c8a5c : id === 'back' ? THEME.panelHi : THEME.panel;
      this.keys.set(id, new TactileButton(this, { text: label, color, fontSize: id.length > 1 ? 28 : 32, onPress: () => this.onKey(id) }));
    }

    this.input.keyboard?.on('keydown', this.onKeyboard, this);
    this.edge = new EdgePulse(this);
    this.renderState(this.store.getState());
  }

  protected layout() {
    const { u, w, h, colW, colX, top } = this.vp;

    this.progressText.setPosition(colX, top);
    this.clockText.setPosition(colX + colW, top);
    this.penaltyText.setPosition(colX + colW, top + u(24));
    this.comboText.setPosition(w / 2, top + u(52));

    // Keypad anchored to the bottom; everything else shares what is left.
    const gap = u(10);
    const keypadBottom = h - u(20);
    const spaceForKeys = h * 0.5;
    const keyH = Math.max(u(44), Math.min(u(74), (spaceForKeys - gap * 3) / 4));
    const keyW = (colW - gap * 2) / 3;
    const keypadTop = keypadBottom - (keyH * 4 + gap * 3);
    KEY_ORDER.forEach((id, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      this.keys.get(id)!.setBox(colX + col * (keyW + gap), keypadTop + row * (keyH + gap), keyW, keyH);
    });

    const midTop = top + u(80);
    const midH = Math.max(u(120), keypadTop - midTop - u(12));
    this.problemY = midTop + midH * 0.32;
    this.answerY = midTop + midH * 0.76;
    const problemSize = Math.min(64, Math.max(36, (midH / this.vp.dpr) * 0.3));
    this.problemText.setFontSize(Math.round(u(problemSize))).setPosition(w / 2, this.problemY);

    const boxW = Math.min(colW * 0.62, u(240));
    const boxH = Math.min(u(84), midH * 0.38);
    this.answerBox.setSize(boxW, boxH).setPosition(w / 2, this.answerY).setTint(THEME.panel);
    this.answerText.setFontSize(Math.round(Math.min(u(56), boxH * 0.7))).setPosition(w / 2, this.answerY);
    this.drawPips(this.store.getState());
  }

  protected begin() {
    this.store.dispatch({ type: 'start', now: this.now() });
  }

  protected teardown() {
    this.unsub?.();
    this.unsub = null;
    this.input.keyboard?.off('keydown', this.onKeyboard, this);
    this.keys.clear();
  }

  update() {
    const s = this.store?.getState();
    if (!s || s.phase !== 'playing') return;
    const now = this.now();
    this.store.dispatch({ type: 'tick', now });
    this.clockText.setText(`${(clockMs(this.store.getState(), now) / 1000).toFixed(1)}s`);
  }

  // ---------------------------------------------------------------- input

  private onKey(id: KeyId) {
    const now = this.now();
    if (id === 'back') this.store.dispatch({ type: 'backspace' });
    else if (id === 'enter') this.store.dispatch({ type: 'submit', now });
    else this.store.dispatch({ type: 'digit', digit: Number(id), now });
  }

  private onKeyboard(e: KeyboardEvent) {
    let id: KeyId | null = null;
    if (/^[0-9]$/.test(e.key)) id = e.key as KeyId;
    else if (e.key === 'Backspace' || e.key === 'Delete') id = 'back';
    else if (e.key === 'Enter') id = 'enter';
    if (!id) return;
    e.preventDefault();
    this.keys.get(id)?.press();
    this.onKey(id);
  }

  // ---------------------------------------------------------------- rendering

  private renderState(s: SpeedMathState) {
    const p = currentProblem(s);
    this.problemText.setText(p ? `${p.text} =` : '');
    this.answerText.setText(s.input || '?').setColor(css(s.input ? THEME.ink : THEME.inkMuted));
    this.progressText.setText(`${Math.min(s.index + 1, s.config.problemCount)} / ${s.config.problemCount}`);
    this.penaltyText.setText(s.penaltyMs ? `+${s.penaltyMs / 1000}s penalty` : '');
    this.drawPips(s);
  }

  private drawPips(s: SpeedMathState) {
    const { u, colW, colX, top } = this.vp;
    const n = s.config.problemCount;
    const y = top + u(28);
    const gap = u(3);
    const pw = (colW * 0.55 - gap * (n - 1)) / n;
    this.pips.clear();
    for (let i = 0; i < n; i++) {
      const a = s.attempts[i];
      const color = a ? (a.correct ? THEME.good : THEME.bad) : i === s.index ? THEME.ink : THEME.panelHi;
      this.pips.fillStyle(color, a || i === s.index ? 1 : 0.8).fillRoundedRect(colX + i * (pw + gap), y - u(3), pw, u(6), u(3));
    }
  }

  private onEvents(state: SpeedMathState, events: SpeedMathEvent[]) {
    const { u } = this.vp;
    let advanced = false;
    for (const e of events) {
      switch (e.type) {
        case 'input':
          pop(this, this.answerText, 1.15, 70);
          break;
        case 'rejected':
          wobble(this, this.answerText, u(8));
          break;
        case 'correct': {
          sfx.correct(e.streak);
          pulseGlow(this, this.answerGlow, THEME.good, 8);
          this.answerBox.setTint(0x1f6b49);
          this.time.delayedCall(160, () => this.answerBox.active && this.answerBox.setTint(THEME.panel));
          burst(this, this.vp.cx, this.answerY, THEME.good, 14 + Math.min(e.streak, 10) * 2);
          floatText(this, this.vp.cx + this.answerBox.width * 0.5, this.answerY - u(30), `+${e.points}`, THEME.good);
          break;
        }
        case 'wrong': {
          sfx.wrong();
          shake(this, 0.01, 200);
          this.edge.pulse(THEME.bad);
          wobble(this, this.answerBox, u(16));
          // Ghost of the missed problem with the right answer, floating up above the new problem.
          const prev = state.attempts[state.attempts.length - 1];
          const ghostY = this.problemY - u(64);
          const ghost = this.add
            .text(this.vp.cx, ghostY, `${prev.problem.text} = ${e.expected}`, {
              fontFamily: THEME.font,
              color: css(THEME.bad),
              ...fontPx(26, this.vp),
            })
            .setOrigin(0.5)
            .setDepth(40);
          this.tweens.add({ targets: ghost, y: ghostY - u(36), alpha: 0, delay: 700, duration: 450, onComplete: () => ghost.destroy() });
          floatText(this, this.clockText.x - this.clockText.width - u(24), this.clockText.y, `+${e.penaltyMs / 1000}s`, THEME.bad, 22);
          this.clockText.setColor(css(THEME.bad));
          this.time.delayedCall(400, () => this.clockText.active && this.clockText.setColor(css(THEME.ink)));
          if (e.lostStreak >= 3) this.hideCombo(true);
          break;
        }
        case 'combo':
          this.showCombo(e.streak, e.multiplier, e.milestone);
          break;
        case 'next':
          advanced = true;
          break;
        case 'finished':
          sfx.finish();
          this.problemText.setText(e.reason === 'timeout' ? "Time's up!" : 'Done!');
          this.answerText.setText('');
          burst(this, this.vp.cx, this.problemY, THEME.gold, 40, 1.4);
          this.finishWith(toResult(state));
          break;
        default:
          break;
      }
    }
    this.renderState(state);
    if (advanced && state.attempts.length > 0) this.slideInProblem();
  }

  private slideInProblem() {
    const { u, cx } = this.vp;
    this.tweens.killTweensOf(this.problemText);
    this.problemText.setPosition(cx + u(60), this.problemY).setAlpha(0).setScale(1);
    this.tweens.add({ targets: this.problemText, x: cx, alpha: 1, duration: 170, ease: 'Cubic.easeOut' });
  }

  private showCombo(streak: number, multiplier: number, milestone: boolean) {
    this.comboText.setText(`${streak} IN A ROW  ×${multiplier.toFixed(1)}`);
    this.tweens.killTweensOf(this.comboText);
    this.comboText.setAlpha(1);
    pop(this, this.comboText, milestone ? 1.4 : 1.15, milestone ? 160 : 100);
    pulseGlow(this, this.comboGlow, THEME.gold, milestone ? 10 : 4, milestone ? 700 : 350);
    if (milestone) {
      sfx.combo(true);
      burst(this, this.comboText.x, this.comboText.y, THEME.gold, 36, 1.2);
    }
  }

  private hideCombo(broken: boolean) {
    if (broken) this.comboText.setText('combo lost').setColor(css(THEME.inkMuted));
    this.tweens.add({
      targets: this.comboText,
      alpha: 0,
      delay: 300,
      duration: 400,
      onComplete: () => this.comboText.active && this.comboText.setColor(css(THEME.gold)),
    });
  }
}
