import { TITLE } from '../data/meta';
import { TEXTS } from '../data/texts';

function paragraph(className: string, text: string): HTMLParagraphElement {
  const p = document.createElement('p');
  p.className = className;
  p.textContent = text;
  return p;
}

/**
 * "Click to play" layer shown while the canvas does not have focus.
 * Clicking it gives focus to the canvas; Tab also reaches the canvas.
 */
export class FocusOverlay {
  private readonly root: HTMLDivElement;

  constructor(container: HTMLElement, canvas: HTMLCanvasElement) {
    this.root = document.createElement('div');
    this.root.className = 'focus-overlay';

    const title = document.createElement('h1');
    title.className = 'focus-overlay__title';
    title.textContent = TITLE;

    this.root.append(
      title,
      paragraph('focus-overlay__prompt', TEXTS.focus.prompt),
      paragraph('focus-overlay__help', TEXTS.focus.controls),
      paragraph('focus-overlay__help', TEXTS.focus.leave),
      paragraph('focus-overlay__help', TEXTS.focus.shiftHint),
    );

    this.root.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      canvas.focus();
    });

    container.append(this.root);
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }
}
