import { TEXTS } from '../data/texts';

/**
 * Screen shown when the enemy reaches the player.
 * The only action is "Retry"; it gets focus so Enter or Space work right away.
 */
export class DefeatOverlay {
  private readonly root: HTMLDivElement;
  private readonly button: HTMLButtonElement;

  constructor(container: HTMLElement, onRetry: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'end-overlay';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.hidden = true;

    const title = document.createElement('h2');
    title.className = 'end-overlay__title';
    title.id = 'defeat-title';
    title.textContent = TEXTS.defeat.title;
    this.root.setAttribute('aria-labelledby', title.id);

    const hint = document.createElement('p');
    hint.className = 'end-overlay__hint';
    hint.textContent = TEXTS.defeat.hint;

    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'end-overlay__button';
    this.button.textContent = TEXTS.defeat.retry;
    this.button.addEventListener('click', onRetry);

    this.root.append(title, hint, this.button);
    container.append(this.root);
  }

  show(): void {
    this.root.hidden = false;
    this.button.focus();
  }

  hide(): void {
    this.root.hidden = true;
  }

  get visible(): boolean {
    return !this.root.hidden;
  }
}
