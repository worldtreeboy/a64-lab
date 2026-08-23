import { formatHex } from '../arm64/registers';

interface StackViewerProps {
  sp: bigint;
  memory: ReadonlyMap<bigint, number>;
  changedMemory: readonly bigint[];
}

function read64(memory: ReadonlyMap<bigint, number>, address: bigint): bigint {
  let value = 0n;
  for (let offset = 0; offset < 8; offset += 1) {
    value |= BigInt(memory.get(address + BigInt(offset)) ?? 0) << BigInt(offset * 8);
  }
  return value;
}

function rowChanged(changed: ReadonlySet<bigint>, address: bigint): boolean {
  for (let offset = 0; offset < 8; offset += 1) {
    if (changed.has(address + BigInt(offset))) return true;
  }
  return false;
}

export function StackViewer({ sp, memory, changedMemory }: StackViewerProps) {
  const alignedSP = sp & ~7n;
  const addresses = Array.from({ length: 7 }, (_, index) => alignedSP + BigInt((index - 3) * 8));
  const changed = new Set(changedMemory);

  return (
    <section className="memory-tool stack-viewer" aria-label="Stack viewer">
      <div className="tool-heading">
        <div><span className="eyebrow">LIVE VIEW</span><h2>Stack</h2></div>
        <code>SP {formatHex(sp)}</code>
      </div>
      <div className="memory-table">
        <div className="memory-table-header"><span>Address</span><span>64-bit value</span></div>
        {addresses.map((address) => (
          <div className={`memory-row ${rowChanged(changed, address) ? 'memory-changed' : ''}`} key={address.toString()}>
            <code>{formatHex(address)}</code>
            <code>{formatHex(read64(memory, address))}</code>
            {address === alignedSP && <span className="sp-marker">← SP</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
