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
  const spOffsetInRow = sp - alignedSP;
  const addresses = Array.from({ length: 7 }, (_, index) => alignedSP + BigInt((3 - index) * 8));
  const changed = new Set(changedMemory);

  return (
    <section className="memory-tool stack-viewer" aria-label="Stack viewer">
      <div className="tool-heading">
        <div><span className="eyebrow">LIVE VIEW</span><h2>Stack</h2></div>
        <code>SP {formatHex(sp)}</code>
      </div>
      <p className="stack-viewer-help">
        <strong>The stack is ordinary memory for temporary and saved values.</strong>
        SP holds its current boundary address. SUB SP reserves bytes at lower addresses, a store writes them,
        and ADD SP releases them. Moving SP does not move or erase stored bytes.
      </p>
      <div className="memory-table">
        <div className="stack-address-direction"><span>Higher addresses</span><strong aria-hidden="true">↑</strong></div>
        <div className="memory-table-header"><span>Address</span><span>8 bytes as one value</span></div>
        {addresses.map((address) => (
          <div className={`memory-row ${rowChanged(changed, address) ? 'memory-changed' : ''}`} key={address.toString()}>
            <code>{formatHex(address)}</code>
            <code>{formatHex(read64(memory, address))}</code>
            {address === alignedSP && (
              <span
                className="sp-marker"
                title={spOffsetInRow === 0n
                  ? `SP starts at ${formatHex(address)}`
                  : `SP is ${spOffsetInRow.toString()} bytes after this row's start`}
              >
                {spOffsetInRow === 0n ? '← SP' : `← SP +${spOffsetInRow.toString()}`}
              </span>
            )}
          </div>
        ))}
        <div className="stack-address-direction stack-address-lower"><strong aria-hidden="true">↓</strong><span>Lower addresses</span></div>
      </div>
    </section>
  );
}
