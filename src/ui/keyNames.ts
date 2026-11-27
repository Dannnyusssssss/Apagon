import { TEXTS } from '../data/texts';

/** Characters of the punctuation keys on a US layout, when the real layout is unknown. */
const US_KEYS: Readonly<Record<string, string>> = {
  Comma: ',',
  Period: '.',
  Semicolon: ';',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  IntlBackslash: '<',
  Backquote: '`',
};

/** What a key prints on this keyboard, by code, when the browser tells. */
export type LayoutMap = ReadonlyMap<string, string>;

/** The longest name the layout may give a key; anything longer is not a key cap. */
const MAX_LAYOUT_NAME = 2;

/**
 * The name to show for a KeyboardEvent.code. Letters and punctuation come from the
 * player's layout when known (the code names the US position, an AZERTY "A" is "KeyQ").
 */
export function keyLabel(code: string, layout: LayoutMap | null = null): string {
  const names: Readonly<Record<string, string>> = TEXTS.keys as unknown as Record<string, string>;
  if (Object.hasOwn(names, code) && typeof names[code] === 'string') return names[code];
  const printed = layout?.get(code);
  const fromLayout =
    typeof printed === 'string' && printed.length > 0 && printed.length <= MAX_LAYOUT_NAME
      ? printed.toUpperCase()
      : null;
  if (code.startsWith('Key') && code.length === 4) return fromLayout ?? code.slice(3);
  if (code.startsWith('Digit') && code.length === 6) return code.slice(5);
  if (code.startsWith('Numpad') && code.length === 7) return TEXTS.keys.numpad(code.slice(6));
  if (Object.hasOwn(US_KEYS, code)) return fromLayout ?? US_KEYS[code] ?? code;
  return code;
}

/** Shape of the Keyboard Map API, which only some browsers have. */
interface KeyboardWithLayout {
  getLayoutMap(): Promise<Iterable<[unknown, unknown]>>;
}

function hasLayoutMap(value: unknown): value is KeyboardWithLayout {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { getLayoutMap?: unknown }).getLayoutMap === 'function'
  );
}

/**
 * Asks the browser what each key prints, so the names match the player's keyboard.
 * Resolves to null where that is not available or not allowed. Never throws.
 */
export async function loadKeyboardLayout(): Promise<LayoutMap | null> {
  try {
    const keyboard: unknown = (navigator as Navigator & { keyboard?: unknown }).keyboard;
    if (!hasLayoutMap(keyboard)) return null;
    const result = new Map<string, string>();
    for (const [code, key] of await keyboard.getLayoutMap()) {
      if (typeof code === 'string' && typeof key === 'string') result.set(code, key);
    }
    return result;
  } catch {
    return null;
  }
}
