import { TITLE } from '../data/meta';
import { TEXTS } from '../data/texts';
import { formatTime } from './format';
import { createIcon, type IconKind } from './icons';

type Variant = 'start' | 'pause' | 'victory' | 'defeat';

interface ControlLine {
  readonly keys: readonly string[];
  readonly alt: readonly string[];
  readonly label: string;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * A full-screen layer: dark vignette, a warm halo like a flashlight, and a
 * framed panel with text and native controls only (keyboard friendly, no hover needed).
 */
class Screen {
  readonly root: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  /** Icon color: warm light, or pale red on the defeat screen. */
  private readonly accent: string;
  private firstControl: HTMLElement | null = null;

  constructor(
    container: HTMLElement,
    variant: Variant,
    title: string,
    headingLevel: 'h1' | 'h2',
    icon: IconKind | null,
  ) {
    this.root = element('div', `screen screen--${variant}`);
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.hidden = true;
    this.accent = variant === 'defeat' ? '#f0a8a8' : '#ffd76a';

    const halo = element('div', 'screen__halo');
    halo.setAttribute('aria-hidden', 'true');
    this.panel = element('div', 'screen__panel');
    for (const corner of ['tl', 'tr', 'bl', 'br']) {
      const mark = element('span', `screen__corner screen__corner--${corner}`);
      mark.setAttribute('aria-hidden', 'true');
      this.panel.append(mark);
    }

    if (icon) this.panel.append(createIcon(icon, 44, this.accent));
    const heading = element(headingLevel, 'screen__title', title);
    heading.id = `${variant}-title`;
    this.root.setAttribute('aria-labelledby', heading.id);
    this.panel.append(heading);

    this.root.append(halo, this.panel);
    container.append(this.root);
  }

  text(content: string, className = 'screen__text'): HTMLParagraphElement {
    const p = element('p', className, content);
    this.panel.append(p);
    return p;
  }

  /** A thin line with an icon in the middle. */
  divider(icon: IconKind): void {
    const line = element('div', 'screen__divider');
    line.setAttribute('aria-hidden', 'true');
    line.append(
      element('span', 'screen__divider-line'),
      createIcon(icon, 22, this.accent),
      element('span', 'screen__divider-line'),
    );
    this.panel.append(line);
  }

  /** Controls as key caps, in a framed note. */
  controls(title: string, lines: readonly ControlLine[], or: string): void {
    const box = element('div', 'screen__controls');
    box.append(element('p', 'screen__controls-title', title));
    const list = element('ul', 'screen__controls-list');
    for (const line of lines) {
      const item = element('li', 'screen__control');
      const keys = element('span', 'screen__keys');
      for (const key of line.keys) keys.append(element('kbd', 'screen__key', key));
      if (line.alt.length > 0) {
        keys.append(element('span', 'screen__or', or));
        for (const key of line.alt) keys.append(element('kbd', 'screen__key', key));
      }
      item.append(keys, element('span', 'screen__control-label', line.label));
      list.append(item);
    }
    box.append(list);
    this.panel.append(box);
  }

  /** A row that holds several controls side by side. */
  row(): HTMLDivElement {
    const row = element('div', 'screen__row');
    this.panel.append(row);
    return row;
  }

  /** A native checkbox drawn as a switch, with an icon and a label. */
  toggle(
    parent: HTMLElement,
    label: string,
    icon: IconKind,
    onChange: (checked: boolean) => void,
  ): HTMLInputElement {
    const wrapper = element('label', 'screen__toggle');
    const input = element('input', 'screen__switch');
    input.type = 'checkbox';
    input.addEventListener('change', () => onChange(input.checked));
    wrapper.append(input, createIcon(icon, 20, '#e8dcc4'), element('span', '', label));
    parent.append(wrapper);
    this.firstControl ??= input;
    return input;
  }

  button(label: string, icon: IconKind, onClick: () => void): HTMLButtonElement {
    const button = element('button', 'screen__button');
    button.type = 'button';
    button.append(createIcon(icon, 24, this.accent), element('span', '', label));
    button.addEventListener('click', onClick);
    this.panel.append(button);
    // The main button gets focus when the screen opens.
    this.firstControl = button;
    return button;
  }

  show(focus: boolean): void {
    this.root.hidden = false;
    if (focus) this.firstControl?.focus();
  }

