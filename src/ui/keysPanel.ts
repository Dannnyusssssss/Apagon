import {
  assignKey,
  canonicalKey,
  copyBindings,
  defaultBindings,
  type AssignResult,
  type Bindings,
} from '../core/bindings';
import { ACTIONS, KEYS_PER_ACTION, type Action } from '../data/controls';
import { TEXTS } from '../data/texts';
import { keyLabel, type LayoutMap } from './keyNames';
import { element } from './screen';

interface Listening {
  readonly action: Action;
  readonly slot: number;
  readonly button: HTMLButtonElement;
}

/**
 * The key of each action as a button: choose one, press the new key. Esc cancels and Tab
 * cancels and moves on, so the keyboard is never trapped. What changed is said in a
 * polite live region, so a screen reader hears it too.
 */
export class KeysPanel {
  private bindings: Bindings = defaultBindings();
  private layout: LayoutMap | null = null;
  private readonly buttons = new Map<Action, HTMLButtonElement[]>();
  private readonly status: HTMLParagraphElement;
  private listening: Listening | null = null;
  /** The key that was just captured: its keyup must not click the button again. */
  private swallowKeyUp: string | null = null;

  constructor(
    parent: HTMLElement,
    private readonly onChange: (bindings: Bindings) => void,
  ) {
    const root = element('div', 'keys only-keys');
    root.append(element('p', 'keys__title', TEXTS.options.keysTitle));
    root.append(element('p', 'screen__text screen__text--small', TEXTS.options.keysHint));
    const grid = element('div', 'keys__grid');
    for (const action of ACTIONS) {
      grid.append(element('span', 'keys__action', TEXTS.actions[action]));
      const slots: HTMLButtonElement[] = [];
      for (let slot = 0; slot < KEYS_PER_ACTION; slot++) {
        const button = element('button', 'keys__key');
        button.type = 'button';
        this.listen(button, action, slot);
        slots.push(button);
        grid.append(button);
      }
      this.buttons.set(action, slots);
    }
    this.status = element('p', 'keys__status');
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');
    const restore = element('button', 'keys__restore', TEXTS.options.restore);
    restore.type = 'button';
    restore.addEventListener('click', () => {
      this.stop('');
      this.bindings = defaultBindings();
      this.refresh();
      this.say(TEXTS.options.restored);
      this.onChange(copyBindings(this.bindings));
    });
    root.append(grid, this.status, restore);
    parent.append(root);
    this.refresh();
  }

  set(bindings: Bindings): void {
    this.bindings = copyBindings(bindings);
    this.refresh();
  }

  setLayout(layout: LayoutMap | null): void {
    this.layout = layout;
    this.refresh();
  }

  /** Stops waiting for a key and clears the last message (the window is closing). */
  reset(): void {
    this.stop('');
  }

  private listen(button: HTMLButtonElement, action: Action, slot: number): void {
    button.addEventListener('click', () => {
      if (this.listening?.button === button) {
        this.stop(TEXTS.options.cancelled);
        return;
      }
      this.stop('');
      this.listening = { action, slot, button };
      button.classList.add('keys__key--listening');
      button.textContent = TEXTS.options.waiting;
      this.say(TEXTS.options.listening(TEXTS.actions[action]));
    });
    button.addEventListener('keydown', (event) => {
      if (this.listening?.button !== button) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      // Tab keeps its meaning: it gives up and moves on.
      if (event.code === 'Tab') {
        this.stop(TEXTS.options.cancelled);
        return;
      }
      // Captured here, so Escape does not also close the window and Enter does not click.
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      if (event.code === 'Escape') {
        this.stop(TEXTS.options.cancelled);
        return;
      }
      this.swallowKeyUp = event.code;
      this.choose(action, slot, event.code);
    });
    button.addEventListener('keyup', (event) => {
      // Space clicks a button when released: that click would start listening again.
      if (this.swallowKeyUp !== event.code) return;
      this.swallowKeyUp = null;
      event.preventDefault();
    });
    button.addEventListener('blur', () => {
      if (this.listening?.button === button) this.stop(TEXTS.options.cancelled);
    });
  }

  private choose(action: Action, slot: number, code: string): void {
    const previous = this.bindings[action][slot] ?? null;
    const { bindings, result } = assignKey(this.bindings, action, slot, code);
    const changed = result.kind !== 'refused' && result.kind !== 'unchanged';
    this.bindings = bindings;
    this.stop(this.describe(result, action, code, previous));
    if (changed) this.onChange(copyBindings(bindings));
  }

  private describe(
    result: AssignResult,
    action: Action,
    code: string,
    previous: string | null,
  ): string {
    const t = TEXTS.options;
    const key = this.label(canonicalKey(code));
    const name = TEXTS.actions[action];
    switch (result.kind) {
      case 'unchanged':
      case 'assigned':
        return t.assigned(key, name);
      case 'swapped':
        return t.swapped(key, name, TEXTS.actions[result.other], this.label(previous ?? ''));
      case 'moved':
        return t.moved(key, name, TEXTS.actions[result.other]);
      case 'refused':
        return result.reason === 'notBindable'
          ? t.notBindable
          : t.wouldEmpty(key, TEXTS.actions[result.other]);
    }
  }

  private stop(message: string): void {
    const current = this.listening;
    this.listening = null;
    current?.button.classList.remove('keys__key--listening');
    this.refresh();
    this.say(message);
  }

  private say(message: string): void {
    this.status.textContent = message;
  }

  private label(code: string): string {
    return keyLabel(code, this.layout);
  }

  private refresh(): void {
    const t = TEXTS.options;
    for (const action of ACTIONS) {
      const keys = this.bindings[action];
      const slots = this.buttons.get(action) ?? [];
      slots.forEach((button, slot) => {
        if (this.listening?.button === button) return;
        const code = keys[slot];
        const name = code === undefined ? t.addKey : this.label(code);
        button.textContent = name;
        button.classList.toggle('keys__key--empty', code === undefined);
        button.setAttribute(
          'aria-label',
          t.keyButton(TEXTS.actions[action], slot === 0 ? t.keyMain : t.keyAlt, name),
        );
      });
    }
  }
}
