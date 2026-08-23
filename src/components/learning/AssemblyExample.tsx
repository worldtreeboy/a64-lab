import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AssemblyCodeProps {
  code: string;
  label?: string;
}

function HighlightedLine({ line }: { line: string }) {
  const match = line.match(/^(\s*)([a-z_.$][\w.$]*:?)(.*)$/i);
  if (!match) return <>{line || ' '}</>;
  const [, indent, head, tail] = match;
  const tokenClass = head.endsWith(':')
    ? 'asm-label'
    : head.startsWith('.')
      ? 'asm-directive'
      : 'asm-opcode';
  const parts = tail.split(/(\b(?:[xw](?:[0-9]|[12][0-9]|30)|sp|pc)\b|#?-?(?:0x[\da-f]+|\d+))/gi);
  return (
    <>
      {indent}<span className={tokenClass}>{head}</span>
      {parts.map((part, index) => (
        /^(?:[xw](?:[0-9]|[12][0-9]|30)|sp|pc)$/i.test(part)
          ? <span className="asm-register" key={`${part}-${index}`}>{part}</span>
          : /^#?-?(?:0x[\da-f]+|\d+)$/i.test(part)
            ? <span className="asm-immediate" key={`${part}-${index}`}>{part}</span>
            : part
      ))}
    </>
  );
}

export function AssemblyCode({ code, label = 'ARM64 assembly' }: AssemblyCodeProps) {
  return (
    <pre className="assembly-code" aria-label={label}>
      <code>
        {code.split('\n').map((line, index) => (
          <span className="assembly-line" key={`${line}-${index}`}>
            <span className="assembly-line-number" aria-hidden="true">{index + 1}</span>
            <span><HighlightedLine line={line} /></span>
          </span>
        ))}
      </code>
    </pre>
  );
}

interface TryInLabButtonProps {
  program: string;
  lessonId: string;
  lessonTitle: string;
  className?: string;
}

export function TryInLabButton({
  program,
  lessonId,
  lessonTitle,
  className = 'button button-secondary',
}: TryInLabButtonProps) {
  const navigate = useNavigate();
  return (
    <button
      className={className}
      type="button"
      onClick={() => navigate('/lab', {
        state: {
          program,
          returnTo: `/guide/${lessonId}`,
          returnLabel: `${lessonTitle} lesson`,
        },
      })}
    >
      <span aria-hidden="true">▶</span> Try in Lab
    </button>
  );
}

interface AssemblyExampleProps {
  code: string;
  title?: string;
  labProgram?: string;
  lessonId: string;
  lessonTitle: string;
}

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const fallback = document.createElement('textarea');
  fallback.value = text;
  fallback.setAttribute('readonly', '');
  fallback.style.position = 'fixed';
  fallback.style.opacity = '0';
  document.body.appendChild(fallback);
  fallback.select();
  const copied = document.execCommand('copy');
  fallback.remove();
  if (!copied) throw new Error('Clipboard access is unavailable');
}

export function AssemblyExample({
  code,
  title = 'Assembly example',
  labProgram,
  lessonId,
  lessonTitle,
}: AssemblyExampleProps) {
  const [copyStatus, setCopyStatus] = useState('');
  const statusId = useId();

  const copy = async () => {
    try {
      await writeClipboard(code);
      setCopyStatus('Copied');
    } catch {
      setCopyStatus('Copy failed');
    }
  };

  return (
    <div className="assembly-example">
      <div className="assembly-example-heading">
        <span>{title}</span>
        <div>
          <span className="copy-status" id={statusId} aria-live="polite">{copyStatus}</span>
          <button type="button" onClick={copy} aria-describedby={statusId}>Copy</button>
          {labProgram && (
            <TryInLabButton
              program={labProgram}
              lessonId={lessonId}
              lessonTitle={lessonTitle}
              className="assembly-try-button"
            />
          )}
        </div>
      </div>
      <AssemblyCode code={code} />
    </div>
  );
}
