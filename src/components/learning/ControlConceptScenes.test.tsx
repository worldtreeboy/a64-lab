// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ControlConceptScene, type ControlConceptSceneKind } from './ControlConceptScenes';

afterEach(cleanup);

const SCENES: Array<{ kind: ControlConceptSceneKind; label: RegExp }> = [
  { kind: 'cmp-zero', label: /CMP comparison, TST bit test, and Zero flag outcomes/i },
  { kind: 'signed-flags', label: /Signed and unsigned comparison flag meanings/i },
  { kind: 'ordered-branch', label: /Signed less-than branch decision/i },
  { kind: 'bl-only', label: /BL function call and link register effects/i },
  { kind: 'return-flow', label: /Return instruction control flow/i },
  { kind: 'function-arguments', label: /Function arguments crossing a call boundary/i },
  { kind: 'function-result', label: /Function result returned in X0/i },
  { kind: 'save-lr-cycle', label: /Save and restore link register/i },
  { kind: 'pair-transfer', label: /STP and LDP register pair memory layout/i },
  { kind: 'stack-frame-flow', label: /Stack frame prologue body and epilogue/i },
  { kind: 'nested-return-addresses', label: /Nested calls with live and saved return addresses/i },
];

describe('ControlConceptScene', () => {
  it.each(SCENES)('renders the $kind scene with an accessible caption', ({ kind, label }) => {
    render(<ControlConceptScene kind={kind} />);
    const figure = screen.getByRole('figure', { name: label });
    expect(figure.dataset.kind).toBe(kind);
    expect(within(figure).getByText('What to remember')).toBeTruthy();
    expect(figure.querySelector('figcaption')?.textContent?.length).toBeGreaterThan(40);
  });

  it('defines CMP, TST, and Z before contrasting all four zero outcomes', () => {
    render(<ControlConceptScene kind="cmp-zero" />);
    const figure = screen.getByRole('figure');
    expect(figure.textContent).toContain('CMP · Compare');
    expect(figure.textContent).toContain('TST · Test Bits');
    expect(figure.textContent).toContain('Z · Zero flag');
    expect(figure.textContent).toContain('5 − 5 = 0');
    expect(figure.textContent).toContain('5 − 7 ≠ 0');
    expect(figure.textContent).toContain('1010');
    expect(figure.textContent).toContain('0010 is non-zero');
    expect(figure.textContent).toContain('0000 is zero');
    expect(figure.textContent).toContain('selected bit found');
    expect(figure.textContent).toContain('selected bit not found');
    expect(within(figure).getAllByText('X0 and X1 stay unchanged')).toHaveLength(4);
    expect(figure.querySelectorAll('.ccs-concept-lane')).toHaveLength(2);
    expect(figure.querySelectorAll('.ccs-compare-case')).toHaveLength(4);
  });

  it('explains every signed-comparison flag from one fixed-width result', () => {
    const { container } = render(<ControlConceptScene kind="signed-flags" />);
    const scene = screen.getByTestId('control-signed-flags');

    expect(scene.textContent).toContain('Unsigned view');
    expect(scene.textContent).toContain('Signed view');
    expect(scene.textContent).toContain('5 − 7 = 0xFFFFFFFFFFFFFFFE');
    expect(scene.textContent).toContain('CMP computes a 64-bit result');
    expect(container.textContent).toContain('then discards it');
    expect(container.querySelectorAll('.ccs-flag-question-grid article')).toHaveLength(4);
    expect(scene.textContent).toContain('C = 0unsigned borrow needed');
    expect(scene.textContent).toContain('V = 0signed answer fits');
    expect(scene.textContent).toContain('UnchangedX0 = 5X1 = 7');
    expect(scene.textContent).toContain('0x80000000 − 1 → 0x7FFFFFFF');
    expect(scene.textContent).toContain('N = 0V = 1N ≠ V → signed less-than is true');
  });

  it('shows the exact signed B.LT recipe and dims fallthrough', () => {
    const { container } = render(<ControlConceptScene kind="ordered-branch" />);
    expect(container.textContent).toContain('N = 1');
    expect(container.textContent).toContain('V = 0');
    expect(container.textContent).toContain('B.LT tests N ≠ V');
    expect(container.textContent).toContain('✓ TAKEN');
    expect(container.querySelector('.ccs-path-dim')?.textContent).toContain('fallthrough instruction');
  });

  it('keeps the BL-only scene limited to its two exact effects', () => {
    const { container } = render(<ControlConceptScene kind="bl-only" />);
    expect(container.textContent).toContain('Functiona named block of reusable code');
    expect(container.textContent).toContain('Caller · _start');
    expect(container.textContent).toContain('Callee · foo');
    expect(container.textContent).toContain('X30 / LR = 0x0004');
    expect(container.textContent).toContain('PC = 0x0008');
    expect(container.textContent).not.toMatch(/\bRET\b/);
  });

  it('shows that returning only redirects PC in the simplified model', () => {
    const { container } = render(<ControlConceptScene kind="return-flow" />);
    expect(container.textContent).toContain('PC = X30');
    expect(container.textContent).toContain('X30 / LR = 0x0004 · unchanged');
    expect(container.textContent).toContain('no memory read');
    expect(container.textContent).toContain('no SP movement');
  });

  it('keeps argument values in X0 and X1 across the call boundary', () => {
    const { container } = render(<ControlConceptScene kind="function-arguments" />);
    expect(container.textContent).toContain('Argumentan input value given to a function');
    expect(container.textContent).toContain('CALLER · _start');
    expect(container.textContent).toContain('CALLEE · inspect');
    expect(container.querySelectorAll('.ccs-argument-register')).toHaveLength(4);
  });

  it('separates a returned value in X0 from the address in LR', () => {
    const { container } = render(<ControlConceptScene kind="function-result" />);
    expect(container.textContent).toContain('X0 = 30 · return value');
    expect(container.textContent).toContain('X0 carries the result');
    expect(container.textContent).toContain('X30 / LR carries the address back');
  });

  it('shows the complete save, overwrite, and restore LR cycle', () => {
    const { container } = render(<ControlConceptScene kind="save-lr-cycle" />);
    expect(container.querySelectorAll('.ccs-cycle-step')).toHaveLength(5);
    expect(container.textContent).toContain('[0x…DFF0] = old X30');
    expect(container.textContent).toContain('nested BL overwrites live LR');
    expect(container.textContent).toContain('X30 ← [0x…DFF0] · foo → _start');
  });

  it('maps pair operands to exact adjacent byte ranges', () => {
    const { container } = render(<ControlConceptScene kind="pair-transfer" />);
    expect(container.textContent).toContain('SP + 0 … SP + 7');
    expect(container.textContent).toContain('saved X29');
    expect(container.textContent).toContain('SP + 8 … SP + 15');
    expect(container.textContent).toContain('saved X30');
    expect(container.textContent).toContain('SP does not move');
  });

  it('separates stack frame setup, work, and cleanup', () => {
    const { container } = render(<ControlConceptScene kind="stack-frame-flow" />);
    expect(container.textContent).toContain('Prologue · prepare');
    expect(container.textContent).toContain('Body · work');
    expect(container.textContent).toContain('Epilogue · restore');
    expect(container.textContent).toContain('SP: E000 → DFF0');
    expect(container.textContent).toContain('[DFF8] = return-to-caller address');
    expect(container.textContent).toContain('SP: DFF0 → E000');
  });

  it('shows the active chain beside live and saved return addresses', () => {
    const { container } = render(<ControlConceptScene kind="nested-return-addresses" />);
    expect(container.textContent).toContain('Current active-call chain');
    expect(container.textContent).toContain('X30 / LRbar → foo');
    expect(container.textContent).toContain('memory[SP + 8]foo → _start');
    expect(container.textContent).toContain('LDP loads saved X30');
    expect(container.textContent).not.toContain('logical history');
  });
});
