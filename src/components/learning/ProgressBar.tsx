interface ProgressBarProps {
  value: number;
  label: string;
  detail?: string;
}

export function ProgressBar({ value, label, detail }: ProgressBarProps) {
  const bounded = Math.max(0, Math.min(100, value));
  return (
    <div className="learning-progress">
      <div className="progress-copy">
        <strong>{label}</strong>
        <span>{detail ?? `${bounded}%`}</span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={bounded}
      >
        <span style={{ width: `${bounded}%` }} />
      </div>
    </div>
  );
}
