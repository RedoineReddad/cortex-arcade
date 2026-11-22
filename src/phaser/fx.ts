/**
 * Shared "juice" for scenes — Phaser 4 only APIs: Filters (Glow/Blur/Vignette),
 * setTint().setTintMode(), native Gradient objects, particle bursts, camera shake.
 */
import * as Phaser from 'phaser';
import { sfx } from '../audio/sfx';
import { fontPx, viewport, type Viewport } from './layout';
import { THEME, css } from './theme';

export const TEX = {
  dot: 'fx-dot',
  round: (dpr: number) => `fx-round@${dpr}`,
};

/** Generate the few white textures we tint everywhere. Idempotent. */
export function ensureTextures(scene: Phaser.Scene) {
  const vp = viewport(scene);
  if (!scene.textures.exists(TEX.dot)) {
    const g = scene.make.graphics({}, false);
    g.fillStyle(0xffffff, 1).fillCircle(16, 16, 16);
    g.generateTexture(TEX.dot, 32, 32);
    g.destroy();
  }
  const roundKey = TEX.round(vp.dpr);
  if (!scene.textures.exists(roundKey)) {
    const r = Math.round(vp.u(18));
    const size = r * 2 + 4;
    const g = scene.make.graphics({}, false);
    g.fillStyle(0xffffff, 1).fillRoundedRect(0, 0, size, size, r);
    g.generateTexture(roundKey, size, size);
    g.destroy();
  }
}

/** Full-screen vertical Gradient background plus a soft radial accent glow. */
export function addBackground(scene: Phaser.Scene, accent: number): Phaser.GameObjects.Gradient[] {
  const { w, h } = viewport(scene);
  const c = (n: number, a = 1) => [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a];
  const sky = scene.add
    .gradient(
      {
        bands: [{ start: 0, end: 1, colorStart: c(THEME.bgTop), colorEnd: c(THEME.bgBottom), interpolation: 2 }],
        shapeMode: 0,
        start: { x: 0, y: 0 },
        shape: { x: 0, y: 1 },
        dither: true,
      },
      0,
      0,
      w,
      h,
    )
    .setOrigin(0, 0)
    .setDepth(-100);
  const halo = scene.add
    .gradient(
      {
        bands: [{ start: 0, end: 1, colorStart: c(accent, 0.28), colorEnd: c(accent, 0), interpolation: 3 }],
        shapeMode: 2,
        repeatMode: 0,
        start: { x: 0.5, y: 0.32 },
        shape: { x: 0.62, y: 0 },
      },
      0,
      0,
      w,
      h,
    )
    .setOrigin(0, 0)
    .setDepth(-99);
  return [sky, halo];
}

export function burst(scene: Phaser.Scene, x: number, y: number, color: number, count = 18, power = 1) {
  const vp = viewport(scene);
  const emitter = scene.add.particles(x, y, TEX.dot, {
    speed: { min: vp.u(120) * power, max: vp.u(360) * power },
    angle: { min: 0, max: 360 },
    scale: { start: vp.u(0.32), end: 0 },
    alpha: { start: 1, end: 0 },
    lifespan: { min: 350, max: 700 },
    gravityY: vp.u(500),
    tint: [color, 0xffffff, color],
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });
  emitter.setDepth(50);
  emitter.explode(count);
  scene.time.delayedCall(900, () => emitter.destroy());
}

