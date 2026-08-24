interface TerminalProps {
  output: string;
  exited: boolean;
  exitCode: bigint | null;
  halted?: boolean;
}

export function Terminal({ output, exited, exitCode, halted = false }: TerminalProps) {
  const state = exited ? 'exited' : halted ? 'complete' : 'running';
  const processStatus = `Simulated process ${state}`;
  const emptyMessage = exited
    ? '(no output)'
    : halted
      ? '(program completed with no output)'
      : 'Program output will appear here.';

  return (
    <section className="learning-section terminal-panel" aria-label="Program output">
      <div className="learning-heading terminal-heading">
        <div><span className="eyebrow">SIMULATED PROCESS</span><h2>Terminal / Output</h2></div>
        <span
          className={`terminal-status terminal-${state}`}
          role="status"
          aria-label={processStatus}
          title={processStatus}
        >
          <i className={exited || halted ? 'terminal-stopped' : ''} aria-hidden="true" />
          <b>{state.toUpperCase()}</b>
        </span>
      </div>
      <pre className={output ? '' : 'terminal-empty'} aria-live="polite">
        {output || emptyMessage}
        {exited && `\n\n[process exited with status ${exitCode ?? 0n}]`}
        {!exited && halted && '\n\n[program complete]'}
      </pre>
    </section>
  );
}
