import { useMemo, useState, type CSSProperties } from 'react';

interface AssemblyEditorProps {
  source: string;
  currentLine: number | null;
  errorLine: number | null;
  onChange: (source: string) => void;
}

const LINE_HEIGHT = 24;
const TOP_PADDING = 16;

export function AssemblyEditor({
  source,
  currentLine,
  errorLine,
  onChange,
}: AssemblyEditorProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const lineNumbers = useMemo(
    () => source.split(/\r?\n/).map((_, index) => index + 1),
    [source],
  );

  const markerStyle = (line: number): CSSProperties => ({
    top: TOP_PADDING + (line - 1) * LINE_HEIGHT - scrollTop,
  });

  return (
    <section className="panel editor-panel" aria-label="Assembly editor">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">SOURCE</span>
          <h2>Assembly Editor</h2>
        </div>
        <span className="phase-chip">FULL LEARNING MODE</span>
      </div>

      <div className="editor-shell">
        <div className="line-numbers" aria-hidden="true">
          {lineNumbers.map((line) => (
            <span key={line}>{line.toString().padStart(2, '0')}</span>
          ))}
        </div>
        <div className="editor-input-wrap">
          {currentLine !== null && (
            <div className="current-line" style={markerStyle(currentLine)}>
              <span className="instruction-arrow">▶</span>
            </div>
          )}
          {errorLine !== null && (
            <div className="error-line" style={markerStyle(errorLine)} />
          )}
          <textarea
            aria-label="ARM64 assembly source"
            value={source}
            onChange={(event) => onChange(event.target.value)}
            onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="editor-status">
        <span><i className="status-dot" /> AArch64</span>
        <span>{lineNumbers.length} lines</span>
        <span>Each instruction = 4 bytes</span>
      </div>
    </section>
  );
}
