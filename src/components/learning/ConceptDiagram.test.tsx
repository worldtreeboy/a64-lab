// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { DiagramKind } from '../../learning/types';
import { ConceptDiagram } from './ConceptDiagram';

afterEach(cleanup);

const FOUNDATION_ROUTES = [
  ['mental-model', 'cpu-state'],
  ['arithmetic', 'arithmetic-flow'],
  ['address-number', 'address-pointer'],
  ['load-store', 'memory-offset'],
  ['stack-value', 'stack-value-five-steps'],
] as const satisfies ReadonlyArray<readonly [DiagramKind, string]>;

const CONTROL_ROUTES = [
  'cmp-zero',
  'signed-flags',
  'ordered-branch',
  'bl-only',
  'return-flow',
  'function-arguments',
  'function-result',
  'save-lr-cycle',
  'pair-transfer',
  'stack-frame-flow',
  'nested-return-addresses',
] as const satisfies readonly DiagramKind[];

const ADVANCED_ROUTES = [
  'code-data-sections',
  'string-bytes',
  'label-address',
  'syscall-boundary',
  'write-bytes',
  'disassembly-anatomy',
  'c-mapping',
  'debug-snapshot',
  'indirect-control',
  'native-workflow',
] as const satisfies readonly DiagramKind[];

const LEGACY_ADVANCED_ROUTES = [
  ['code-sections', 'code-data-sections'],
  ['data-bytes', 'string-bytes'],
  ['pointer', 'label-address'],
  ['syscall-gate', 'syscall-boundary'],
  ['syscall', 'write-bytes'],
  ['disassembly', 'disassembly-anatomy'],
  ['debug-state', 'debug-snapshot'],
  ['indirect-call', 'indirect-control'],
] as const satisfies ReadonlyArray<readonly [DiagramKind, string]>;

function expectExactlyOneFigure(container: HTMLElement) {
  expect(container.querySelectorAll('figure')).toHaveLength(1);
  expect(container.querySelector('figure figure')).toBeNull();
}

describe('ConceptDiagram scene routing', () => {
  it.each(FOUNDATION_ROUTES)('routes legacy %s to the %s foundation scene', (kind, sceneKind) => {
    const { container } = render(<ConceptDiagram kind={kind} />);

    expect(container.querySelector(`.foundation-concept-scene[data-kind="${sceneKind}"]`)).toBeTruthy();
    expectExactlyOneFigure(container);
  });

  it.each(CONTROL_ROUTES)('routes %s directly to its control scene', (kind) => {
    const { container } = render(<ConceptDiagram kind={kind} />);

    expect(container.querySelector(`.control-concept-scene[data-kind="${kind}"]`)).toBeTruthy();
    expectExactlyOneFigure(container);
  });

  it.each(ADVANCED_ROUTES)('routes %s directly to its advanced scene', (kind) => {
    const { container } = render(<ConceptDiagram kind={kind} />);

    expect(container.querySelector(`.advanced-concept-scene.acs-${kind}`)).toBeTruthy();
    expectExactlyOneFigure(container);
  });

  it.each(LEGACY_ADVANCED_ROUTES)('keeps legacy %s routed to the %s advanced scene', (kind, sceneKind) => {
    const { container } = render(<ConceptDiagram kind={kind} />);

    expect(container.querySelector(`.advanced-concept-scene.acs-${sceneKind}`)).toBeTruthy();
    expectExactlyOneFigure(container);
  });
});

describe('ConceptDiagram lesson details', () => {
  it('shows the beginner stack flow as reserve, use, and restore', () => {
    const { container } = render(<ConceptDiagram kind="stack-growth" />);

    expect(container.textContent).toContain('A region of ordinary memory used as temporary workspace');
    expect(screen.getByText('one register containing an address')).toBeTruthy();
    expect(container.textContent).toContain('reserve → use → restore');
    const phases = [...container.querySelectorAll('.stack-phase-card')];
    expect(phases).toHaveLength(3);
    expect(phases.map((phase) => phase.querySelector('header strong')?.textContent))
      .toEqual(['RESERVE', 'USE', 'RESTORE']);
    expect(container.textContent).toContain('SP: E000 → DFF0');
    expect(container.textContent).toContain('str x0, [sp] → ldr x1, [sp]');
    expect(container.textContent).toContain('STR stores 42');
    expect(container.textContent).toContain('LDR loads 42 into X1');
    expect(container.textContent).toContain('SP: DFF0 → E000');
    expect(container.textContent).not.toContain('DFF8');
    expect(container.textContent).not.toContain('DFFF');
    expectExactlyOneFigure(container);
  });

  it('shows every stack-value instruction separately and keeps 42 after ADD', () => {
    const { container } = render(<ConceptDiagram kind="stack-value" />);
    const steps = container.querySelectorAll('.fcs-stack-step');

    expect(steps).toHaveLength(5);
    expect([...steps].map((step) => step.querySelector('header strong')?.textContent))
      .toEqual(['MOV', 'SUB', 'STR', 'LDR', 'ADD']);
    expect(container.textContent).toContain('DFF0–DFF7 now hold the 8-byte value 42');
    expect(container.textContent).toContain('DFF0–DFF7 still hold 42 · they may now be reused');
    expect(container.textContent).toContain('42 remains here');
    expectExactlyOneFigure(container);
  });

  it('shows all four signed-comparison flags as separate questions', () => {
    render(<ConceptDiagram kind="signed-flags" />);
    const scene = screen.getByTestId('control-signed-flags');

    expect(scene.textContent).toContain('Unsigned view');
    expect(scene.textContent).toContain('Signed view');
    expect(scene.textContent).toContain('5 − 7 = 0xFFFFFFFFFFFFFFFE');
    expect(scene.textContent).toContain('N = 1');
    expect(scene.textContent).toContain('Z = 0');
    expect(scene.textContent).toContain('C = 0');
    expect(scene.textContent).toContain('V = 0');
    expect(scene.textContent).toContain('X0 = 5');
    expect(scene.textContent).toContain('X1 = 7');
  });

  it('shows that an unconditional branch skips the sequential instruction', () => {
    const { container } = render(<ConceptDiagram kind="unconditional-branch" />);

    expect(container.textContent).toContain('B always chooses its label');
    expect(container.textContent).toContain('PC → end');
    expect(container.textContent).toContain('SKIPPED');
    expect(container.textContent).toContain('mov x0, 99');
  });

  it('shows both the taken and fall-through outcomes of B.NE', () => {
    const { container } = render(<ConceptDiagram kind="control-flow" />);

    expect(container.textContent).toContain('Is Z = 0?');
    expect(container.textContent).toContain('YES → branch to notequal');
    expect(container.textContent).toContain('NO → continue downward');
    expect(container.textContent).toContain('neither path changes the flag');
  });

  it('shows X29 staying fixed after SP later moves', () => {
    const { container } = render(<ConceptDiagram kind="frame-pointer" />);

    expect(container.textContent).toContain('SP and X29 both point to 0x…DFE0');
    expect(container.textContent).toContain('SP → 0x…DFD0');
    expect(container.textContent).toContain('X29 stays → 0x…DFE0');
    expect(container.textContent).not.toContain('SP + X29');
  });
});
