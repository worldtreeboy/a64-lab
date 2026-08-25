// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BeginnerGuide, type BeginnerGuideContent } from './BeginnerGuide';

afterEach(cleanup);

const GUIDE = {
  title: 'CMP, TST, and the Z flag',
  purpose: 'Branches need a simple way to decide whether two values match.',
  terms: [
    { term: 'CMP', meaning: 'Compare two values by subtracting without saving the result.' },
    { term: 'Z flag', meaning: 'A one-bit result that becomes 1 when the comparison result is zero.' },
  ],
  steps: [
    { title: 'Compare', explanation: 'CMP compares the two values.', example: 'cmp x0, x1' },
    { title: 'Record', explanation: 'The CPU updates its flags.' },
    { title: 'Decide', explanation: 'B.EQ reads the Z flag to decide whether to branch.' },
  ],
  remember: 'CMP changes flags, not the registers being compared.',
} as const satisfies BeginnerGuideContent;

describe('BeginnerGuide', () => {
  it('presents purpose, vocabulary, ordered steps, and takeaway in reading order', () => {
    const { container } = render(<BeginnerGuide guide={GUIDE} />);
    const guide = screen.getByRole('region', { name: GUIDE.title });

    expect(within(guide).getByText('START HERE')).toBeTruthy();
    expect(within(guide).getByRole('heading', { name: GUIDE.title, level: 3 })).toBeTruthy();
    expect(within(guide).getByRole('heading', { name: 'Why this matters', level: 4 })).toBeTruthy();
    expect(within(guide).getByText(GUIDE.purpose)).toBeTruthy();
    expect(within(guide).getByRole('heading', { name: 'Words to know', level: 4 })).toBeTruthy();
    expect(container.querySelectorAll('dt')).toHaveLength(2);
    expect(container.querySelectorAll('dd')).toHaveLength(2);

    const orderedSteps = within(guide).getByRole('list');
    expect(orderedSteps.tagName).toBe('OL');
    expect(within(orderedSteps).getAllByRole('listitem').map((item) => item.textContent))
      .toEqual([
        'CompareCMP compares the two values.cmp x0, x1',
        'RecordThe CPU updates its flags.',
        'DecideB.EQ reads the Z flag to decide whether to branch.',
      ]);
    expect(within(orderedSteps).getByText('cmp x0, x1').tagName).toBe('CODE');

    const takeaway = within(guide).getByRole('complementary', { name: 'Remember' });
    expect(within(takeaway).getByText(GUIDE.remember)).toBeTruthy();
  });

  it('creates unique accessible labels for multiple guides', () => {
    const { container } = render(
      <>
        <BeginnerGuide guide={GUIDE} />
        <BeginnerGuide guide={{ ...GUIDE, title: 'A second concept' }} />
      </>,
    );
    const regions = [
      screen.getByRole('region', { name: GUIDE.title }),
      screen.getByRole('region', { name: 'A second concept' }),
    ];
    const ids = [...container.querySelectorAll<HTMLElement>('[id]')].map((element) => element.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(regions[0]?.getAttribute('aria-labelledby')).not.toBe(
      regions[1]?.getAttribute('aria-labelledby'),
    );
  });
});
