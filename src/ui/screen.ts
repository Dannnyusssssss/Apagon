import { isTooSoonAfterOpening } from '../core/touch';
import { createIcon, type IconKind } from './icons';

export type Variant = 'start' | 'pause' | 'level' | 'victory' | 'defeat' | 'options' | 'help';

export interface ControlLine {
  readonly keys: readonly string[];
  readonly alt: readonly string[];
  readonly label: string;
}

export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Fills `list` with one line per control, as key caps. Clears what was there. */
export function fillControls(
  list: HTMLUListElement,
  lines: readonly ControlLine[],
  or: string,
): void {
  list.replaceChildren();
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
}

/**
 * A full-screen layer: dark vignette, a warm halo like a flashlight, and a
 * framed panel with text and native controls only (keyboard friendly, no hover needed).
 */
export class Screen {
  readonly root: HTMLDivElement;
  /** Where the content goes; extra content can be appended here directly. */
  readonly panel: HTMLDivElement;
  /** Icon color: warm light, or pale red on the defeat screen. */
  readonly accent: string;
  private firstControl: HTMLElement | null = null;
  private openedAt = 0;

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

  /**
   * Escape on this screen calls `back`. The key is not cancelled: it keeps its
   * meaning for whatever holds the game (the portal), as on the rest of the page.
   */
  onEscape(back: () => void): void {
    this.root.addEventListener('keydown', (event) => {
      if (event.code !== 'Escape' || event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      back();
    });
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

  /** Controls as key caps, in a framed note. Returns the list, to fill it again later. */
  controls(title: string, className: string): HTMLUListElement {
    const box = element('div', `screen__controls ${className}`);
    box.append(element('p', 'screen__controls-title', title));
    const list = element('ul', 'screen__controls-list');
    box.append(list);
    this.panel.append(box);
    return list;
  }

  /** A row that holds several controls side by side. */
  row(className = ''): HTMLDivElement {
    const row = element('div', `screen__row ${className}`);
    this.panel.append(row);
    return row;
  }

  /**
   * `guarded` makes the button ignore a tap right after the screen opens: the player may
   * still be pressing the game controls when the run ends. `secondary` draws it smaller.
   */
  button(
    label: string,
    icon: IconKind,
    onClick: () => void,
    options: { guarded?: boolean; secondary?: boolean; parent?: HTMLElement } = {},
  ): HTMLButtonElement {
    const button = element(
      'button',
      options.secondary ? 'screen__button screen__button--secondary' : 'screen__button',
    );
    button.type = 'button';
    button.append(createIcon(icon, 24, this.accent), element('span', '', label));
    button.addEventListener('click', (event) => {
      // A keyboard or screen reader click has no pointer behind it, so it is deliberate.
      const tapped = event.detail !== 0;
      if (options.guarded && tapped && isTooSoonAfterOpening(performance.now(), this.openedAt)) {
        return;
      }
      onClick();
    });
    (options.parent ?? this.panel).append(button);
    // The first button gets focus when the screen opens, unless chosen otherwise.
    this.firstControl ??= button;
    return button;
  }

  /** Chooses which control gets focus when the screen opens. */
  focusOn(control: HTMLElement): void {
    this.firstControl = control;
  }

  get hidden(): boolean {
    return this.root.hidden === true;
  }

  show(focus: boolean): void {
    this.openedAt = performance.now();
    this.root.hidden = false;
    if (focus) this.firstControl?.focus();
  }

  hide(): void {
    this.root.hidden = true;
  }
}
