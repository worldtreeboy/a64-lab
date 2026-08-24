// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Terminal } from './Terminal';

afterEach(cleanup);

describe('Terminal', () => {
  it('labels the process as simulated and exposes its running status', () => {
    render(<Terminal output="" exited={false} exitCode={null} />);

    expect(screen.getByText('SIMULATED PROCESS')).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Simulated process running' })).toBeTruthy();
    expect(screen.getByText('RUNNING')).toBeTruthy();
    expect(screen.getByText('Program output will appear here.')).toBeTruthy();
  });

  it('distinguishes normal completion without an exit syscall', () => {
    render(<Terminal output="" exited={false} exitCode={null} halted />);

    expect(screen.getByRole('status', { name: 'Simulated process complete' })).toBeTruthy();
    expect(screen.getByText('COMPLETE')).toBeTruthy();
    expect(screen.getByText(/program completed with no output/i)).toBeTruthy();
    expect(screen.getByText(/\[program complete\]/i)).toBeTruthy();
  });

  it('reports an exited process with no output truthfully', () => {
    render(<Terminal output="" exited exitCode={3n} />);

    expect(screen.getByRole('status', { name: 'Simulated process exited' })).toBeTruthy();
    expect(screen.getByText('EXITED')).toBeTruthy();
    expect(screen.getByText(/\(no output\)/)).toBeTruthy();
    expect(screen.getByText(/process exited with status 3/)).toBeTruthy();
    expect(screen.queryByText('Program output will appear here.')).toBeNull();
  });
});
