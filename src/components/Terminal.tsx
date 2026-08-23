interface TerminalProps {
  output: string;
  exited: boolean;
  exitCode: bigint | null;
}

export function Terminal({ output, exited, exitCode }: TerminalProps) {
  return (
    <section className="learning-section terminal-panel" aria-label="Program output">
      <div className="learning-heading terminal-heading">
        <div><span className="eyebrow">FAKE PROCESS</span><h2>Terminal / Output</h2></div>
        <i className={exited ? 'terminal-stopped' : ''} />
      </div>
      <pre className={output ? '' : 'terminal-empty'}>
        {output || 'Program output will appear here.'}
        {exited && `\n\n[process exited with status ${exitCode ?? 0n}]`}
      </pre>
    </section>
  );
}
