interface ControlsProps {
  halted: boolean;
  canStep: boolean;
  canStepBack: boolean;
  onStep: () => void;
  onStepBack: () => void;
  onRun: () => void;
  onReset: () => void;
}

export function Controls({
  halted,
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
        <span className={`state-light ${halted ? 'halted' : 'ready'}`} />
        <div>
          <strong>{halted ? 'PROGRAM COMPLETE' : 'READY TO EXECUTE'}</strong>
          <span>{halted ? 'Reset to run again' : 'Step through one instruction at a time'}</span>
        </div>
      </div>
      <div className="control-buttons">
        <button className="button button-ghost" disabled={!canStepBack} onClick={onStepBack}>
          <span aria-hidden="true">◀</span> Previous
        </button>
        <button className="button button-ghost" onClick={onReset}>
          <span aria-hidden="true">↺</span> Reset
        </button>
        <button className="button button-secondary" disabled={!canStep} onClick={onRun}>
          <span aria-hidden="true">▶▶</span> Run
        </button>
        <button className="button button-primary" disabled={!canStep} onClick={onStep}>
          <span aria-hidden="true">▶</span> Step
          <kbd>F10</kbd>
        </button>
      </div>
    </footer>
  );
}
