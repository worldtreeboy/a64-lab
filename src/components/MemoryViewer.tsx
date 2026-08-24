import { useEffect, useState } from 'react';
import type { ParsedData } from '../arm64/parser';
import { MASK_64, formatHex } from '../arm64/registers';

export interface MemoryNavigationRequest {
  address: bigint;
  sequence: number;
}

export type MemoryChangeDirection = 'forward' | 'back' | 'run' | 'reset';

interface MemoryViewerProps {
  memory: ReadonlyMap<bigint, number>;
  changedMemory: readonly bigint[];
  changeDirection?: MemoryChangeDirection;
  instructionOpcode?: string | null;
  suggestedAddress: bigint;
  navigationRequest: MemoryNavigationRequest | null;
  dataSegments: readonly ParsedData[];
}

function parseAddress(value: string): bigint | null {
  try {
    const trimmed = value.trim();
    if (!/^(?:0x[\da-f]+|\d+)$/i.test(trimmed)) return null;
    const address = BigInt(trimmed);
    return address <= MASK_64 ? address : null;
  } catch {
    return null;
  }
}

function ascii(byte: number): string {
  if (byte === 0) return '\\0';
  return byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '·';
}

function changeHeading(direction: MemoryChangeDirection, opcode?: string | null): string {
  if (direction === 'run') return 'MEMORY CHANGED DURING RUN';
  if (direction === 'back') return 'MEMORY RESTORED BY STEP BACK';
  if (direction === 'reset') return 'MEMORY STATE RESET';
  return opcode ? `MEMORY WRITTEN BY ${opcode.toUpperCase()}` : 'MEMORY CHANGED BY STEP';
}

function changeSummary(direction: MemoryChangeDirection, count: number): string {
  const bytes = `${count} byte${count === 1 ? '' : 's'}`;
  if (direction === 'run') return `${bytes} differ between the start and end of Run.`;
  if (direction === 'back') return `${bytes} restored to their previous snapshot values.`;
  if (direction === 'reset') return `${bytes} restored by resetting the simulator.`;
  return `${bytes} shown after this Step.`;
}

function addressesAreContiguous(addresses: readonly bigint[]): boolean {
  return addresses.every((address, index) => (
    index === 0 || address === addresses[index - 1] + 1n
  ));
}

export function MemoryViewer({
  memory,
  changedMemory,
  changeDirection = 'forward',
  instructionOpcode,
  suggestedAddress,
  navigationRequest,
  dataSegments,
}: MemoryViewerProps) {
  const [addressInput, setAddressInput] = useState(() => `0x${suggestedAddress.toString(16)}`);
  const [followSP, setFollowSP] = useState(true);
  const address = parseAddress(addressInput);
  const changed = new Set(changedMemory);
  const orderedChanges = [...changed].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  const firstChangeAddress = orderedChanges[0] ?? null;
  const changedBytes = firstChangeAddress === null
    ? []
    : orderedChanges.map((byteAddress) => ({
        address: byteAddress,
        value: memory.get(byteAddress) ?? 0,
      }));
  const contiguousChanges = addressesAreContiguous(orderedChanges);

  useEffect(() => {
    if (followSP) setAddressInput(`0x${suggestedAddress.toString(16)}`);
  }, [followSP, suggestedAddress]);

  useEffect(() => {
    if (!navigationRequest) return;
    setAddressInput(`0x${navigationRequest.address.toString(16)}`);
    setFollowSP(false);
  }, [navigationRequest]);

  useEffect(() => {
    if (!followSP || firstChangeAddress === null) return;
    const writeIsVisibleAtSP = firstChangeAddress >= suggestedAddress
      && firstChangeAddress < suggestedAddress + 24n;
    if (!writeIsVisibleAtSP) {
      setAddressInput(`0x${firstChangeAddress.toString(16)}`);
      setFollowSP(false);
    }
  }, [followSP, firstChangeAddress, suggestedAddress]);

  const bytes = address === null
    ? []
    : Array.from({ length: 24 }, (_, index) => {
        const byteAddress = (address + BigInt(index)) & MASK_64;
        return {
          address: byteAddress,
          value: memory.get(byteAddress) ?? 0,
        };
      });
  const rows = Array.from({ length: 3 }, (_, rowIndex) => ({
    address: address === null ? 0n : (address + BigInt(rowIndex * 8)) & MASK_64,
    bytes: bytes.slice(rowIndex * 8, rowIndex * 8 + 8),
  }));
  const dataSegment = address === null
    ? null
    : dataSegments.find((segment) =>
        address >= segment.address && address < segment.address + BigInt(segment.bytes.length)) ?? null;

  return (
    <section className="memory-tool raw-memory" aria-label="Memory viewer">
      <div className="tool-heading">
        <div><span className="eyebrow">HEX + ASCII</span><h2>Memory</h2></div>
        <button className={followSP ? 'follow-active' : ''} onClick={() => setFollowSP((value) => !value)}>
          Follow SP
        </button>
      </div>
      <label className={`address-input ${address === null ? 'invalid' : ''}`}>
        <span>GO</span>
        <input
          value={addressInput}
          onChange={(event) => {
            setAddressInput(event.target.value);
            setFollowSP(false);
          }}
          aria-label="Memory address"
        />
      </label>
      {address !== null ? (
        <div className="hex-dump">
          {firstChangeAddress !== null && (
            <div className="last-write-guide">
              <div className="last-write-heading">
                <span>{changeHeading(changeDirection, instructionOpcode)}</span>
                <code>{contiguousChanges ? 'low address → high address' : 'sorted by address'}</code>
              </div>
              <div className="last-write-bytes">
                {changedBytes.map((byte) => (
                  <div key={byte.address.toString()}>
                    <code>{byte.value.toString(16).padStart(2, '0')}</code>
                    <small title={formatHex(byte.address)}>+{(byte.address - firstChangeAddress).toString()}</small>
                  </div>
                ))}
              </div>
              <p>{changeSummary(changeDirection, changedBytes.length)}</p>
            </div>
          )}
          <p className="memory-endian-guide">
            Little-endian example: <code>0x1122334455667788</code> → <code>88 77 66 55 44 33 22 11</code>.
            The rightmost, least-significant byte (<code>88</code>) goes at the lowest address.
          </p>
          {dataSegment && (
            <div className="data-region-hint">
              <code>.data:{dataSegment.label ?? 'anonymous'}</code>
              <span>
                {dataSegment.directive === 'asciz'
                  ? 'String bytes followed by a NULL byte.'
                  : 'String bytes without an automatic NULL byte.'}
              </span>
            </div>
          )}
          {rows.map((row) => (
            <div className="memory-dump-row" aria-label={`Memory row at ${formatHex(row.address)}`} key={row.address.toString()}>
              <code className="dump-address">ADDRESS {formatHex(row.address)}</code>
              <span className="dump-column-label">HEX · offsets +0 through +7</span>
              <div className="dump-bytes" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
                {row.bytes.map((byte) => (
                  <span className={changed.has(byte.address) ? 'byte-changed' : ''} key={byte.address.toString()}>
                    {byte.value.toString(16).padStart(2, '0')}
                  </span>
                ))}
              </div>
              <span className="dump-column-label">ASCII · same eight addresses</span>
              <div className="dump-ascii" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }} aria-label={`ASCII view for ${formatHex(row.address)}`}>
                {row.bytes.map((byte) => <span key={byte.address.toString()}>{ascii(byte.value)}</span>)}
              </div>
            </div>
          ))}
        </div>
      ) : <p className="address-error">Enter a hexadecimal or decimal address.</p>}
    </section>
  );
}