/** "+240" style text that floats up and fades. */
export function floatText(scene: Phaser.Scene, x: number, y: number, text: string, color: number, size = 26) {
  const vp = viewport(scene);
  const t = scene.add
    .text(x, y, text, { fontFamily: THEME.font, color: css(color), ...fontPx(size, vp) })
    .setOrigin(0.5)
    .setDepth(60);
  scene.tweens.add({ targets: t, y: y - vp.u(56), alpha: 0, scale: 1.15, duration: 700, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  return t;
}

export function shake(scene: Phaser.Scene, intensity = 0.012, duration = 180) {
  scene.cameras.main.shake(duration, intensity);
}

/** Quick squash-and-stretch pop. */
export function pop(scene: Phaser.Scene, target: Phaser.GameObjects.Components.Transform, amount = 1.12, duration = 90) {
  scene.tweens.killTweensOf(target);
  (target as unknown as { setScale(n: number): void }).setScale(1);
  scene.tweens.add({ targets: target, scale: amount, duration, yoyo: true, ease: 'Quad.easeOut' });
}

/** Horizontal "no" wobble. */
export function wobble(scene: Phaser.Scene, target: Phaser.GameObjects.Components.Transform, distance: number) {
  const x0 = target.x;
  scene.tweens.add({
    targets: target,
    x: { from: x0 - distance, to: x0 },
    duration: 260,
    ease: 'Elastic.easeOut',
    easeParams: [1.2, 0.3],
  });
}

type Tintable = Phaser.GameObjects.GameObject & {
  setTint(c?: number): unknown;
  setTintMode(m?: Phaser.TintModes): unknown;
  clearTint?(): unknown;
};

/** Flash a tintable object to a solid colour (Phaser 4 FILL tint mode), then restore. */
export function flashFill(scene: Phaser.Scene, obj: Tintable, color: number, restoreTint: number, ms = 90) {
  obj.setTint(color);
  obj.setTintMode(Phaser.TintModes.FILL);
  scene.time.delayedCall(ms, () => {
    if (!obj.active) return;
    obj.setTintMode(Phaser.TintModes.MULTIPLY);
    obj.setTint(restoreTint);
  });
}

/**
 * Add a Glow filter to any game object. It starts inactive: filters cost a render pass each,
 * so they only run while a pulse is animating.
 */
export function addGlow(obj: Phaser.GameObjects.GameObject & { enableFilters(): unknown; filters: Phaser.Types.GameObjects.FiltersInternalExternal | null }, color: number, strength = 0) {
  obj.enableFilters();
  const glow = obj.filters?.internal.addGlow(color, strength, 0, 1, false, 10, 10) ?? null;
  glow?.setActive(strength > 0);
  return glow;
}

export function pulseGlow(scene: Phaser.Scene, glow: Phaser.Filters.Glow | null, color: number, peak = 6, duration = 380) {
  if (!glow) return;
  glow.color = color;
  scene.tweens.killTweensOf(glow);
  glow.outerStrength = peak;
  glow.setActive(true);
  scene.tweens.add({ targets: glow, outerStrength: 0, duration, ease: 'Cubic.easeOut', onComplete: () => glow.setActive(false) });
}

/** Red/green screen-edge pulse using a camera Vignette filter. */
export class EdgePulse {
  private vignette: Phaser.Filters.Vignette | null;
  private scene: Phaser.Scene;
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.vignette = scene.cameras.main.filters?.external.addVignette(0.5, 0.5, 0.95, 0, THEME.bad) ?? null;
    this.vignette?.setActive(false);
  }
  pulse(color: number, strength = 0.55) {
    const v = this.vignette;
    if (!v) return;
    v.color.setFromRGB(Phaser.Display.Color.IntegerToRGB(color));
    this.scene.tweens.killTweensOf(v);
    v.strength = strength;
    v.setActive(true);
    this.scene.tweens.add({ targets: v, strength: 0, duration: 420, ease: 'Quad.easeOut', onComplete: () => v.setActive(false) });
  }
}

/**
 * 3-2-1-GO countdown. The camera is blurred (Blur filter) and sharpens as the count runs,
 * so the board "comes into focus" right as play starts.
 */
export function countdown(scene: Phaser.Scene, onDone: () => void) {
  const vp: Viewport = viewport(scene);
  const cam = scene.cameras.main;
  const blur = cam.filters?.internal.addBlur(0, 2, 2, 1.6) ?? null;
  const label = scene.add
    .text(vp.cx, vp.h * 0.42, '3', { fontFamily: THEME.font, color: css(THEME.ink), ...fontPx(120, vp) })
    .setOrigin(0.5)
    .setDepth(100);
  const glow = addGlow(label, THEME.accent, 4);
  const steps = ['3', '2', '1', 'GO!'];
  let i = 0;
  const show = () => {
    label.setText(steps[i]);
    label.setScale(1.6).setAlpha(0);
    scene.tweens.add({ targets: label, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
    if (steps[i] === 'GO!') {
      sfx.go();
      label.setColor(css(THEME.good));
      if (glow) glow.color = THEME.good;
    } else sfx.count();
    if (blur) scene.tweens.add({ targets: blur, strength: Math.max(0, 1.6 - (i + 1) * 0.55), duration: 400 });
  };
  show();
  scene.time.addEvent({
    delay: 600,
    repeat: steps.length - 1,
    callback: () => {
      i++;
      if (i < steps.length) {
        show();
        return;
      }
      if (blur) cam.filters?.internal.remove(blur);
      scene.tweens.add({ targets: label, alpha: 0, scale: 1.4, duration: 200, onComplete: () => label.destroy() });
      onDone();
    },
  });
}

/** A rounded, tintable, tactile button (NineSlice + Text inside a Container). */
export class TactileButton extends Phaser.GameObjects.Container {
  readonly bg: Phaser.GameObjects.NineSlice;
  readonly label: Phaser.GameObjects.Text;
  private baseColor: number;
  private pressedAt = 0;

  constructor(
    scene: Phaser.Scene,
    opts: { text: string; color: number; textColor?: number; fontSize?: number; onPress: () => void },
  ) {
    super(scene, 0, 0);
    const vp = viewport(scene);
    const key = TEX.round(vp.dpr);
    const slice = Math.round(vp.u(18)) + 1;
    this.baseColor = opts.color;
    this.bg = scene.add.nineslice(0, 0, key, undefined, 100, 100, slice, slice, slice, slice).setTint(opts.color);
    this.label = scene.add
      .text(0, 0, opts.text, { fontFamily: THEME.font, color: css(opts.textColor ?? THEME.ink), ...fontPx(opts.fontSize ?? 30, vp) })
      .setOrigin(0.5);
    this.add([this.bg, this.label]);
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerdown', () => {
      this.pressedAt = scene.time.now;
      this.press();
      opts.onPress();
    });
    scene.add.existing(this);
  }

  setColor(color: number) {
    this.baseColor = color;
    this.bg.setTintMode(Phaser.TintModes.MULTIPLY).setTint(color);
    return this;
  }

  setBox(x: number, y: number, w: number, h: number) {
    this.setPosition(x + w / 2, y + h / 2);
    this.bg.setSize(w, h);
    this.bg.input?.hitArea.setTo(0, 0, w, h);
    return this;
  }

  /** Visual + audio press feedback; also used for keyboard presses. */
  press(flashColor = 0xffffff) {
    sfx.tap();
    flashFill(this.scene, this.bg, flashColor, this.baseColor, 70);
    this.scene.tweens.killTweensOf(this);
    this.setScale(0.92);
    this.scene.tweens.add({ targets: this, scale: 1, duration: 160, ease: 'Back.easeOut' });
  }

  get lastPressed() {
    return this.pressedAt;
  }
}
