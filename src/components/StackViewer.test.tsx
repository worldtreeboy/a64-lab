// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StackViewer } from './StackViewer';

afterEach(cleanup);

describe('StackViewer', () => {
  it('puts higher addresses above SP and lower addresses below it', () => {
    const { container } = render(<StackViewer sp={0x1000n} memory={new Map()} changedMemory={[]} />);
    const rows = [...container.querySelectorAll('.memory-row')];

    expect(rows).toHaveLength(7);
    expect(rows[0]?.textContent).toContain('0x0000000000001018');
    expect(rows[3]?.textContent).toContain('0x0000000000001000');
    expect(rows[3]?.textContent).toContain('← SP');
    expect(rows[6]?.textContent).toContain('0x0000000000000FE8');
    expect(screen.getByText('Higher addresses')).toBeTruthy();
    expect(screen.getByText('Lower addresses')).toBeTruthy();
  });

  it('defines the stack and separates SP movement from memory writes', () => {
    render(<StackViewer sp={0x1000n} memory={new Map()} changedMemory={[]} />);

    expect(screen.getByText(/stack is ordinary memory for temporary and saved values/i)).toBeTruthy();
    expect(screen.getByText(/SUB SP reserves bytes at lower addresses/i)).toBeTruthy();
    expect(screen.getByText(/Moving SP does not move or erase stored bytes/i)).toBeTruthy();
    expect(screen.getByText('8 bytes as one value')).toBeTruthy();
  });

  it('does not pretend an unaligned SP starts at the aligned row address', () => {
    render(<StackViewer sp={0x1003n} memory={new Map()} changedMemory={[]} />);

    const marker = screen.getByText('← SP +3');
    expect(marker.getAttribute('title')).toContain('3 bytes after this row');
    expect(screen.queryByText('← SP')).toBeNull();
  });
});
