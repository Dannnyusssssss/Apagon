import type { Joystick } from '../core/joystick';
import type { StickRole, TouchSticks } from '../core/touch';
import { TEXTS } from '../data/texts';
import { createIcon, type IconKind } from './icons';
import { element } from './screens';

export interface TouchControlsOptions {
  readonly sticks: TouchSticks;
  /** Debug only: the mouse can use the controls too. */
  readonly acceptMouse: boolean;
  isActive(): boolean;
  isAimEnabled(): boolean;
  onToggleLight(): void;
  onInteract(): void;
  onPause(): void;
  /** The system took a finger away in the middle of a touch. */
  onCancel(): void;
}

const ICON_COLOR = '#ffd76a';

/**
 * The on-screen controls. Sticks listen on the canvas itself, so a touch never moves the
 * focus away from it. Buttons are out of the Tab order: the keyboard has its own keys, and
 * Tab must keep leaving the game.
 */
export class TouchControls {
  private readonly root: HTMLDivElement;
  private readonly moveStick: StickView;
  private readonly aimStick: StickView;
  private readonly lightButton: HTMLButtonElement;
  private readonly lightState: HTMLSpanElement;
  private readonly interactButton: HTMLButtonElement;
  private readonly interactLabel: HTMLSpanElement;
  private lightOn: boolean | null = null;
  private promptLabel: string | null = null;
  private leftHanded = false;

  constructor(
    container: HTMLElement,
    private readonly canvas: HTMLElement,
    private readonly options: TouchControlsOptions,
  ) {
    this.root = element('div', 'touch-controls');
    this.root.hidden = true;

    this.moveStick = new StickView(this.root, 'move');
    this.aimStick = new StickView(this.root, 'aim');

    const t = TEXTS.touch;
    const pause = this.button(t.pause, 'pause', 'touch-button--pause', options.onPause);
    pause.setAttribute('aria-label', t.pause);

    const actions = element('div', 'touch-actions');
    this.interactButton = this.button(t.interact, 'hand', '', options.onInteract);
    this.interactLabel = this.labelOf(this.interactButton);
    this.lightButton = this.button(t.light, 'flashlight', '', options.onToggleLight);
    this.lightState = element('span', 'touch-button__state');
    this.lightButton.append(this.lightState);
    actions.append(this.interactButton, this.lightButton);

    this.root.append(pause, actions);
    container.append(this.root);
    this.listen();
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }

  /** Buttons on the left, moving stick on the right. */
  setLeftHanded(on: boolean): void {
    this.leftHanded = on;
    this.root.classList.toggle('touch-controls--left', on);
  }

  /** Hides the sticks after the fingers were forgotten. */
  refreshSticks(): void {
    this.moveStick.show(this.options.sticks.move);
    this.aimStick.show(this.options.sticks.aim);
  }

  /** Shows the light state and the action at hand. Touches the page only when they change. */
  sync(lightOn: boolean, promptLabel: string, canAct: boolean): void {
    if (lightOn !== this.lightOn) {
      this.lightOn = lightOn;
      const state = lightOn ? TEXTS.touch.lightOn : TEXTS.touch.lightOff;
      this.lightState.textContent = state;
      this.lightButton.setAttribute('aria-pressed', String(lightOn));
      this.lightButton.setAttribute('aria-label', `${TEXTS.touch.light}: ${state}`);
      this.lightButton.classList.toggle('touch-button--on', lightOn);
    }
    if (promptLabel !== this.promptLabel) {
      this.promptLabel = promptLabel;
      const label = promptLabel === '' ? TEXTS.touch.interact : promptLabel;
      this.interactLabel.textContent = label;
      this.interactButton.setAttribute('aria-label', label);
    }
    this.interactButton.classList.toggle('touch-button--ready', canAct);
  }

  /** True when a focus change goes to one of the buttons, which is not leaving the game. */
  contains(target: EventTarget | null): boolean {
    return target instanceof Node && this.root.contains(target);
  }

  private labelOf(button: HTMLButtonElement): HTMLSpanElement {
    const label = button.querySelector('span');
    if (!label) throw new Error('Touch button without label');
    return label;
  }

  private button(
    label: string,
    icon: IconKind,
    className: string,
    onPress: () => void,
  ): HTMLButtonElement {
    const button = element('button', `touch-button ${className}`);
    button.type = 'button';
    button.tabIndex = -1;
    button.append(createIcon(icon, 26, ICON_COLOR), element('span', 'touch-button__label', label));

    // Acting on the first contact responds at once, even with the other thumb busy.
    let pressedByPointer = false;
    button.addEventListener('pointerdown', (event) => {
      // Also stops the focus from leaving the canvas, which would pause the game.
      event.preventDefault();
      pressedByPointer = true;
      button.classList.add('touch-button--pressed');
      onPress();
    });
    // Screen readers activate a button with a click alone.
    button.addEventListener('click', () => {
      if (!pressedByPointer) onPress();
      pressedByPointer = false;
    });
    const release = (): void => button.classList.remove('touch-button--pressed');
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
    button.addEventListener('contextmenu', (event) => event.preventDefault());
    return button;
  }

  private listen(): void {
    const { canvas, options } = this;
    const { sticks } = options;

    canvas.addEventListener('pointerdown', (event) => {
      if (!options.isActive()) return;
      if (event.pointerType === 'mouse' && !options.acceptMouse) return;
      const rect = canvas.getBoundingClientRect();
      const role = sticks.down(
        event.pointerId,
        event.clientX - rect.left,
        event.clientY - rect.top,
        rect.width,
        this.leftHanded,
        options.isAimEnabled(),
      );
      if (!role) return;
      try {
        // Keeps the stick following the finger when it slides over a button.
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // Without capture the stick still works while the finger stays on the canvas.
      }
      this.refresh(role);
    });
    canvas.addEventListener('pointermove', (event) => {
      const rect = canvas.getBoundingClientRect();
      const role = sticks.moveTo(
        event.pointerId,
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
      if (role) this.refresh(role);
    });
    canvas.addEventListener('pointerup', (event) => {
      const role = sticks.up(event.pointerId);
      if (role) this.refresh(role);
    });
    canvas.addEventListener('pointercancel', (event) => {
      const role = sticks.up(event.pointerId);
      if (!role) return;
      this.refresh(role);
      options.onCancel();
    });
    canvas.addEventListener('contextmenu', (event) => {
      if (options.isActive()) event.preventDefault();
    });
  }

  private refresh(role: StickRole): void {
    if (role === 'move') this.moveStick.show(this.options.sticks.move);
    else this.aimStick.show(this.options.sticks.aim);
  }
}

/** The ring and knob of a stick. The aim stick has a dashed ring, not only another place. */
class StickView {
  private readonly ring: HTMLDivElement;
  private readonly knob: HTMLDivElement;

  constructor(parent: HTMLElement, role: StickRole) {
    this.ring = element('div', `touch-stick touch-stick--${role}`);
    this.ring.setAttribute('aria-hidden', 'true');
    this.ring.hidden = true;
    this.knob = element('div', 'touch-stick__knob');
    this.ring.append(this.knob);
    parent.append(this.ring);
  }

  show(stick: Joystick): void {
    this.ring.hidden = !stick.active;
    if (!stick.active) return;
    this.ring.style.transform = `translate(${String(stick.originX)}px, ${String(stick.originY)}px)`;
    this.knob.style.transform = `translate(${String(stick.knobX)}px, ${String(stick.knobY)}px)`;
  }
}
