// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { CallFrame } from '../arm64/cpu';
import { CallStackPanel } from './CallStackPanel';

afterEach(cleanup);

const entry: CallFrame = {
  name: '_start',
  address: 0n,
  returnAddress: null,
  arguments: [],
};

describe('CallStackPanel', () => {
  it('does not count the program entry as an active call', () => {
    render(<CallStackPanel frames={[entry]} />);

    expect(screen.getByText('ACTIVE CALLS 0')).toBeTruthy();
    expect(screen.getByText(/active call path, not the stack-memory table/i)).toBeTruthy();
    expect(screen.getByText(/first row is the program entry/i)).toBeTruthy();
  });

  it('presents captured registers as possible arguments and explains LR', () => {
    const callee: CallFrame = {
      name: 'calculate',
      address: 8n,
      returnAddress: 4n,
      arguments: [10n, 20n, 0n, 0n, 0n, 0n, 0n, 0n],
    };
    const { container } = render(<CallStackPanel frames={[entry, callee]} />);

    expect(screen.getByText('ACTIVE CALLS 1')).toBeTruthy();
    expect(screen.getByText('POSSIBLE ARGUMENT REGISTERS AT CALL TIME')).toBeTruthy();
    expect(screen.getByText('possible argument 1')).toBeTruthy();
    expect(screen.getByText(/10 · 0x000000000000000A/)).toBeTruthy();
    expect(container.querySelector('.call-details p')?.textContent)
      .toMatch(/Link Register \(LR\).*holds the return address/);
  });
});
