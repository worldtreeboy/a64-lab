interface ExplanationPanelProps {
  instruction: string | null;
  explanation: string;
  error: string | null;
  nextInstruction: string | null;
}

export function ExplanationPanel({
  instruction,
  explanation,
  error,
  nextInstruction,
}: ExplanationPanelProps) {
  const executionPaused = error?.startsWith('Run paused') ?? false;
  const heading = error
    ? executionPaused ? 'EXECUTION PAUSED' : 'ASSEMBLY ERROR'
    : instruction ? 'LAST INSTRUCTION' : 'STATUS';
  return (
    <section className={`panel explanation-panel ${error ? executionPaused ? 'has-warning' : 'has-error' : ''}`}>
      <div className="explanation-icon">{error ? executionPaused ? 'Ⅱ' : '!' : '→'}</div>
      <div>
        <span className="eyebrow">{heading}</span>
        {instruction && <code className="instruction-label">{instruction}</code>}
        <p>{error ?? explanation}</p>
      </div>
      {nextInstruction && !error && (
        <div className="next-instruction">
          <span className="eyebrow">NEXT</span>
          <code>{nextInstruction}</code>
        </div>
      )}
    </section>
  );
}
