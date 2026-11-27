import type { Sfx } from '../audio/sfx';
import { copyBindings } from '../core/bindings';
import type { InputState } from '../core/input';
import { setLightMode, type World } from '../game/world';
import type { Renderer } from '../render/renderer';
import { loadSave, mergeSave, writeSave, type SaveData, type StorageLike } from '../save/storage';
import { keyLabel, type LayoutMap } from '../ui/keyNames';
import type { OptionsHandlers, OptionsValues } from '../ui/options';
import type { TouchControls } from '../ui/touchControls';
import type { TouchUi } from './touchUi';

/** Everything a setting changes when the player picks it. */
export interface SettingsTargets {
  readonly canvas: HTMLCanvasElement;
  readonly sfx: Sfx;
  readonly input: InputState;
  readonly renderer: Renderer;
  readonly touchUi: TouchUi;
  readonly touchControls: TouchControls;
  /** The world being played; it changes with each level. */
  world(): World;
  /** The canvas must be drawn again, even on a menu. */
  redraw(): void;
  /** The touch layout or the device classes may have changed. */
  layoutChanged(): void;
  /** Shows or hides the performance panel. */
  showStats(visible: boolean): void;
  /** The menus must show the new values. */
  changed(values: OptionsValues): void;
}

/** What a new world takes from the settings. */
export interface WorldSettingsInit {
  readonly reduceFlicker: boolean;
  readonly muted: boolean;
  readonly classicLight: boolean;
  readonly turnScale: number;
}

/**
 * The player's settings: the saved values, applied to the world, sound, input, drawing and
 * page, and written back after each change (merged with what another tab may have saved).
 */
export class Settings {
  private layout: LayoutMap | null = null;
  private targets: SettingsTargets | null = null;

  constructor(
    private readonly save: SaveData,
    private readonly storage: StorageLike | null,
    private readonly prefersReducedMotion: boolean,
  ) {}

  /** "Reduce flicker" follows the system until the player picks it. */
  get reduceFlicker(): boolean {
    return this.save.reduceFlicker ?? this.prefersReducedMotion;
  }

  get showStats(): boolean {
    return this.save.showStats;
  }

  worldInit(): WorldSettingsInit {
    return {
      reduceFlicker: this.reduceFlicker,
      muted: this.save.muted,
      classicLight: this.save.classicLight,
      turnScale: this.save.turnSensitivity / 100,
    };
  }

  values(): OptionsValues {
    const s = this.save;
    return {
      reduceFlicker: this.reduceFlicker,
      classicLight: s.classicLight,
      muted: s.muted,
      musicVolume: s.musicVolume,
      effectsVolume: s.effectsVolume,
      enemyVolume: s.enemyVolume,
      mouseAim: s.mouseAim,
      turnSensitivity: s.turnSensitivity,
      keyBindings: copyBindings(s.keyBindings),
      leftHanded: s.leftHanded,
      touchControls: s.touchControls,
      quality: s.quality,
      brightness: s.brightness,
      showStats: s.showStats,
    };
  }

  /** Connects the settings to what they change and applies all of them once. */
  attach(targets: SettingsTargets): void {
    this.targets = targets;
    const s = this.save;
    const { sfx, renderer, input, touchControls } = targets;
    sfx.setMuted(s.muted);
    sfx.setVolumes(s.musicVolume / 100, s.effectsVolume / 100, s.enemyVolume / 100);
    input.setBindings(s.keyBindings);
    renderer.setQuality(s.quality);
    renderer.setBrightness(s.brightness);
    touchControls.setLeftHanded(s.leftHanded);
    targets.touchUi.setMode(s.touchControls);
    this.applyReduceMotion();
    this.applyKeyLabels();
    this.updateCursor();
    targets.showStats(s.showStats);
    targets.layoutChanged();
    targets.changed(this.values());
  }

  /** Key names from the player's keyboard layout, once the browser gives them. */
  setLayout(layout: LayoutMap | null): void {
    this.layout = layout;
    this.applyKeyLabels();
  }

