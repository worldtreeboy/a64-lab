// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRegisterState } from '../arm64/registers';
import { RegisterPanel } from './RegisterPanel';

afterEach(cleanup);

function renderPanel() {
  const registers = createRegisterState();
  registers.x0 = 0x1122_3344_5566_7788n;
  const onNumberFormatChange = vi.fn();
  const view = render(
    <RegisterPanel
      registers={registers}
      changedRegisters={new Set()}
      numberFormat="hex"
      onNumberFormatChange={onNumberFormatChange}
      describePointer={() => null}
      onPointerNavigate={() => undefined}
      flags={{ N: true, Z: false, C: true, V: false }}
      changedFlags={new Set()}
    />,
  );
  return { ...view, onNumberFormatChange };
}

describe('RegisterPanel', () => {
  it('labels X and W widths and explains their shared storage', () => {
    const { container } = renderPanel();

    expect(screen.getByRole('button', { name: 'X · 64-bit' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'W · 32-bit' }));
    const x0Row = container.querySelector('.register-row');
    expect(x0Row?.textContent).toContain('W0');
    expect(x0Row?.textContent).toContain('0x55667788');
    expect(screen.getByText(/clears its X register’s upper 32 bits/i)).toBeTruthy();
    expect(screen.getByText(/SP and PC stay 64-bit/i)).toBeTruthy();
  });

  it('labels decimal as unsigned and expands all four NZCV meanings', () => {
    const { onNumberFormatChange } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'UNSIGNED DEC' }));
    expect(onNumberFormatChange).toHaveBeenCalledWith('decimal');
    expect(screen.getByLabelText(/N: negative result \/ sign bit/)).toBeTruthy();
    expect(screen.getByLabelText(/Z: zero result \/ equal comparison/)).toBeTruthy();
    expect(screen.getByLabelText(/C: carry, or no borrow after subtraction/)).toBeTruthy();
    expect(screen.getByLabelText(/V: signed overflow/)).toBeTruthy();
    expect(screen.getByText(/N = negative\/sign, Z = zero\/equal/i)).toBeTruthy();
  });

  it('does not present untouched zero general registers as pointers to address zero', () => {
    const registers = createRegisterState();
    const describePointer = vi.fn((_value: bigint, name: string) => `${name} target`);

    render(
      <RegisterPanel
        registers={registers}
        changedRegisters={new Set()}
        numberFormat="hex"
        onNumberFormatChange={() => undefined}
        describePointer={describePointer}
        onPointerNavigate={() => undefined}
        flags={{ N: false, Z: false, C: false, V: false }}
        changedFlags={new Set()}
      />,
    );

    expect(screen.queryByText('x0 target')).toBeNull();
    expect(screen.getByText(/sp target/)).toBeTruthy();
    expect(screen.getByText(/pc target/)).toBeTruthy();
    expect(describePointer).not.toHaveBeenCalledWith(0n, 'x0');

    fireEvent.click(screen.getByRole('button', { name: 'W · 32-bit' }));
    expect(screen.getByText(/sp target/)).toBeTruthy();
    expect(screen.getByText(/pc target/)).toBeTruthy();
  });
});
