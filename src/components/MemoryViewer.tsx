import { useEffect, useState } from 'react';
import type { ParsedData } from '../arm64/parser';
import { formatHex } from '../arm64/registers';

export interface MemoryNavigationRequest {
  address: bigint;
  sequence: number;
}

interface MemoryViewerProps {
  memory: ReadonlyMap<bigint, number>;
  changedMemory: readonly bigint[];
  suggestedAddress: bigint;
  navigationRequest: MemoryNavigationRequest | null;
  dataSegments: readonly ParsedData[];
}

function parseAddress(value: string): bigint | null {
  try {
    const trimmed = value.trim();
    if (!/^(?:0x[\da-f]+|\d+)$/i.test(trimmed)) return null;
    return BigInt(trimmed);
  } catch {
    return null;
  }
}

function ascii(byte: number): string {
  if (byte === 0) return '\\0';
  return byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '·';
}

export function MemoryViewer({
  memory,
  changedMemory,
  suggestedAddress,
  navigationRequest,
  dataSegments,
}: MemoryViewerProps) {
  const [addressInput, setAddressInput] = useState(() => `0x${suggestedAddress.toString(16)}`);
  const [followSP, setFollowSP] = useState(true);
  const address = parseAddress(addressInput);
  const changed = new Set(changedMemory);

  useEffect(() => {
    if (followSP) setAddressInput(`0x${suggestedAddress.toString(16)}`);
  }, [followSP, suggestedAddress]);

  useEffect(() => {
    if (!navigationRequest) return;
    setAddressInput(`0x${navigationRequest.address.toString(16)}`);
    setFollowSP(false);
  }, [navigationRequest]);

  const bytes = address === null
    ? []
    : Array.from({ length: 24 }, (_, index) => ({
        address: address + BigInt(index),
        value: memory.get(address + BigInt(index)) ?? 0,
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
          <code className="dump-address">{formatHex(address)}</code>
          <div className="dump-bytes">
            {bytes.map((byte) => (
              <span className={changed.has(byte.address) ? 'byte-changed' : ''} key={byte.address.toString()}>
                {byte.value.toString(16).padStart(2, '0')}
              </span>
            ))}
          </div>
          <div className="dump-ascii" aria-label="ASCII view">
            {bytes.map((byte) => <span key={byte.address.toString()}>{ascii(byte.value)}</span>)}
          </div>
        </div>
      ) : <p className="address-error">Enter a hexadecimal or decimal address.</p>}
    </section>
  );
}
