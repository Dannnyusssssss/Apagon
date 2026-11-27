import type { ExitKind } from '../data/levels';
import { TEXTS } from '../data/texts';
import type { Prompt } from '../game/systems/interact';

/**
 * What the player can do right now, or an empty string. With touch controls it names the
 * action alone; otherwise it starts with `key`, the name of the interact key.
 */
export function promptText(
  prompt: Prompt,
  missing: number,
  exit: ExitKind,
  touch: boolean,
  key = 'E',
): string {
  const t = TEXTS.touch.prompts;
  const k = TEXTS.hud;
  switch (prompt) {
    case 'pickKey':
      return touch ? t.pickKey : k.pickKey(key);
    case 'pickBattery':
      return touch ? t.pickBattery : k.pickBattery(key);
    case 'openDoor':
      if (exit === 'gate') return touch ? t.openGate : k.openGate(key);
      return touch ? t.openDoor : k.openDoor(key);
    case 'doorLocked':
      return TEXTS.hud.missingKeys(missing);
    case 'none':
      return '';
  }
}
