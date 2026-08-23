// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ARM64CPU } from '../../arm64/interpreter';
import { DynamicVisualizer } from './DynamicVisualizer';
import { createVisualizationTransition, diffSnapshots } from './transitions';

afterEach(cleanup);

function stepTransition(cpu: ARM64CPU) {
  const before = cpu.snapshot();
  const result = cpu.step();
  const after = cpu.snapshot();
  return createVisualizationTransition(before, after, result.executed, 'forward', {
    registers: result.changedRegisters,
    flags: result.changedFlags,
    memory: result.changedMemory,
  });
}

describe('DynamicVisualizer', () => {
  it('derives register flow, SP movement, stack writes, and Previous from real snapshots', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`mov x0, 42
sub sp, sp, #16
str x0, [sp]`);

    const view = render(<DynamicVisualizer transition={stepTransition(cpu)} />);
    expect(screen.getByText('Register changes')).toBeTruthy();
    expect(screen.getByLabelText('MOV data flow')).toBeTruthy();

    view.rerender(<DynamicVisualizer transition={stepTransition(cpu)} />);
    expect(screen.getByLabelText(/SP moved from/)).toBeTruthy();
    expect(screen.getByText('−16 bytes')).toBeTruthy();

    view.rerender(<DynamicVisualizer transition={stepTransition(cpu)} />);
    const stack = screen.getByTestId('dynamic-stack');
    expect(stack.querySelector('.dv-stack-changed')).toBeTruthy();
    expect(within(stack).getAllByText('0x000000000000002A').length).toBeGreaterThan(0);

    const beforeRewind = cpu.snapshot();
    expect(cpu.stepBack()).toBe(true);
    const afterRewind = cpu.snapshot();
    const changes = diffSnapshots(beforeRewind, afterRewind);
    view.rerender(
      <DynamicVisualizer
        transition={createVisualizationTransition(
          beforeRewind,
          afterRewind,
          cpu.currentInstruction,
          'back',
          changes,
        )}
      />,
    );
    expect(screen.getByText('Previous · undo STR')).toBeTruthy();
    expect(screen.getByTestId('dynamic-stack').querySelector('.dv-stack-changed')).toBeTruthy();
  });

  it('shows a taken conditional branch from the engine PC and flags', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`mov x0, 5
cmp x0, #5
b.eq equal
equal:
mov x1, 1`);
    cpu.step();
    cpu.step();

    const view = render(<DynamicVisualizer transition={stepTransition(cpu)} />);
    const branch = screen.getByTestId('dynamic-branch');
    expect(within(branch).getByText('B.EQ')).toBeTruthy();
    expect(within(branch).getByText('✓ TAKEN')).toBeTruthy();
    expect(within(branch).getByText('equal:')).toBeTruthy();

    const notTakenCPU = new ARM64CPU();
    notTakenCPU.loadProgram(`mov x0, 4
cmp x0, #5
b.eq equal
equal:
mov x1, 1`);
    notTakenCPU.step();
    notTakenCPU.step();
    view.rerender(<DynamicVisualizer transition={stepTransition(notTakenCPU)} />);
    expect(within(screen.getByTestId('dynamic-branch')).getByText('✕ NOT TAKEN')).toBeTruthy();
  });

  it('visualizes BL saving LR, entering a frame, and RET removing it', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`_start:
bl foo
b end
foo:
ret
end:
mov x0, 1`);

    const view = render(<DynamicVisualizer transition={stepTransition(cpu)} />);
    let calls = screen.getByTestId('dynamic-calls');
    expect(within(calls).getByText('Call entered')).toBeTruthy();
    expect(within(calls).getByText('X30 / LR')).toBeTruthy();
    expect(within(calls).getByText('foo')).toBeTruthy();

    view.rerender(<DynamicVisualizer transition={stepTransition(cpu)} />);
    calls = screen.getByTestId('dynamic-calls');
    expect(within(calls).getByText('Returned')).toBeTruthy();
    expect(within(calls).queryByText('foo')).toBeNull();
  });

  it('shows only net state for Run instead of inventing a final-instruction flow', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`mov x0, 10
mov x1, 20
add x2, x0, x1`);
    const before = cpu.snapshot();
    let finalInstruction = null;
    while (!cpu.halted) finalInstruction = cpu.step().executed ?? finalInstruction;
    const after = cpu.snapshot();

    render(
      <DynamicVisualizer
        transition={createVisualizationTransition(before, after, finalInstruction, 'run')}
      />,
    );
    expect(screen.getByText('Run completed')).toBeTruthy();
    expect(screen.queryByLabelText('ADD data flow')).toBeNull();
    expect(screen.getByText('0x000000000000001E')).toBeTruthy();
  });
});
