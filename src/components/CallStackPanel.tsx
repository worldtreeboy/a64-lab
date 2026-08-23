import type { CallFrame } from '../arm64/cpu';
import { formatHex } from '../arm64/registers';

interface CallStackPanelProps {
  frames: readonly CallFrame[];
}

export function CallStackPanel({ frames }: CallStackPanelProps) {
  const activeCall = frames.length > 1 ? frames[frames.length - 1] : null;

  return (
    <section className="memory-tool call-stack-panel" aria-label="Function call stack">
      <div className="tool-heading">
        <div><span className="eyebrow">LR + ARGUMENTS</span><h2>Function Calls</h2></div>
        <span className="depth-chip">DEPTH {frames.length}</span>
      </div>
      <div className="call-stack-content">
        <div className="call-tree">
          {frames.map((frame, index) => (
            <div className="call-frame" style={{ paddingLeft: `${index * 14}px` }} key={`${frame.name}-${index}`}>
              <span>{index > 0 ? '└──' : '●'}</span>
              <strong>{frame.name}</strong>
            </div>
          ))}
        </div>
        {activeCall ? (
          <div className="call-details">
            <span className="eyebrow">FUNCTION ARGUMENTS</span>
            {activeCall.arguments.slice(0, 4).map((value, index) => (
              <div key={index}>
                <code>X{index}</code><span>argument {index + 1}</span><strong>{formatHex(value)}</strong>
              </div>
            ))}
            <p><code>X30 / LR</code> return to {formatHex(activeCall.returnAddress!)}</p>
          </div>
        ) : <p className="call-empty">Execute BL or BLR to visualize a call.</p>}
      </div>
    </section>
  );
}