  /** The crosshair only shows when the mouse moves the beam. */
  updateCursor(): void {
    const t = this.targets;
    if (!t) return;
    t.canvas.classList.toggle('game--aim', this.save.mouseAim && !t.world().settings.classicLight);
  }

  get mouseAim(): boolean {
    return this.save.mouseAim;
  }

  setMuted(muted: boolean): void {
    this.change((s, t) => {
      s.muted = muted;
      t.world().settings.muted = muted;
      t.sfx.setMuted(muted);
      t.redraw();
    });
  }

  toggleStats(): void {
    this.change((s, t) => {
      s.showStats = !s.showStats;
      t.showStats(s.showStats);
    });
  }

  /** Writes settings and progress, keeping any progress another open tab saved meanwhile. */
  persist(): void {
    const merged = mergeSave(loadSave(this.storage), this.save);
    this.save.unlockedLevel = merged.unlockedLevel;
    this.save.bestLevelTimes = merged.bestLevelTimes;
    this.save.bestFullRunSeconds = merged.bestFullRunSeconds;
    writeSave(this.storage, merged);
  }

  readonly handlers: OptionsHandlers = {
    onReduceFlicker: (checked) =>
      this.change((s, t) => {
        s.reduceFlicker = checked;
        t.world().settings.reduceFlicker = checked;
        this.applyReduceMotion();
      }),
    onClassicLight: (checked) =>
      this.change((s, t) => {
        // Applies at once, even from the pause menu: shape and difficulty.
        s.classicLight = checked;
        setLightMode(t.world(), checked);
        this.updateCursor();
        t.redraw();
      }),
    onMute: (checked) => this.setMuted(checked),
    onVolume: (channel, percent) =>
      this.change((s, t) => {
        if (channel === 'music') s.musicVolume = percent;
        else if (channel === 'effects') s.effectsVolume = percent;
        else s.enemyVolume = percent;
        t.sfx.setVolumes(s.musicVolume / 100, s.effectsVolume / 100, s.enemyVolume / 100);
      }),
    onMouseAim: (checked) =>
      this.change((s) => {
        s.mouseAim = checked;
        this.updateCursor();
      }),
    onTurnSensitivity: (percent) =>
      this.change((s, t) => {
        s.turnSensitivity = percent;
        t.world().settings.turnScale = percent / 100;
      }),
    onBindings: (bindings) =>
      this.change((s, t) => {
        s.keyBindings = copyBindings(bindings);
        t.input.setBindings(s.keyBindings);
        this.applyKeyLabels();
        t.redraw();
      }),
    onLeftHanded: (checked) =>
      this.change((s, t) => {
        s.leftHanded = checked;
        t.touchControls.setLeftHanded(checked);
      }),
    onTouchMode: (mode) =>
      this.change((s, t) => {
        s.touchControls = mode;
        t.touchUi.setMode(mode);
        t.layoutChanged();
      }),
    onQuality: (quality) =>
      this.change((s, t) => {
        s.quality = quality;
        t.renderer.setQuality(quality);
        t.redraw();
      }),
    onBrightness: (steps) =>
      this.change((s, t) => {
        s.brightness = steps;
        t.renderer.setBrightness(steps);
        t.redraw();
      }),
    onShowStats: (checked) =>
      this.change((s, t) => {
        s.showStats = checked;
        t.showStats(checked);
      }),
  };

  private change(apply: (save: SaveData, targets: SettingsTargets) => void): void {
    const t = this.targets;
    if (!t) return;
    apply(this.save, t);
    t.changed(this.values());
    this.persist();
  }

  /** "Reduce flicker" also stops the menu animations. */
  private applyReduceMotion(): void {
    document.documentElement.classList.toggle('reduce-motion', this.reduceFlicker);
  }

  private applyKeyLabels(): void {
    const t = this.targets;
    if (!t) return;
    const { interact, mute } = this.save.keyBindings;
    t.renderer.setKeyLabels(
      keyLabel(interact[0] ?? '', this.layout),
      keyLabel(mute[0] ?? '', this.layout),
    );
  }
}
