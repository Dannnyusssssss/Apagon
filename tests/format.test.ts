import { describe, expect, it } from 'vitest';
import { formatTime } from '../src/ui/format';

describe('formatTime', () => {
  it('formats minutes, seconds and tenths', () => {
    expect(formatTime(0)).toBe('0:00.0');
    expect(formatTime(5.06)).toBe('0:05.0');
    expect(formatTime(83.46)).toBe('1:23.4');
    expect(formatTime(600)).toBe('10:00.0');
    expect(formatTime(-3)).toBe('0:00.0');
  });
});