  hide(): void {
    this.root.hidden = true;
  }
}

export interface ScreenHandlers {
  onStart(): void;
  onResume(): void;
  onRetry(): void;
  onReduceFlicker(checked: boolean): void;
  onMute(checked: boolean): void;
}

/** Start, pause, victory and defeat screens. Only "Retry" on the end screens. */
export class Screens {
  private readonly start: Screen;
  private readonly pause: Screen;
  private readonly victory: Screen;
  private readonly defeat: Screen;
  private readonly all: readonly Screen[];
  private readonly reduceBoxes: HTMLInputElement[] = [];
  private readonly muteBoxes: HTMLInputElement[] = [];
  private readonly victoryTime: HTMLParagraphElement;
  private readonly victoryBest: HTMLParagraphElement;
  private readonly victoryNewBest: HTMLParagraphElement;

  constructor(container: HTMLElement, handlers: ScreenHandlers) {
    const s = TEXTS.start;

    this.start = new Screen(container, 'start', TITLE, 'h1', null);
    this.start.divider('flashlight');
    this.start.text(s.goal, 'screen__text screen__text--lead');
    this.start.text(s.light);
    this.start.controls(s.controlsTitle, s.controls, s.or);
    this.start.text(s.shiftHint, 'screen__text screen__text--small');
    this.addSettings(this.start, handlers);
    this.start.text(s.lightNotice, 'screen__text screen__text--small');
    this.start.button(s.play, 'flashlight', handlers.onStart);
    this.start.text(s.leave, 'screen__text screen__text--small');

    this.pause = new Screen(container, 'pause', TEXTS.pause.title, 'h2', 'pause');
    this.pause.controls(s.controlsTitle, s.controls, s.or);
    this.addSettings(this.pause, handlers);
    this.pause.button(TEXTS.pause.resume, 'resume', handlers.onResume);
    this.pause.text(s.leave, 'screen__text screen__text--small');

    this.victory = new Screen(container, 'victory', TEXTS.victory.title, 'h2', 'door');
    this.victoryTime = this.victory.text('', 'screen__text screen__text--lead');
    this.victoryBest = this.victory.text('', 'screen__text screen__text--small');
    this.victoryNewBest = this.victory.text(TEXTS.victory.newBest, 'screen__note');
    this.victory.button(TEXTS.victory.retry, 'retry', handlers.onRetry);

    this.defeat = new Screen(container, 'defeat', TEXTS.defeat.title, 'h2', 'eyes');
    this.defeat.text(TEXTS.defeat.hint, 'screen__text screen__text--lead');
    this.defeat.button(TEXTS.defeat.retry, 'retry', handlers.onRetry);

    this.all = [this.start, this.pause, this.victory, this.defeat];
  }

  private addSettings(screen: Screen, handlers: ScreenHandlers): void {
    const row = screen.row();
    this.reduceBoxes.push(
      screen.toggle(row, TEXTS.settings.reduceFlicker, 'flicker', handlers.onReduceFlicker),
    );
    this.muteBoxes.push(screen.toggle(row, TEXTS.settings.mute, 'sound', handlers.onMute));
  }

  setReduceFlicker(checked: boolean): void {
    for (const box of this.reduceBoxes) box.checked = checked;
  }

  setMuted(checked: boolean): void {
    for (const box of this.muteBoxes) box.checked = checked;
  }

  /** Focus is not moved on first load, so the page does not steal focus inside a frame. */
  showStart(focus: boolean): void {
    this.showOnly(this.start, focus);
  }

  showPause(focus: boolean): void {
    this.showOnly(this.pause, focus);
  }

  showVictory(timeSeconds: number, bestSeconds: number | null, newBest: boolean): void {
    this.victoryTime.textContent = TEXTS.victory.time + formatTime(timeSeconds);
    this.victoryBest.textContent =
      bestSeconds === null ? '' : TEXTS.victory.best + formatTime(bestSeconds);
    this.victoryNewBest.hidden = !newBest;
    this.showOnly(this.victory, true);
  }

  showDefeat(): void {
    this.showOnly(this.defeat, true);
  }

  hideAll(): void {
    for (const screen of this.all) screen.hide();
  }

  private showOnly(target: Screen, focus: boolean): void {
    for (const screen of this.all) if (screen !== target) screen.hide();
    target.show(focus);
  }
}
