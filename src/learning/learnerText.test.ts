import { describe, expect, it } from 'vitest';
import { formatLearnerText } from './learnerText';

describe('formatLearnerText', () => {
  it('uses straight apostrophes around inline instruction terms', () => {
    expect(formatLearnerText('Read `LDRB`, then use `STRB`.')).toBe(
      "Read 'LDRB', then use 'STRB'.",
    );
  });

  it('converts every balanced pair in one sentence', () => {
    expect(formatLearnerText('Do `.data`, `.text`, or `.globl` use an address?')).toBe(
      "Do '.data', '.text', or '.globl' use an address?",
    );
  });

  it('leaves unmatched and multiline backticks unchanged', () => {
    expect(formatLearnerText('Keep `an unmatched marker')).toBe('Keep `an unmatched marker');
    expect(formatLearnerText('Keep `two\nlines` unchanged')).toBe('Keep `two\nlines` unchanged');
  });
});
