// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CheatSheet } from './CheatSheet';

afterEach(cleanup);

describe('CheatSheet', () => {
  it('separates register roles from calling-convention conventions', () => {
    render(<CheatSheet />);

    expect(screen.getByText('REGISTER ROLES')).toBeTruthy();
    expect(screen.getByText('CALLING CONVENTION')).toBeTruthy();
    expect(screen.getByText(/commonly carry integer\/pointer arguments/i)).toBeTruthy();
    expect(screen.getByText(/Frame Pointer when a function uses one/i)).toBeTruthy();
  });

  it('summarizes W/X, stack, endian, and every supported instruction family', () => {
    render(<CheatSheet />);

    expect(screen.getByText(/X is 64-bit; W is its low 32-bit view/i)).toBeTruthy();
    expect(screen.getByText(/SUB SP reserves; ADD SP releases; bytes remain/i)).toBeTruthy();
    expect(screen.getByText(/lowest address stores the rightmost value byte/i)).toBeTruthy();
    for (const opcode of ['LDRB', 'STRB', 'TST', 'B.cond']) {
      expect(screen.getByText(opcode)).toBeTruthy();
    }
    expect(screen.getByText(/set NZCV from subtraction; keep operands/i)).toBeTruthy();
  });
});
