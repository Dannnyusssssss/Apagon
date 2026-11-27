import type { Bindings } from '../core/bindings';
import { FIXED_KEYS } from '../data/controls';
import { TEXTS } from '../data/texts';
import { keyLabel, type LayoutMap } from './keyNames';
import type { ControlLine } from './screen';

const ARROWS = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];

/**
 * The keyboard controls as key caps, from the current bindings: main keys, alternative
 * keys and what they do. The four directions show as one line.
 */
export function keyControlLines(bindings: Bindings, layout: LayoutMap | null): ControlLine[] {
  const label = (code: string): string => keyLabel(code, layout);
  const t = TEXTS.start.controlLabels;
  const directions = [bindings.up, bindings.left, bindings.down, bindings.right];
  const mains = directions.map((keys) => label(keys[0] ?? ''));
  const alts = directions.map((keys) => keys[1]);
  let moveAlt: string[] = [];
  if (alts.every((code, i) => code === ARROWS[i])) moveAlt = [TEXTS.start.arrows];
  else if (alts.every((code) => code !== undefined))
    moveAlt = alts.map((code) => label(code ?? ''));

  const line = (keys: readonly string[], text: string): ControlLine => ({
    keys: keys.slice(0, 1).map(label),
    alt: keys.slice(1).map(label),
    label: text,
  });
  return [
    { keys: mains, alt: moveAlt, label: t.move },
    line(bindings.toggleFlashlight, t.light),
    line(bindings.interact, t.interact),
    { keys: [label(FIXED_KEYS.pause)], alt: bindings.pause.map(label), label: t.pause },
    line(bindings.mute, t.mute),
    { keys: [TEXTS.start.mouse], alt: [], label: t.aim },
  ];
}

/** True when any action uses Shift, which some systems take for a shortcut. */
export function usesShift(bindings: Bindings): boolean {
  return Object.values(bindings).some((keys) => keys.includes('ShiftLeft'));
}
