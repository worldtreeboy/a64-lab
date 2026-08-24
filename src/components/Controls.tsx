interface ControlsProps {
  halted: boolean;
  sourceDirty?: boolean;
  canStep: boolean;
  canStepBack: boolean;
  onStep: () => void;
  onStepBack: () => void;
  onRun: () => void;
  onReset: () => void;
}

export function Controls({
  halted,
  sourceDirty = false,
  canStep,
  canStepBack,
  onStep,
  onStepBack,
  onRun,
  onReset,
}: ControlsProps) {
  return (
    <footer className="controls">
      <div className="execution-state">
        <span className={`state-light ${sourceDirty ? 'dirty' : halted ? 'halted' : 'ready'}`} />
        <div>
          <strong>{sourceDirty ? 'SOURCE CHANGED' : halted ? 'PROGRAM COMPLETE' : 'READY TO EXECUTE'}</strong>
          <span>
            {sourceDirty
              ? 'The next Step, Run, or Reset starts from a fresh CPU and memory state'
              : halted
                ? 'Reset to run again'
                : 'Step executes one instruction; Run shows the final net state'}
          </span>
        </div>
      </div>
      <div className="control-buttons">
        <button
          className="button button-ghost"
          disabled={!canStepBack}
          onClick={onStepBack}
          title="Restore the complete CPU, memory, terminal, and call-stack snapshot from before the last step"
        >
          <span aria-hidden="true">◀</span> Step Back
        </button>
        <button className="button button-ghost" onClick={onReset}>
          <span aria-hidden="true">↺</span> Reset
        </button>
        <button
          className="button button-secondary"
          disabled={!canStep}
          onClick={onRun}
          title="Run until completion and show the final net state"
        >
          <span aria-hidden="true">▶▶</span> Run
        </button>
        <button
          className="button button-primary"
          disabled={!canStep}
          onClick={onStep}
          aria-label="Step"
        >
          <span aria-hidden="true">▶</span> Step
          <kbd>F10</kbd>
        </button>
      </div>
    </footer>
  );
}
