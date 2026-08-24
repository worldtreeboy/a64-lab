// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssemblyEditor } from './AssemblyEditor';
import { Controls } from './Controls';

afterEach(cleanup);

describe('editor and execution controls', () => {
  it('makes a pending source reload explicit', () => {
    render(
      <AssemblyEditor
        source="mov x0, 10"
        currentLine={null}
        errorLine={null}
        sourceDirty
        onChange={() => undefined}
      />,
    );

    expect(screen.getByText('SOURCE CHANGED')).toBeTruthy();
    expect(screen.getByText(/Step, Run, or Reset reloads the program from the beginning/i)).toBeTruthy();
    expect(screen.getByText(/Executable instructions advance addresses by 4 bytes/i)).toBeTruthy();
  });

  it('names rewind and run behavior precisely', () => {
    const onStepBack = vi.fn();
    const onRun = vi.fn();
    render(
      <Controls
        halted={false}
        canStep
        canStepBack
        onStep={() => undefined}
        onStepBack={onStepBack}
        onRun={onRun}
        onReset={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Step Back/i }));
    fireEvent.click(screen.getByRole('button', { name: /Run/i }));
    expect(onStepBack).toHaveBeenCalledOnce();
    expect(onRun).toHaveBeenCalledOnce();
    expect(screen.getByTitle(/Restore the complete CPU, memory, terminal, and call-stack snapshot/i)).toBeTruthy();
    expect(screen.getByTitle(/Run until completion and show the final net state/i)).toBeTruthy();
  });
});
