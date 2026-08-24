// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  FoundationConceptScene,
  type FoundationConceptKind,
} from './FoundationConceptScenes';

afterEach(cleanup);

const KINDS: FoundationConceptKind[] = [
  'cpu-state',
  'arithmetic-flow',
  'address-pointer',
  'memory-offset',
  'stack-value-five-steps',
];

describe('FoundationConceptScene', () => {
  it.each(KINDS)('renders an accessible %s scene', (kind) => {
    const { container } = render(<FoundationConceptScene kind={kind} />);
    const figure = container.querySelector(`figure[data-kind="${kind}"]`);

    expect(figure).toBeTruthy();
    expect(figure?.getAttribute('aria-label')).toBeTruthy();
    expect(figure?.querySelector('figcaption')?.textContent?.length).toBeGreaterThan(20);
  });

  it('teaches the main data change while acknowledging normal instruction advancement', () => {
    render(<FoundationConceptScene kind="cpu-state" />);
    const scene = screen.getByTestId('foundation-cpu-state');

    expect(within(scene).getByText('BEFORE')).toBeTruthy();
    expect(within(scene).getByText('mov x0, 10')).toBeTruthy();
    expect(within(scene).getByText('AFTER')).toBeTruthy();
    expect(scene.textContent).toContain('Main data change: X0');
    expect(scene.textContent).toContain('instruction position also advances');
  });

  it('separates ADD from SUB and explains the immediate input', () => {
    render(<FoundationConceptScene kind="arithmetic-flow" />);
    const add = screen.getByTestId('foundation-add-row');
    const sub = screen.getByTestId('foundation-sub-row');

    expect(add.textContent).toContain('add x2, x0, x1');
    expect(add.textContent).toContain('X2 = 30');
    expect(add.textContent).toContain('X0 stays 10');
    expect(sub.textContent).toContain('sub x3, x2, #5');
    expect(sub.textContent).toContain('#5 is an immediate');
    expect(sub.textContent).toContain('X3 = 25');
  });

  it('draws a register value pointing to its concrete memory address', () => {
    render(<FoundationConceptScene kind="address-pointer" />);
    const scene = screen.getByTestId('foundation-address-pointer');

    expect(within(scene).getByText('X0')).toBeTruthy();
    expect(scene.textContent).toContain('ORDINARY DATA');
    expect(scene.textContent).toContain('use this as a number');
    expect(within(scene).getByText('X1')).toBeTruthy();
    expect(within(scene).getAllByText('0x400000').length).toBeGreaterThanOrEqual(2);
    expect(within(scene).getByText('← X1 points here')).toBeTruthy();
    expect(scene.textContent).toContain('does not read or change memory');
  });

  it('shows the exact base-plus-eight address calculation', () => {
    const { container } = render(<FoundationConceptScene kind="memory-offset" />);
    const scene = screen.getByTestId('foundation-memory-offset');

    expect(scene.textContent).toContain('0x400000');
    expect(scene.textContent).toContain('#8');
    expect(scene.textContent).toContain('0x400008');
    expect(container.querySelectorAll('.fcs-byte-walk > div')).toHaveLength(9);
    expect(scene.textContent).toContain('X1 still equals 0x400000');
  });

  it('shows all five stack instructions and keeps 42 visible after ADD', () => {
    const { container } = render(<FoundationConceptScene kind="stack-value-five-steps" />);
    const scene = screen.getByTestId('foundation-stack-value-five-steps');
    const steps = container.querySelectorAll('.fcs-stack-step');

    expect(steps).toHaveLength(5);
    expect([...steps].map((step) => step.querySelector('header strong')?.textContent))
      .toEqual(['MOV', 'SUB', 'STR', 'LDR', 'ADD']);
    expect(scene.textContent).toContain('SP: E000 → DFF0');
    expect(scene.textContent).toContain('[DFF0] becomes 42');
    expect(scene.textContent).toContain('[DFF0] still contains 42 · it may now be reused');
    expect(scene.textContent).toContain('0x7FFFFFFFDFF8');
    expect(scene.textContent).toContain('0x7FFFFFFFE000');
    expect(scene.textContent).toContain('42 remains here');
    expect(scene.textContent).toContain('main non-PC effect');
  });
});
