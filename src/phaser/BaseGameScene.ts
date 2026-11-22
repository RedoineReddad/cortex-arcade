import * as Phaser from 'phaser';
import { gameBus } from '../bridge/gameBus';
import type { GameMeta, GameResult } from '../core/types';
import { addBackground, countdown, ensureTextures } from './fx';
import { viewport, type Viewport } from './layout';

export interface GameSceneData {
  seed: number;
}

/**
 * Lifecycle shared by every mini-game scene:
 *   init(seed) -> build() -> layout() -> countdown -> begin() -> ... -> finishWith(result)
 * Subclasses stay thin: they own a logic Store, render it and add juice.
 */
export abstract class BaseGameScene extends Phaser.Scene {
  protected seed = 1;
  protected vp!: Viewport;
  private bg: Phaser.GameObjects.GameObject[] = [];
  private finished = false;
  private resizeHandler = () => this.relayout();

  protected readonly meta: GameMeta;

  protected constructor(meta: GameMeta) {
    super(meta.sceneKey);
    this.meta = meta;
  }

  /** Precise clock for logic timing (reaction times). */
  protected now() {
    return performance.now();
  }

  init(data: Partial<GameSceneData>) {
    this.seed = data.seed ?? 1;
    this.finished = false;
  }

  create() {
    this.vp = viewport(this);
    ensureTextures(this);
    this.bg = addBackground(this, Phaser.Display.Color.HexStringToColor(this.meta.accent).color);
    this.build();
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.resizeHandler);
      this.teardown();
    });
    gameBus.emit('game:ready', { gameId: this.meta.id });
    countdown(this, () => this.begin());
  }

  private relayout() {
    if (!this.sys.isActive()) return;
    this.vp = viewport(this);
    this.cameras.main.setSize(this.vp.w, this.vp.h);
    for (const o of this.bg) o.destroy();
    this.bg = addBackground(this, Phaser.Display.Color.HexStringToColor(this.meta.accent).color);
    this.layout();
  }

  /** Report the result once, after a short beat so the last feedback can land. */
  protected finishWith(result: GameResult, delayMs = 700) {
    if (this.finished) return;
    this.finished = true;
    this.time.delayedCall(delayMs, () => {
      this.cameras.main.fadeOut(250, 11, 13, 31);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => gameBus.emit('game:complete', result));
    });
  }

  /** Create game objects (sizes may be placeholders; layout() positions them). */
  protected abstract build(): void;
  /** Position/size everything from this.vp. Called on create and on every resize. */
  protected abstract layout(): void;
  /** Countdown finished: dispatch the logic 'start' action. */
  protected abstract begin(): void;
  /** Remove keyboard listeners etc. */
  protected teardown(): void {}
}
