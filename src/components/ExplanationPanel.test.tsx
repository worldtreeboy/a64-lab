// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ExplanationPanel } from './ExplanationPanel';

afterEach(cleanup);

describe('ExplanationPanel', () => {
  it('shows STATUS before any instruction has executed', () => {
    render(
      <ExplanationPanel
        instruction={null}
        explanation="Ready. Step executes the highlighted instruction."
        error={null}
        nextInstruction="mov x0, 10"
      />,
    );

    expect(screen.getByText('STATUS')).toBeTruthy();
    expect(screen.queryByText('LAST INSTRUCTION')).toBeNull();
  });

  it('distinguishes a paused run from an assembly error', () => {
    const view = render(
      <ExplanationPanel
        instruction={null}
        explanation=""
        error="Run paused after 10,000 steps. The program may contain a loop."
        nextInstruction={null}
      />,
    );

    expect(screen.getByText('EXECUTION PAUSED')).toBeTruthy();
    expect(view.container.querySelector('.has-warning')).toBeTruthy();
    expect(screen.queryByText('ASSEMBLY ERROR')).toBeNull();

    view.rerender(
      <ExplanationPanel
        instruction={null}
        explanation=""
        error="Line 1: Unknown opcode"
        nextInstruction={null}
      />,
    );
    expect(screen.getByText('ASSEMBLY ERROR')).toBeTruthy();
    expect(view.container.querySelector('.has-error')).toBeTruthy();
  });
});
