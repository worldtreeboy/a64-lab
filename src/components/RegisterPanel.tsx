import { useState } from 'react';
import {
  MASK_32,
  X_REGISTER_NAMES,
  formatHex,
  type RegisterName,
  type RegisterState,
} from '../arm64/registers';
import type { CPUFlags, FlagName } from '../arm64/cpu';

export type NumberFormat = 'hex' | 'decimal';

interface RegisterPanelProps {
  registers: RegisterState;
  changedRegisters: ReadonlySet<RegisterName>;
  numberFormat: NumberFormat;
  onNumberFormatChange: (format: NumberFormat) => void;
  describePointer: (value: bigint, name: RegisterName) => string | null;
  onPointerNavigate: (address: bigint) => void;
  flags: CPUFlags;
  changedFlags: ReadonlySet<FlagName>;
}

function displayName(name: RegisterName, width: 'x' | 'w'): string {
  if (width === 'w' && name.startsWith('x')) return `W${name.slice(1)}`;
  if (name === 'x29') return 'X29 / FP';
  if (name === 'x30') return 'X30 / LR';
  return name.toUpperCase();
}

function displayValue(value: bigint, format: NumberFormat, bits = 64): string {
  const masked = bits === 32 ? value & MASK_32 : value;
  return format === 'hex' ? formatHex(masked, bits) : masked.toString(10);
}

export function RegisterPanel({
  registers,
  changedRegisters,
  numberFormat,
  onNumberFormatChange,
  describePointer,
  onPointerNavigate,
  flags,
  changedFlags,
}: RegisterPanelProps) {
  const [registerWidth, setRegisterWidth] = useState<'x' | 'w'>('x');
  const registerNames: RegisterName[] = [...X_REGISTER_NAMES, 'sp', 'pc'];

  return (
    <section className="panel register-panel" aria-label="Registers">
      <div className="panel-heading register-heading">
        <div>
          <span className="eyebrow">CPU STATE</span>
          <h2>Registers</h2>
        </div>
        <div className="register-controls">
          <div className="segmented" aria-label="Register width">
            <button className={registerWidth === 'x' ? 'active' : ''} onClick={() => setRegisterWidth('x')}>X</button>
            <button className={registerWidth === 'w' ? 'active' : ''} onClick={() => setRegisterWidth('w')}>W</button>
          </div>
          <div className="segmented" aria-label="Register number format">
            <button className={numberFormat === 'hex' ? 'active' : ''} onClick={() => onNumberFormatChange('hex')}>HEX</button>
            <button className={numberFormat === 'decimal' ? 'active' : ''} onClick={() => onNumberFormatChange('decimal')}>DEC</button>
          </div>
        </div>
      </div>

      <div className="flags-strip" aria-label="NZCV flags">
        <span className="flags-label">NZCV</span>
        {(Object.keys(flags) as FlagName[]).map((name) => (
          <div
            className={`flag ${flags[name] ? 'flag-set' : ''} ${changedFlags.has(name) ? 'flag-changed' : ''}`}
            key={name}
          >
            <strong>{name}</strong><span>{flags[name] ? '1' : '0'}</span>
          </div>
        ))}
      </div>

      <div className="register-list">
        {registerNames.map((name) => {
          const pointer = registerWidth === 'x' ? describePointer(registers[name], name) : null;
          return (
            <div
              className={`register-row ${changedRegisters.has(name) ? 'changed' : ''} ${
                name === 'sp' || name === 'pc' || name === 'x29' || name === 'x30'
                  ? 'special'
                  : ''
              }`}
              key={name}
            >
              <span className="register-name">{displayName(name, registerWidth)}</span>
              <div className="register-value">
                <code title={displayValue(registers[name], numberFormat, registerWidth === 'w' && name.startsWith('x') ? 32 : 64)}>
                  {displayValue(registers[name], numberFormat, registerWidth === 'w' && name.startsWith('x') ? 32 : 64)}
                </code>
                {pointer && (
                  <button
                    className="pointer-hint"
                    type="button"
                    onClick={() => onPointerNavigate(registers[name])}
                    title={`View ${displayName(name, 'x')} in Memory`}
                  >
                    └──› {pointer}
                  </button>
                )}
              </div>
              {changedRegisters.has(name) && <span className="change-marker">CHANGED</span>}
            </div>
          );
        })}
      </div>

      <div className="register-note">
        <span className="note-icon">i</span>
        <p>
          <strong>{registerWidth === 'w' ? 'W view:' : 'X/W relationship:'}</strong>{' '}
          W0–W30 show the lower 32 bits of X0–X30. Writing W0 zero-extends into X0.
        </p>
      </div>
    </section>
  );
}
