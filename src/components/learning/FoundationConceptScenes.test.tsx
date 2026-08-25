// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  'stack-growth-four-stages',
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

  it('shows the stack cycle as four spatial memory states', () => {
    const { container } = render(<FoundationConceptScene kind="stack-growth-four-stages" />);
    const scene = screen.getByTestId('foundation-stack-growth-four-stages');
    const panels = [...container.querySelectorAll('.fcs-stack-growth-panel')];
    const towers = within(scene).getAllByRole('img');

    expect(panels).toHaveLength(4);
    expect(panels.map((panel) => panel.querySelector('header strong')?.textContent))
      .toEqual(['Before', 'Allocate 16 bytes', 'Use the stack', 'Restore']);
    expect(towers).toHaveLength(4);
    expect(container.querySelectorAll('.fcs-stack-tower-row')).toHaveLength(20);
    expect(towers.map((tower) => tower.getAttribute('aria-label'))).toEqual([
      'SP is at 0xE000. No temporary stack space is reserved.',
      'SP is at 0xDFF0. Sixteen bytes are reserved and memory is unchanged.',
      'SP is at 0xDFF0. The reserved memory contains 42.',
      'SP is back at 0xE000. The old 42 may remain in memory, but the temporary space is finished.',
    ]);
    expect(panels[1]?.querySelectorAll('.fcs-stack-row-reserved')).toHaveLength(2);
    expect(panels[2]?.querySelectorAll('.fcs-stack-row-reserved')).toHaveLength(2);
    expect(panels[2]?.querySelector('.fcs-stack-row-value')?.textContent).toContain('42');
    expect(panels[3]?.querySelectorAll('.fcs-stack-row-released')).toHaveLength(2);
    expect(panels[3]?.querySelector('.fcs-stack-row-value')?.textContent).toContain('42');
    expect(scene.textContent).toContain('0xDFF8');
    expect(scene.textContent).toContain('0xE000 − 0x10 = 0xDFF0');
    expect(scene.textContent).toContain('Stack = memory');
    expect(scene.textContent).toContain('STR / LDR use that space');
  });

  it('lets the learner choose a stack diagram stage', async () => {
    const user = userEvent.setup();
    render(<FoundationConceptScene kind="stack-growth-four-stages" />);
    const scene = screen.getByTestId('foundation-stack-growth-four-stages');

    expect(scene.getAttribute('data-active-stage')).toBe('1');
    await user.click(within(scene).getByRole('button', { name: 'Pause' }));
    expect(within(scene).getByRole('button', { name: 'Play' })).toBeTruthy();

    await user.click(within(scene).getByRole('button', { name: 'Next diagram stage' }));

    expect(scene.getAttribute('data-active-stage')).toBe('2');
    expect(within(scene).getByRole('button', { name: 'Play' })).toBeTruthy();
    expect(scene.querySelectorAll('.fcs-stack-growth-panel[aria-current="step"]')).toHaveLength(1);
    expect(scene.querySelector('.fcs-stack-growth-panel[aria-current="step"] header strong')?.textContent)
      .toBe('Allocate 16 bytes');

    await user.click(within(scene).getByRole('button', { name: 'Previous diagram stage' }));
    expect(scene.getAttribute('data-active-stage')).toBe('1');
  });

  it('shows all five stack-value instructions as matching spatial memory states', () => {
    const { container } = render(<FoundationConceptScene kind="stack-value-five-steps" />);
    const scene = screen.getByTestId('foundation-stack-value-five-steps');
    const steps = [...container.querySelectorAll<HTMLElement>('.fcs-stack-step')];
    const towers = within(scene).getAllByRole('img');

    expect(steps).toHaveLength(5);
    expect(steps.map((step) => step.querySelector('header strong')?.textContent))
      .toEqual(['MOV', 'SUB', 'STR', 'LDR', 'ADD']);
    expect(towers).toHaveLength(5);
    expect(container.querySelectorAll('.fcs-stack-tower-row')).toHaveLength(25);
    expect(container.querySelectorAll('.fcs-stack-tower-row > code')).toHaveLength(25);
    expect(container.querySelectorAll('.fcs-stack-tower-row > .fcs-stack-memory-cell')).toHaveLength(25);
    expect(container.querySelectorAll('.fcs-stack-tower-row > .fcs-stack-row-marker')).toHaveLength(25);
    expect(towers.map((tower) => tower.className)).toEqual(expect.arrayContaining([
      expect.stringContaining('fcs-stack-tower-value-mov'),
      expect.stringContaining('fcs-stack-tower-value-sub'),
      expect.stringContaining('fcs-stack-tower-value-str'),
      expect.stringContaining('fcs-stack-tower-value-ldr'),
      expect.stringContaining('fcs-stack-tower-value-add'),
    ]));
    expect(towers.map((tower) => tower.getAttribute('aria-label'))).toEqual([
      'X0 contains 42. SP remains at 0xE000 and stack memory is unchanged.',
      'SP moved to 0xDFF0. Sixteen bytes are reserved and memory is unchanged.',
      'SP is at 0xDFF0. The value 42 from X0 is stored in reserved stack memory.',
      'SP is at 0xDFF0. Stack memory still contains 42, and X1 has loaded that value.',
      'SP is back at 0xE000. The old 42 remains visible but the temporary stack space may be reused.',
    ]);

    expect(steps[0]?.querySelectorAll('.fcs-stack-row-reserved')).toHaveLength(0);
    expect(steps[0]?.querySelectorAll('.fcs-stack-row-value')).toHaveLength(0);
    expect(steps[1]?.querySelectorAll('.fcs-stack-row-reserved')).toHaveLength(2);
    expect(steps[1]?.querySelectorAll('.fcs-stack-row-value')).toHaveLength(0);
    expect(steps[2]?.querySelectorAll('.fcs-stack-row-reserved')).toHaveLength(2);
    expect(steps[2]?.querySelectorAll('.fcs-stack-row-value')).toHaveLength(1);
    expect(steps[2]?.querySelector('.fcs-stack-row-value')?.textContent).toContain('42');
    expect(steps[3]?.querySelectorAll('.fcs-stack-row-reserved')).toHaveLength(2);
    expect(steps[3]?.querySelectorAll('.fcs-stack-row-value')).toHaveLength(1);
    expect(steps[4]?.querySelectorAll('.fcs-stack-row-reserved')).toHaveLength(0);
    expect(steps[4]?.querySelectorAll('.fcs-stack-row-released')).toHaveLength(2);
    expect(steps[4]?.querySelectorAll('.fcs-stack-row-value')).toHaveLength(1);
    expect(scene.textContent).toContain('SP: E000 → DFF0');
    expect(scene.textContent).toContain('DFF0–DFF7 now hold the 8-byte value 42');
    expect(scene.textContent).toContain('DFF0–DFF7 still hold 42 · they may now be reused');
    expect(scene.textContent).toContain('0x…DFF8–DFFF');
    expect(scene.textContent).toContain('0x…DFF0–DFF7');
    expect(scene.textContent).toContain('0x7FFFFFFFE000');
    expect(scene.textContent).toContain('42 remains here');
    expect(scene.textContent).toContain('main non-PC effect');
  });

  it('lets the learner pause and choose a stack-value instruction', async () => {
    const user = userEvent.setup();
    render(<FoundationConceptScene kind="stack-value-five-steps" />);
    const scene = screen.getByTestId('foundation-stack-value-five-steps');

    expect(scene.getAttribute('data-active-stage')).toBe('1');
    await user.click(within(scene).getByRole('button', { name: 'Pause' }));
    expect(within(scene).getByRole('button', { name: 'Play' })).toBeTruthy();

    await user.click(within(scene).getByRole('button', { name: 'Next diagram stage' }));
    expect(scene.getAttribute('data-active-stage')).toBe('2');
    expect(scene.querySelector('.fcs-stack-step[aria-current="step"] header strong')?.textContent)
      .toBe('SUB');

    await user.click(within(scene).getByRole('button', { name: 'Previous diagram stage' }));
    expect(scene.getAttribute('data-active-stage')).toBe('1');
    expect(scene.querySelector('.fcs-stack-step[aria-current="step"] header strong')?.textContent)
      .toBe('MOV');
  });
});
