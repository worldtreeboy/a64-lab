import type { CallFrame } from '../arm64/cpu';
import { formatHex } from '../arm64/registers';

interface CallStackPanelProps {
  frames: readonly CallFrame[];
}

export function CallStackPanel({ frames }: CallStackPanelProps) {
  const activeCall = frames.length > 1 ? frames[frames.length - 1] : null;
  const activeCallCount = Math.max(0, frames.length - 1);

  return (
    <section className="memory-tool call-stack-panel" aria-label="Function call path teaching view">
      <div className="tool-heading">
        <div><span className="eyebrow">LINK REGISTER (LR) + CALL INPUTS</span><h2>Function Calls</h2></div>
        <span className="depth-chip">ACTIVE CALLS {activeCallCount}</span>
      </div>
      <div className="call-stack-content">
        <p className="call-empty">
          This is the active call path, not the stack-memory table. The first row is the program entry and is not counted as a call.
        </p>
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
            <span className="eyebrow">POSSIBLE ARGUMENT REGISTERS AT CALL TIME</span>
            {activeCall.arguments.slice(0, 4).map((value, index) => (
              <div key={index}>
                <code>X{index}</code>
                <span>possible argument {index + 1}</span>
                <strong title={`${value.toString()} unsigned; ${formatHex(value)}`}>
                  {value.toString()} · {formatHex(value)}
                </strong>
              </div>
            ))}
            <p>
              <code>X30 / Link Register (LR)</code> holds the return address{' '}
              {formatHex(activeCall.returnAddress!)}.
            </p>
          </div>
        ) : <p className="call-empty">Execute BL or BLR to visualize a call.</p>}
      </div>
    </section>
  );
}
