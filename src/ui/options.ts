import type { Bindings } from '../core/bindings';
import { TOUCH_MODES, type TouchMode } from '../data/controls';
import { OPTIONS, QUALITIES, type Quality } from '../data/options';
import { TEXTS } from '../data/texts';
import { createIcon, type IconKind } from './icons';
import type { LayoutMap } from './keyNames';
import { KeysPanel } from './keysPanel';
import { element, Screen } from './screen';
import { choice, slider, toggle } from './widgets';

export type OptionsTab = 'access' | 'sound' | 'controls' | 'display';
const TABS: readonly OptionsTab[] = ['access', 'sound', 'controls', 'display'];
const TAB_ICONS: Record<OptionsTab, IconKind> = {
  access: 'flicker',
  sound: 'volume',
  controls: 'keyboard',
  display: 'display',
};

/** A sound channel with its own volume. */
export type Channel = 'music' | 'effects' | 'enemy';

/** Every value the window shows. */
export interface OptionsValues {
  readonly reduceFlicker: boolean;
  readonly classicLight: boolean;
  readonly muted: boolean;
  readonly musicVolume: number;
  readonly effectsVolume: number;
  readonly enemyVolume: number;
  readonly mouseAim: boolean;
  readonly turnSensitivity: number;
  readonly keyBindings: Bindings;
  readonly leftHanded: boolean;
  readonly touchControls: TouchMode;
  readonly quality: Quality;
  readonly brightness: number;
  readonly showStats: boolean;
}

export interface OptionsHandlers {
  onReduceFlicker(checked: boolean): void;
  onClassicLight(checked: boolean): void;
  onMute(checked: boolean): void;
  onVolume(channel: Channel, percent: number): void;
  onMouseAim(checked: boolean): void;
  onTurnSensitivity(percent: number): void;
  onBindings(bindings: Bindings): void;
  onLeftHanded(checked: boolean): void;
  onTouchMode(mode: TouchMode): void;
  onQuality(quality: Quality): void;
  onBrightness(steps: number): void;
  onShowStats(checked: boolean): void;
}

/**
 * The options window: one tab per kind of setting, so each page stays short. The tabs
 * follow the ARIA pattern (arrows move between them, Tab goes into the page) and the
 * window closes with "Back" or Escape.
 */
export class OptionsWindow {
  readonly screen: Screen;
  private readonly tabs = new Map<OptionsTab, HTMLButtonElement>();
  private readonly pages = new Map<OptionsTab, HTMLDivElement>();
  private current: OptionsTab = 'access';
  private readonly keys: KeysPanel;
  private readonly set: (values: OptionsValues) => void;

