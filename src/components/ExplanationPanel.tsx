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
  return (
    <section className={`panel explanation-panel ${error ? 'has-error' : ''}`}>
      <div className="explanation-icon">{error ? '!' : '→'}</div>
      <div>
        <span className="eyebrow">{error ? 'ASSEMBLY ERROR' : 'LAST INSTRUCTION'}</span>
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
