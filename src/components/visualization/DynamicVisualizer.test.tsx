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
    expect(screen.getAllByText('current area')).toHaveLength(2);
    expect(screen.getByText(/Changing SP alone does not modify memory bytes/)).toBeTruthy();

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
    expect(screen.getByText('Step Back · undo STR')).toBeTruthy();
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

  it('does not call an unfinished, step-limited Run complete', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram('loop: b loop');
    const before = cpu.snapshot();
    const instruction = cpu.step().executed;
    const after = cpu.snapshot();

    render(
      <DynamicVisualizer
        transition={createVisualizationTransition(before, after, instruction, 'run')}
      />,
    );

    expect(screen.getByText('Run paused at the step limit')).toBeTruthy();
    expect(screen.queryByText('Run completed')).toBeNull();
  });

  it('uses the Run snapshot diff instead of calculating the final LDR address from pre-Run registers', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`mov x1, 0x400000
mov x0, 0x1122334455667788
str x0, [x1]
ldr x2, [x1]`);
    const before = cpu.snapshot();
    let finalInstruction = null;
    while (!cpu.halted) finalInstruction = cpu.step().executed ?? finalInstruction;
    const after = cpu.snapshot();

    const { container } = render(
      <DynamicVisualizer
        transition={createVisualizationTransition(before, after, finalInstruction, 'run')}
        focus={['memory']}
      />,
    );
    const byteCard = screen.getByTestId('dynamic-memory-bytes');
    expect(within(byteCard).getByText('Memory changed during Run')).toBeTruthy();
    expect(within(byteCard).getByText('RUN CHANGES · 8 bytes')).toBeTruthy();
    expect(within(byteCard).getAllByText('0x0000000000400000').length).toBeGreaterThan(0);
    expect(within(byteCard).queryByText('LDR · 8 bytes')).toBeNull();
    expect([...container.querySelectorAll('.dv-byte-strip code')].map((node) => node.textContent))
      .toEqual(['88', '77', '66', '55', '44', '33', '22', '11']);
  });

  it('shows little-endian bytes from low to high address after STR', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`mov x0, 0x1122334455667788
mov x1, 0x400000
str x0, [x1]`);
    cpu.step();
    cpu.step();

    const { container } = render(<DynamicVisualizer transition={stepTransition(cpu)} focus={['memory']} />);
    const byteCard = screen.getByTestId('dynamic-memory-bytes');
    expect(within(byteCard).getByText('low address → high address')).toBeTruthy();
    const bytes = [...container.querySelectorAll('.dv-byte-strip code')]
      .map((element) => element.textContent);
    expect(bytes).toEqual(['88', '77', '66', '55', '44', '33', '22', '11']);
    expect(within(byteCard).getByText('0x1122334455667788')).toBeTruthy();
  });

  it('shows all sixteen STP bytes and labels their Step Back state as restored', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`mov x29, 0x1122334455667788
mov x30, 0x99aabbccddeeff00
stp x29, x30, [sp, #-16]!`);
    cpu.step();
    cpu.step();

    const view = render(<DynamicVisualizer transition={stepTransition(cpu)} focus={['memory']} />);
    let byteCard = screen.getByTestId('dynamic-memory-bytes');
    expect(within(byteCard).getByText('STP · 16 bytes')).toBeTruthy();
    expect(view.container.querySelectorAll('.dv-byte-strip code')).toHaveLength(16);

    const beforeRewind = cpu.snapshot();
    expect(cpu.stepBack()).toBe(true);
    const afterRewind = cpu.snapshot();
    view.rerender(
      <DynamicVisualizer
        transition={createVisualizationTransition(
          beforeRewind,
          afterRewind,
          cpu.currentInstruction,
          'back',
          diffSnapshots(beforeRewind, afterRewind),
        )}
        focus={['memory']}
      />,
    );
    byteCard = screen.getByTestId('dynamic-memory-bytes');
    expect(within(byteCard).getByText('Memory restored by Step Back')).toBeTruthy();
    expect(within(byteCard).getByText('RESTORED · 16 bytes')).toBeTruthy();
    expect(within(byteCard).queryByText('STP · 16 bytes')).toBeNull();
    expect(view.container.querySelectorAll('.dv-byte-strip code')).toHaveLength(16);
  });

  it('shows both eight-byte reads in a sixteen-byte LDP', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`mov x29, 0x1122334455667788
mov x30, 0x99aabbccddeeff00
stp x29, x30, [sp, #-16]!
ldp x0, x1, [sp]`);
    cpu.step();
    cpu.step();
    cpu.step();

    const view = render(<DynamicVisualizer transition={stepTransition(cpu)} focus={['memory']} />);
    const byteCard = screen.getByTestId('dynamic-memory-bytes');
    expect(within(byteCard).getByText('LDP · 16 bytes')).toBeTruthy();
    expect(view.container.querySelectorAll('.dv-byte-strip code')).toHaveLength(16);
  });

  it('explains that raising SP makes rows reusable without erasing their bytes', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`mov x0, 42
sub sp, sp, #16
str x0, [sp]
add sp, sp, #16`);
    cpu.step();
    cpu.step();
    cpu.step();

    render(<DynamicVisualizer transition={stepTransition(cpu)} focus={['stack']} />);
    const stack = screen.getByTestId('dynamic-stack');
    expect(within(stack).getAllByText('may be reused')).toHaveLength(2);
    expect(within(stack).getByText(/stored bytes remain until later code overwrites them/i)).toBeTruthy();
    expect(within(stack).getAllByText('0x000000000000002A').length).toBeGreaterThan(0);
  });

  it('offers a simple stack view without exposing the exact byte-row breakdown', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`mov x0, 42
sub sp, sp, #16
str x0, [sp]
ldr x1, [sp]
add sp, sp, #16`);
    cpu.step();

    const view = render(
      <DynamicVisualizer
        transition={stepTransition(cpu)}
        focus={['registers', 'stack']}
        registerFocus={['x0', 'x1', 'sp']}
        stackVisualization="simple"
      />,
    );
    const simpleStack = screen.getByTestId('dynamic-stack');
    expect(within(simpleStack).getByText('Stack · simple view')).toBeTruthy();
    expect(simpleStack.textContent).toContain('16 bytes are reserved; memory contents did not change');
    expect(simpleStack.textContent).not.toMatch(/DFF8|DFFF/);
    expect(simpleStack.querySelector('.dv-stack-row')).toBeNull();

    view.rerender(
      <DynamicVisualizer
        transition={stepTransition(cpu)}
        focus={['registers', 'stack']}
        registerFocus={['x0', 'x1', 'sp']}
        stackVisualization="simple"
      />,
    );
    expect(screen.getByTestId('dynamic-stack').textContent).toContain('STR stored 42 in the reserved space');
  });

  it('marks the exact offset when SP is not aligned to an eight-byte row', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram('sub sp, sp, #1');

    render(<DynamicVisualizer transition={stepTransition(cpu)} focus={['stack']} />);
    const marker = within(screen.getByTestId('dynamic-stack')).getByText('SP at row +7');
    expect(marker.getAttribute('title')).toBe('SP = 0x00007FFFFFFFDFFF');
  });

  it('uses wrapped 64-bit effective addresses in the memory-byte view', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`mov x1, 0xfffffffffffffff8
mov x0, 42
str x0, [x1, #8]`);
    cpu.step();
    cpu.step();

    render(<DynamicVisualizer transition={stepTransition(cpu)} focus={['memory']} />);
    const bytes = screen.getByTestId('dynamic-memory-bytes');
    expect(within(bytes).getAllByText('0x0000000000000000').length).toBeGreaterThan(0);
    expect(within(bytes).queryByText('0x000000000000002A')).toBeTruthy();
    expect(within(bytes).queryByText('0x0000000100000000')).toBeNull();
  });

  it('describes little-endian order accurately when one access crosses the 64-bit boundary', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`mov x1, 0xfffffffffffffffc
mov x0, 0x1122334455667788
str x0, [x1]`);
    cpu.step();
    cpu.step();

    const view = render(<DynamicVisualizer transition={stepTransition(cpu)} focus={['memory']} />);
    const bytes = screen.getByTestId('dynamic-memory-bytes');
    expect(within(bytes).getByText('Address order wraps from 0xFFFF… to zero')).toBeTruthy();
    expect(bytes.textContent).toContain('least-significant byte at the effective address');
    expect(bytes.textContent).toContain('Following bytes use increasing addresses and wrap to zero');
    expect(bytes.textContent).not.toContain('least-significant byte at the lowest address');
    expect([...view.container.querySelectorAll('.dv-byte-strip code')].map((node) => node.textContent))
      .toEqual(['88', '77', '66', '55', '44', '33', '22', '11']);
  });
});
