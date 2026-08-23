import type { SyscallInfo } from '../arm64/instructions/syscalls';
import { formatHex } from '../arm64/registers';

interface SyscallPanelProps {
  syscall: SyscallInfo | null;
  describeAddress: (address: bigint) => string | null;
}

export function SyscallPanel({ syscall, describeAddress }: SyscallPanelProps) {
  return (
    <section className="learning-section syscall-panel" aria-label="Linux ARM64 syscall">
      <div className="learning-heading">
        <div><span className="eyebrow">SIMPLIFIED MODE</span><h2>Linux ARM64 syscall</h2></div>
        <span className="linux-chip">AARCH64</span>
      </div>
      {syscall ? (
        <div className="syscall-content">
          <div className="syscall-name">
            <code>x8 = {syscall.number.toString()}</code><span>→</span><strong>{syscall.name}()</strong>
          </div>
          <span className="eyebrow">ARGUMENTS</span>
          {syscall.arguments.map((argument) => {
            const pointer = argument.register === 'x1' ? describeAddress(argument.value) : null;
            return (
              <div className="syscall-argument" key={argument.register}>
                <code>{argument.register}</code>
                <div><strong>{argument.role}</strong><span>→ {pointer ?? argument.description}</span></div>
                <code>{argument.register === 'x1' ? formatHex(argument.value) : argument.value.toString()}</code>
              </div>
            );
          })}
        </div>
      ) : <p className="learning-empty">Execute <code>svc 0</code> with x8 = 64 or 93.</p>}
    </section>
  );
}
