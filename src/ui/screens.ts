import { TITLE } from '../data/meta';
import { TEXTS } from '../data/texts';
import { formatTime } from './format';

/** A full-screen layer with text and native controls only (keyboard friendly, no hover needed). */
class Screen {
  readonly root: HTMLDivElement;
  private firstControl: HTMLElement | null = null;

  constructor(container: HTMLElement, id: string, title: string, headingLevel: 'h1' | 'h2') {
    this.root = document.createElement('div');
    this.root.className = 'screen';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.hidden = true;

    const heading = document.createElement(headingLevel);
    heading.className = 'screen__title';
    heading.id = `${id}-title`;
    heading.textContent = title;
    this.root.setAttribute('aria-labelledby', heading.id);
    this.root.append(heading);
    container.append(this.root);
  }

  text(content: string, className = 'screen__text'): HTMLParagraphElement {
    const p = document.createElement('p');
    p.className = className;
    p.textContent = content;
    this.root.append(p);
    return p;
  }

  checkbox(label: string, onChange: (checked: boolean) => void): HTMLInputElement {
    const wrapper = document.createElement('label');
    wrapper.className = 'screen__option';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.addEventListener('change', () => onChange(input.checked));
    const span = document.createElement('span');
    span.textContent = label;
    wrapper.append(input, span);
    this.root.append(wrapper);
    this.firstControl ??= input;
    return input;
  }

  button(label: string, onClick: () => void, primary = true): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'screen__button';
    button.textContent = label;
    button.addEventListener('click', onClick);
    this.root.append(button);
    if (primary) this.firstControl = button;
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
}

/** Start, pause, victory and defeat screens. Only "Retry" on the end screens. */
export class Screens {
  private readonly start: Screen;
  private readonly pause: Screen;
  private readonly victory: Screen;
  private readonly defeat: Screen;
  private readonly all: readonly Screen[];
  private readonly reduceBoxes: HTMLInputElement[] = [];
  private readonly victoryTime: HTMLParagraphElement;
  private readonly victoryBest: HTMLParagraphElement;
  private readonly victoryNewBest: HTMLParagraphElement;

  constructor(container: HTMLElement, handlers: ScreenHandlers) {
    this.start = new Screen(container, 'start', TITLE, 'h1');
    this.start.text(TEXTS.start.goal);
    this.start.text(TEXTS.start.light);
    this.start.text(TEXTS.start.controls, 'screen__text screen__text--small');
    this.start.text(TEXTS.start.shiftHint, 'screen__text screen__text--small');
    this.start.text(TEXTS.start.contentNote, 'screen__note');
    this.reduceBoxes.push(
      this.start.checkbox(TEXTS.settings.reduceFlicker, handlers.onReduceFlicker),
    );
    this.start.button(TEXTS.start.play, handlers.onStart);
    this.start.text(TEXTS.start.leave, 'screen__text screen__text--small');

    this.pause = new Screen(container, 'pause', TEXTS.pause.title, 'h2');
    this.pause.text(TEXTS.start.controls, 'screen__text screen__text--small');
    this.reduceBoxes.push(
      this.pause.checkbox(TEXTS.settings.reduceFlicker, handlers.onReduceFlicker),
    );
    this.pause.button(TEXTS.pause.resume, handlers.onResume);
    this.pause.text(TEXTS.start.leave, 'screen__text screen__text--small');

    this.victory = new Screen(container, 'victory', TEXTS.victory.title, 'h2');
    this.victoryTime = this.victory.text('');
    this.victoryBest = this.victory.text('', 'screen__text screen__text--small');
    this.victoryNewBest = this.victory.text(TEXTS.victory.newBest, 'screen__note');
    this.victory.button(TEXTS.victory.retry, handlers.onRetry);

    this.defeat = new Screen(container, 'defeat', TEXTS.defeat.title, 'h2');
    this.defeat.text(TEXTS.defeat.hint);
    this.defeat.button(TEXTS.defeat.retry, handlers.onRetry);

    this.all = [this.start, this.pause, this.victory, this.defeat];
  }

  setReduceFlicker(checked: boolean): void {
    for (const box of this.reduceBoxes) box.checked = checked;
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
