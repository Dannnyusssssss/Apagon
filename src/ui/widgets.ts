import type { RangeOption } from '../data/options';
import { createIcon, type IconKind } from './icons';
import { element } from './screen';

/** Color of the small icons next to each setting. */
const SETTING_ICON = '#e8dcc4';

/** A native checkbox drawn as a switch, with an icon and a label. */
export function toggle(
  parent: HTMLElement,
  label: string,
  icon: IconKind,
  onChange: (checked: boolean) => void,
  options: { className?: string; keyHint?: string } = {},
): HTMLInputElement {
  const wrapper = element('label', `screen__toggle ${options.className ?? ''}`);
  const input = element('input', 'screen__switch');
  input.type = 'checkbox';
  input.addEventListener('change', () => onChange(input.checked));
  const text = element('span', '', label);
  if (options.keyHint) text.append(element('span', 'only-keys', options.keyHint));
  wrapper.append(input, createIcon(icon, 20, SETTING_ICON), text);
  parent.append(wrapper);
  return input;
}

export interface ChoiceOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

/** Native radio buttons as one row of parts; the whole of each part is the target. */
export function choice<T extends string>(
  parent: HTMLElement,
  name: string,
  label: string,
  icon: IconKind,
  options: readonly ChoiceOption<T>[],
  note: string,
  onChange: (value: T) => void,
  className = '',
): { readonly root: HTMLFieldSetElement; set(value: T): void } {
  const group = element('fieldset', `screen__choice ${className}`);
  const legend = element('legend', 'screen__choice-title', label);
  legend.prepend(createIcon(icon, 20, SETTING_ICON));
  group.append(legend);
  const parts = element('div', 'screen__choice-parts');
  const inputs = options.map((option) => {
    const wrapper = element('label', 'screen__choice-part');
    const input = element('input', 'screen__choice-input');
    input.type = 'radio';
    input.name = name;
    input.value = option.value;
    input.addEventListener('change', () => onChange(option.value));
    wrapper.append(input, element('span', '', option.label));
    parts.append(wrapper);
    return input;
  });
  group.append(parts);
  if (note !== '') group.append(element('p', 'screen__text screen__text--small', note));
  parent.append(group);
  return {
    root: group,
    set(value: T): void {
      for (const input of inputs) input.checked = input.value === value;
    },
  };
}

/** A native range input with its label and the value written next to it. */
export function slider(
  parent: HTMLElement,
  label: string,
  icon: IconKind,
  range: RangeOption,
  format: (value: number) => string,
  onChange: (value: number) => void,
): { readonly input: HTMLInputElement; set(value: number): void } {
  const wrapper = element('label', 'option-slider');
  const title = element('span', 'option-slider__label', label);
  title.prepend(createIcon(icon, 20, SETTING_ICON));
  const input = element('input', 'option-slider__input');
  input.type = 'range';
  input.min = String(range.min);
  input.max = String(range.max);
  input.step = String(range.step);
  const output = element('span', 'option-slider__value');
  output.setAttribute('aria-hidden', 'true');
  const show = (value: number): void => {
    const text = format(value);
    output.textContent = text;
    input.setAttribute('aria-valuetext', text);
  };
  input.addEventListener('input', () => {
    const value = Number(input.value);
    if (!Number.isFinite(value)) return;
    show(value);
    onChange(value);
  });
  wrapper.append(title, input, output);
  parent.append(wrapper);
  return {
    input,
    set(value: number): void {
      input.value = String(value);
      show(value);
    },
  };
}
