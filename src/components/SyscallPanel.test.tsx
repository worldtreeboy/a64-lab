// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { SyscallInfo } from '../arm64/instructions/syscalls';
import { SyscallPanel } from './SyscallPanel';

afterEach(cleanup);

describe('SyscallPanel', () => {
  it('explains the syscall register roles before showing syntax', () => {
    render(<SyscallPanel syscall={null} describeAddress={() => null} />);

    expect(screen.getByText(/X8 selects a Linux service/i)).toBeTruthy();
    expect(screen.getByText(/64 = write/)).toBeTruthy();
    expect(screen.getByText(/93 = exit/)).toBeTruthy();
    expect(screen.getByText(/X0–X2 hold its inputs/i)).toBeTruthy();
    expect(screen.getByText(/SVC 0/)).toBeTruthy();
  });

  it('labels populated information as the last syscall', () => {
    const syscall: SyscallInfo = {
      number: 64n,
      name: 'write',
      arguments: [
        { register: 'x0', value: 1n, role: 'file descriptor', description: 'stdout' },
        { register: 'x1', value: 0x400000n, role: 'buffer address', description: 'pointer' },
        { register: 'x2', value: 9n, role: 'number of bytes', description: '9 bytes' },
        { register: 'x8', value: 64n, role: 'syscall number', description: 'write' },
      ],
    };
    render(<SyscallPanel syscall={syscall} describeAddress={() => 'message → "shellcode"'} />);

    expect(screen.getByText('LAST SYSCALL')).toBeTruthy();
    expect(screen.getByText('write()')).toBeTruthy();
    expect(screen.getByText('→ message → "shellcode"')).toBeTruthy();
  });
});
