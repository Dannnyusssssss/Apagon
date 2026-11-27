import {
  ACTIONS,
  BINDABLE_KEYS,
  DEFAULT_BINDINGS,
  KEY_ALIASES,
  KEYS_PER_ACTION,
  type Action,
} from '../data/controls';

/** The keys of each action, by KeyboardEvent.code: one or two, never shared. */
export type Bindings = Record<Action, string[]>;

/** What happened when the player chose a key for an action. */
export type AssignResult =
  /** The key was already there. */
  | { readonly kind: 'unchanged' }
  | { readonly kind: 'assigned' }
  /** The key was in use by `other`, which got the key this slot had before. */
  | { readonly kind: 'swapped'; readonly other: Action }
  /** The key was in use by `other`, which keeps its remaining key. */
  | { readonly kind: 'moved'; readonly other: Action }
  /** Nothing changed: the key cannot be bound, or `other` would be left without keys. */
  | { readonly kind: 'refused'; readonly reason: 'notBindable' }
  | { readonly kind: 'refused'; readonly reason: 'wouldEmpty'; readonly other: Action };

export function defaultBindings(): Bindings {
  const result = {} as Bindings;
  for (const action of ACTIONS) result[action] = [...DEFAULT_BINDINGS[action]];
  return result;
}

export function copyBindings(bindings: Bindings): Bindings {
  const result = {} as Bindings;
  for (const action of ACTIONS) result[action] = [...bindings[action]];
  return result;
}

/** The binding a pressed key counts as: both Shift keys are one. */
export function canonicalKey(code: string): string {
  return Object.hasOwn(KEY_ALIASES, code) ? (KEY_ALIASES[code] ?? code) : code;
}

/** Every code that triggers a bound key (the Shift binding is pressed with either Shift). */
export function codesFor(binding: string): string[] {
  const codes = [binding];
  for (const [alias, target] of Object.entries(KEY_ALIASES)) {
    if (target === binding) codes.push(alias);
  }
  return codes;
}

export function isBindable(code: string): boolean {
  return BINDABLE_KEYS.has(canonicalKey(code));
}

/** The action a key is bound to, or null. */
export function actionOf(bindings: Bindings, code: string): Action | null {
  const key = canonicalKey(code);
  for (const action of ACTIONS) if (bindings[action].includes(key)) return action;
  return null;
}

/**
 * Binds `code` to `slot` (0 main, 1 alternative) of `action`. A key belongs to one action
 * only: if another one had it, that action takes this slot's old key, or simply loses it
 * when it keeps another key. Never leaves an action without keys. Returns new bindings.
 */
export function assignKey(
  current: Bindings,
  action: Action,
  slot: number,
  code: string,
): { bindings: Bindings; result: AssignResult } {
  const key = canonicalKey(code);
  if (!BINDABLE_KEYS.has(key)) {
    return { bindings: current, result: { kind: 'refused', reason: 'notBindable' } };
  }
  const bindings = copyBindings(current);
  const keys = bindings[action];
  const index = Math.min(Math.max(0, Math.trunc(slot)), keys.length, KEYS_PER_ACTION - 1);
  const previous = keys[index] ?? null;
  if (previous === key) return { bindings: current, result: { kind: 'unchanged' } };

  const owner = actionOf(bindings, key);
  let result: AssignResult = { kind: 'assigned' };
  if (owner === action) {
    // Already the other key of this action: with an empty slot there is nothing to do.
    if (previous === null) return { bindings: current, result: { kind: 'unchanged' } };
    // Otherwise the two keys trade places.
    keys[keys.indexOf(key)] = previous;
  } else if (owner !== null) {
    const ownerKeys = bindings[owner];
    const at = ownerKeys.indexOf(key);
    if (previous !== null) {
      ownerKeys[at] = previous;
      result = { kind: 'swapped', other: owner };
    } else if (ownerKeys.length > 1) {
      ownerKeys.splice(at, 1);
      result = { kind: 'moved', other: owner };
    } else {
      return {
        bindings: current,
        result: { kind: 'refused', reason: 'wouldEmpty', other: owner },
      };
    }
  }
  keys[index] = key;
  return { bindings, result };
}

/**
 * Reads saved bindings, which the player may have edited. Each action needs one or two
 * different bindable keys, or it keeps its default; if two actions end up sharing a key,
 * every binding goes back to the defaults.
 */
export function parseBindings(value: unknown): Bindings {
  const result = defaultBindings();
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return result;
  for (const action of ACTIONS) {
    if (!Object.hasOwn(value, action)) continue;
    const keys: unknown = (value as Record<string, unknown>)[action];
    if (!Array.isArray(keys) || keys.length < 1 || keys.length > KEYS_PER_ACTION) continue;
    const valid: string[] = [];
    for (const key of keys as unknown[]) {
      if (typeof key === 'string' && BINDABLE_KEYS.has(key) && !valid.includes(key)) {
        valid.push(key);
      }
    }
    if (valid.length === keys.length) result[action] = valid;
  }
  return hasSharedKeys(result) ? defaultBindings() : result;
}

export function bindingsEqual(a: Bindings, b: Bindings): boolean {
  return ACTIONS.every(
    (action) =>
      a[action].length === b[action].length && a[action].every((key, i) => b[action][i] === key),
  );
}

function hasSharedKeys(bindings: Bindings): boolean {
  const seen = new Set<string>();
  for (const action of ACTIONS) {
    for (const key of bindings[action]) {
      if (seen.has(key)) return true;
      seen.add(key);
    }
  }
  return false;
}
