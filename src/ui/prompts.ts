import type { ExitKind } from '../data/levels';
import { TEXTS } from '../data/texts';
import type { Prompt } from '../game/systems/interact';

/**
 * What the player can do right now, or an empty string. With touch controls it names the
 * action alone, without the key.
 */
export function promptText(
  prompt: Prompt,
  missing: number,
  exit: ExitKind,
  touch: boolean,
): string {
  const labels = touch ? TEXTS.touch.prompts : TEXTS.hud;
  switch (prompt) {
    case 'pickKey':
      return labels.pickKey;
    case 'pickBattery':
      return labels.pickBattery;
    case 'openDoor':
      return exit === 'gate' ? labels.openGate : labels.openDoor;
    case 'doorLocked':
      return TEXTS.hud.missingKeys(missing);
    case 'none':
      return '';
  }
}
