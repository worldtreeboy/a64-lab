// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { STACK_TOP } from '../arm64/registers';
import { MemoryViewer } from './MemoryViewer';

afterEach(cleanup);

describe('MemoryViewer', () => {
  it('jumps from SP to an off-stack Step write and shows little-endian byte order', async () => {
    const address = 0x400000n;
    const values = [0x88, 0x77, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11];
    const memory = new Map(values.map((value, index) => [address + BigInt(index), value]));
    const changedMemory = values.map((_, index) => address + BigInt(index));
    const { container } = render(
      <MemoryViewer
        memory={memory}
        changedMemory={changedMemory}
        changeDirection="forward"
        instructionOpcode="str"
        suggestedAddress={STACK_TOP}
        navigationRequest={null}
        dataSegments={[]}
      />,
    );

    await waitFor(() => {
      expect((screen.getByLabelText('Memory address') as HTMLInputElement).value).toBe('0x400000');
    });
    expect(screen.getByText('MEMORY WRITTEN BY STR')).toBeTruthy();
    const displayedBytes = [...container.querySelectorAll('.last-write-bytes code')]
      .map((element) => element.textContent);
    expect(displayedBytes).toEqual(['88', '77', '66', '55', '44', '33', '22', '11']);
    expect(screen.getByText('0x1122334455667788')).toBeTruthy();
    expect(screen.getByText('88 77 66 55 44 33 22 11')).toBeTruthy();
    expect(screen.getByText(/rightmost, least-significant byte/i)).toBeTruthy();
  });

  it('renders three addressed eight-byte rows with explicit HEX and ASCII views', () => {
    const address = 0x400000n;
    const memory = new Map<bigint, number>([
      [address, 0x41],
      [address + 1n, 0x42],
    ]);
    render(
      <MemoryViewer
        memory={memory}
        changedMemory={[]}
        suggestedAddress={address}
        navigationRequest={null}
        dataSegments={[]}
      />,
    );

    const first = screen.getByLabelText('Memory row at 0x0000000000400000');
    const second = screen.getByLabelText('Memory row at 0x0000000000400008');
    const third = screen.getByLabelText('Memory row at 0x0000000000400010');
    expect(within(first).getByText('ADDRESS 0x0000000000400000')).toBeTruthy();
    expect(within(second).getByText('ADDRESS 0x0000000000400008')).toBeTruthy();
    expect(within(third).getByText('ADDRESS 0x0000000000400010')).toBeTruthy();
    expect(within(first).getByText('HEX · offsets +0 through +7')).toBeTruthy();
    expect(within(first).getByText('ASCII · same eight addresses')).toBeTruthy();
    expect(within(first).getByLabelText('ASCII view for 0x0000000000400000').textContent).toContain('AB');
  });

  it('labels Run changes and Step Back restoration without truncating sixteen bytes', () => {
    const address = 0x1000n;
    const changedMemory = Array.from({ length: 16 }, (_, index) => address + BigInt(index));
    const memory = new Map(changedMemory.map((byteAddress, index) => [byteAddress, index + 1]));
    const view = render(
      <MemoryViewer
        memory={memory}
        changedMemory={changedMemory}
        changeDirection="run"
        instructionOpcode="ldr"
        suggestedAddress={address}
        navigationRequest={null}
        dataSegments={[]}
      />,
    );

    expect(screen.getByText('MEMORY CHANGED DURING RUN')).toBeTruthy();
    expect(screen.queryByText(/LAST MEMORY WRITE/i)).toBeNull();
    expect(view.container.querySelectorAll('.last-write-bytes code')).toHaveLength(16);

    view.rerender(
      <MemoryViewer
        memory={new Map()}
        changedMemory={changedMemory}
        changeDirection="back"
        instructionOpcode="stp"
        suggestedAddress={address}
        navigationRequest={null}
        dataSegments={[]}
      />,
    );
    expect(screen.getByText('MEMORY RESTORED BY STEP BACK')).toBeTruthy();
    expect(screen.queryByText('MEMORY WRITTEN BY STP')).toBeNull();
    expect(view.container.querySelectorAll('.last-write-bytes code')).toHaveLength(16);
  });

  it('wraps addressed rows at the end of the 64-bit address space', () => {
    const memory = new Map<bigint, number>([
      [0xffff_ffff_ffff_ffffn, 0x41],
      [0n, 0x42],
    ]);
    render(
      <MemoryViewer
        memory={memory}
        changedMemory={[]}
        suggestedAddress={0xffff_ffff_ffff_ffffn}
        navigationRequest={null}
        dataSegments={[]}
      />,
    );

    const first = screen.getByLabelText('Memory row at 0xFFFFFFFFFFFFFFFF');
    expect(within(first).getByLabelText('ASCII view for 0xFFFFFFFFFFFFFFFF').textContent).toContain('AB');
    expect(screen.getByLabelText('Memory row at 0x0000000000000007')).toBeTruthy();
  });
});