  constructor(container: HTMLElement, handlers: OptionsHandlers, onBack: () => void) {
    const t = TEXTS.options;
    const s = TEXTS.settings;
    this.screen = new Screen(container, 'options', t.title, 'h2', 'gear');
    this.screen.onEscape(onBack);

    const list = element('div', 'tabs');
    list.setAttribute('role', 'tablist');
    list.setAttribute('aria-label', t.tabsLabel);
    list.addEventListener('keydown', (event) => this.onTabKey(event));
    this.screen.panel.append(list);
    for (const tab of TABS) {
      const button = element('button', 'tabs__tab');
      button.type = 'button';
      button.id = `options-tab-${tab}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', `options-page-${tab}`);
      button.append(
        createIcon(TAB_ICONS[tab], 18, this.screen.accent),
        element('span', '', t.tabs[tab]),
      );
      button.addEventListener('click', () => this.select(tab, false));
      list.append(button);
      this.tabs.set(tab, button);

      const page = element('div', 'tabs__page');
      page.id = `options-page-${tab}`;
      page.setAttribute('role', 'tabpanel');
      page.setAttribute('aria-labelledby', button.id);
      this.screen.panel.append(page);
      this.pages.set(tab, page);
    }
    this.screen.button(t.back, 'back', onBack, { secondary: true });

    const access = this.page('access');
    const reduce = toggle(access, s.reduceFlicker, 'flicker', handlers.onReduceFlicker);
    const classic = toggle(access, s.classicLight, 'flashlight', handlers.onClassicLight);
    access.append(element('p', 'screen__text screen__text--small', t.accessNote));
    access.append(element('p', 'screen__text screen__text--small', TEXTS.start.lightNotice));

    const sound = this.page('sound');
    const mute = toggle(sound, s.mute, 'sound', handlers.onMute, { keyHint: s.muteKey });
    const volume = (label: string, channel: Channel) =>
      slider(sound, label, 'volume', OPTIONS.volume, t.percent, (value) =>
        handlers.onVolume(channel, value),
      );
    const music = volume(t.music, 'music');
    const effects = volume(t.effects, 'effects');
    const enemy = volume(t.enemy, 'enemy');
    sound.append(element('p', 'screen__text screen__text--small', t.soundNote));

    const controls = this.page('controls');
    const mouseAim = toggle(controls, s.mouseAim, 'aim', handlers.onMouseAim, {
      className: 'only-mouse',
    });
    const turn = slider(
      controls,
      t.sensitivity,
      'aim',
      OPTIONS.turnSensitivity,
      t.percent,
      handlers.onTurnSensitivity,
    );
    controls.append(element('p', 'screen__text screen__text--small', t.sensitivityNote));
    this.keys = new KeysPanel(controls, handlers.onBindings);
    const leftHanded = toggle(controls, s.leftHanded, 'hand', handlers.onLeftHanded, {
      className: 'touch-setting',
    });
    const touchMode = choice(
      controls,
      'touch-mode',
      s.touchControls,
      'stick',
      TOUCH_MODES.map((mode) => ({ value: mode, label: s.touchModes[mode] })),
      s.touchNever,
      handlers.onTouchMode,
      'touch-setting',
    );

    const display = this.page('display');
    const quality = choice(
      display,
      'quality',
      t.quality,
      'display',
      QUALITIES.map((value) => ({ value, label: t.qualities[value] })),
      t.qualityNote,
      handlers.onQuality,
    );
    const brightness = slider(
      display,
      t.brightness,
      'sun',
      OPTIONS.brightness,
      t.brightnessValue,
      handlers.onBrightness,
    );
    display.append(element('p', 'screen__text screen__text--small', t.brightnessNote));
    const stats = toggle(display, t.stats, 'display', handlers.onShowStats, {
      keyHint: t.statsKey,
    });

    this.set = (v) => {
      reduce.checked = v.reduceFlicker;
      classic.checked = v.classicLight;
      mute.checked = v.muted;
      music.set(v.musicVolume);
      effects.set(v.effectsVolume);
      enemy.set(v.enemyVolume);
      mouseAim.checked = v.mouseAim;
      turn.set(v.turnSensitivity);
      this.keys.set(v.keyBindings);
      leftHanded.checked = v.leftHanded;
      touchMode.set(v.touchControls);
      quality.set(v.quality);
      brightness.set(v.brightness);
      stats.checked = v.showStats;
    };
    this.select('access', false);
  }

  /** Shows the values without calling any handler. */
  update(values: OptionsValues): void {
    this.set(values);
  }

  setLayout(layout: LayoutMap | null): void {
    this.keys.setLayout(layout);
  }

  show(focus: boolean): void {
    this.screen.focusOn(this.tabs.get(this.current) ?? this.screen.panel);
    this.screen.show(focus);
  }

  hide(): void {
    this.keys.reset();
    this.screen.hide();
  }

  private page(tab: OptionsTab): HTMLDivElement {
    const page = this.pages.get(tab);
    if (!page) throw new Error(`Missing options page ${tab}`);
    return page;
  }

  private select(tab: OptionsTab, focus: boolean): void {
    this.current = tab;
    this.keys.reset();
    for (const [name, button] of this.tabs) {
      const selected = name === tab;
      button.setAttribute('aria-selected', String(selected));
      // Only the selected tab is in the Tab order; the arrows reach the others.
      button.tabIndex = selected ? 0 : -1;
      button.classList.toggle('tabs__tab--selected', selected);
      const page = this.pages.get(name);
      if (page) page.hidden = !selected;
    }
    if (focus) this.tabs.get(tab)?.focus();
  }

  private onTabKey(event: KeyboardEvent): void {
    const index = TABS.indexOf(this.current);
    let next: number | null = null;
    if (event.code === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.code === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (event.code === 'Home') next = 0;
    else if (event.code === 'End') next = TABS.length - 1;
    const tab = next === null ? undefined : TABS[next];
    if (tab === undefined) return;
    event.preventDefault();
    this.select(tab, true);
  }
}
