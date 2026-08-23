import type { CPUFlags, CPUSnapshot, FlagName } from '../../arm64/cpu';
import type {
  MemoryOperand,
  Operand,
  ParsedInstruction,
  RegisterOperand,
} from '../../arm64/parser';
import {
  X_REGISTER_NAMES,
  formatHex,
  readRegister,
  type OperandRegisterName,
  type RegisterName,
  type RegisterState,
} from '../../arm64/registers';
import '../../visualizations.css';

type ChangeCollection<T> = readonly T[] | ReadonlySet<T>;

/** A UI action represented entirely by snapshots from the real ARM64 engine. */
export interface VisualizationTransition {
  before: CPUSnapshot;
  after: CPUSnapshot;
  instruction: ParsedInstruction | null;
  direction: 'forward' | 'back' | 'run' | 'reset';
  changedRegisters: ChangeCollection<RegisterName>;
  changedMemory: ChangeCollection<bigint>;
  changedFlags: ChangeCollection<FlagName>;
}

export interface DynamicVisualizerProps {
  transition: VisualizationTransition;
  describeAddress?: (address: bigint, register?: RegisterName) => string | null | undefined;
  compact?: boolean;
}

interface FlowNode {
  label: string;
  value: string;
}

interface DataFlow {
  sources: FlowNode[];
  operation: string;
  targets: FlowNode[];
  note?: string;
}

interface PointerView {
  register: RegisterName;
  address: bigint;
  description: string;
  preview: string | null;
}

const FLAG_NAMES: FlagName[] = ['N', 'Z', 'C', 'V'];

function asSet<T>(values: ChangeCollection<T>): ReadonlySet<T> {
  return values instanceof Set ? values : new Set(values);
}

function registerLabel(name: RegisterName | OperandRegisterName): string {
  if (name === 'x29') return 'X29 / FP';
  if (name === 'x30') return 'X30 / LR';
  return name.toUpperCase();
}

function shortHex(value: bigint): string {
  const full = formatHex(value);
  return `0x…${full.slice(-8)}`;
}

function signedDelta(value: bigint): string {
  if (value === 0n) return 'unchanged';
  return `${value > 0n ? '+' : '−'}${(value > 0n ? value : -value).toString()}`;
}

function readMemory(memory: ReadonlyMap<bigint, number>, address: bigint, size = 8): bigint {
  let value = 0n;
  for (let offset = 0; offset < size; offset += 1) {
    value |= BigInt(memory.get(address + BigInt(offset)) ?? 0) << BigInt(offset * 8);
  }
  return value;
}

function memoryRowChanged(
  before: ReadonlyMap<bigint, number>,
  after: ReadonlyMap<bigint, number>,
  explicitChanges: ReadonlySet<bigint>,
  address: bigint,
): boolean {
  for (let offset = 0; offset < 8; offset += 1) {
    const byteAddress = address + BigInt(offset);
    if (explicitChanges.has(byteAddress)) return true;
    if (before.get(byteAddress) !== after.get(byteAddress)) return true;
    if (before.has(byteAddress) !== after.has(byteAddress)) return true;
  }
  return false;
}

function operandValue(operand: Operand | undefined, registers: RegisterState): bigint | null {
  if (!operand) return null;
  if (operand.kind === 'register') return readRegister(registers, operand.name);
  if (operand.kind === 'immediate') return operand.value;
  return null;
}

function operandLabel(operand: Operand | undefined): string {
  if (!operand) return '—';
  if (operand.kind === 'register') return registerLabel(operand.name);
  if (operand.kind === 'immediate') return `#${operand.value.toString()}`;
  if (operand.kind === 'literal-label') return `=${operand.name}`;
  if (operand.kind === 'label') return operand.name;
  const offset = operand.offset === 0n
    ? ''
    : `, #${operand.offset.toString()}`;
  return `[${operand.base.toUpperCase()}${offset}]${operand.writeback === 'pre' ? '!' : ''}`;
}

function valueLabel(operand: Operand | undefined, registers: RegisterState): string {
  const value = operandValue(operand, registers);
  if (value === null) return operandLabel(operand);
  const bits = operand?.kind === 'register' && operand.name.startsWith('w') ? 32 : 64;
  return formatHex(value, bits);
}

function effectiveAddress(memoryOperand: MemoryOperand, registers: RegisterState): bigint {
  const base = readRegister(registers, memoryOperand.base);
  return memoryOperand.writeback === 'post' ? base : base + memoryOperand.offset;
}

function registerWidth(name: OperandRegisterName): number {
  return name.startsWith('w') ? 4 : 8;
}

function buildDataFlow(
  instruction: ParsedInstruction | null,
  input: CPUSnapshot,
  output: CPUSnapshot,
): DataFlow | null {
  if (!instruction) return null;
  const { opcode, operands } = instruction;
  const destination = operands[0]?.kind === 'register' ? operands[0] : null;

  if (opcode === 'mov' && destination) {
    return {
      sources: [{ label: operandLabel(operands[1]), value: valueLabel(operands[1], input.registers) }],
      operation: 'MOV',
      targets: [{
        label: registerLabel(destination.name),
        value: formatHex(readRegister(output.registers, destination.name), destination.name.startsWith('w') ? 32 : 64),
      }],
    };
  }

  if ((opcode === 'add' || opcode === 'sub') && destination) {
    return {
      sources: [operands[1], operands[2]].map((operand) => ({
        label: operandLabel(operand),
        value: valueLabel(operand, input.registers),
      })),
      operation: opcode.toUpperCase(),
      targets: [{
        label: registerLabel(destination.name),
        value: formatHex(readRegister(output.registers, destination.name), destination.name.startsWith('w') ? 32 : 64),
      }],
    };
  }

  if (opcode === 'ldr' && destination && operands[1]?.kind === 'literal-label') {
    return {
      sources: [{ label: `address of ${operands[1].name}`, value: operands[1].name }],
      operation: 'ADDRESS',
      targets: [{
        label: registerLabel(destination.name),
        value: formatHex(readRegister(output.registers, destination.name), destination.name.startsWith('w') ? 32 : 64),
      }],
      note: 'The address is loaded; memory is not dereferenced.',
    };
  }

  if (!['ldr', 'ldrb', 'str', 'strb', 'ldp', 'stp'].includes(opcode)) return null;
  const isPair = opcode === 'ldp' || opcode === 'stp';
  const memoryOperand = operands[isPair ? 2 : 1];
  if (memoryOperand?.kind !== 'memory' || !destination) return null;
  const address = effectiveAddress(memoryOperand, input.registers);
  const firstWidth = opcode.endsWith('b') ? 1 : registerWidth(destination.name);
  const addressNode = (at: bigint, width: number): FlowNode => ({
    label: `[${shortHex(at)}]`,
    value: formatHex(readMemory(output.memory, at, width), width * 8),
  });
  const registerNode = (operand: RegisterOperand): FlowNode => ({
    label: registerLabel(operand.name),
    value: formatHex(readRegister(input.registers, operand.name), operand.name.startsWith('w') ? 32 : 64),
  });

  if (opcode === 'ldr' || opcode === 'ldrb') {
    return {
      sources: [{
        label: `[${shortHex(address)}]`,
        value: formatHex(readMemory(input.memory, address, firstWidth), firstWidth * 8),
      }],
      operation: opcode.toUpperCase(),
      targets: [{
        label: registerLabel(destination.name),
        value: formatHex(readRegister(output.registers, destination.name), destination.name.startsWith('w') ? 32 : 64),
      }],
      note: `Read memory at ${formatHex(address)}.`,
    };
  }

  if (opcode === 'str' || opcode === 'strb') {
    return {
      sources: [registerNode(destination)],
      operation: opcode.toUpperCase(),
      targets: [addressNode(address, firstWidth)],
      note: `Store into memory at ${formatHex(address)}.`,
    };
  }

  const second = operands[1]?.kind === 'register' ? operands[1] : null;
  if (!second) return null;
  const secondAddress = address + BigInt(firstWidth);
  if (opcode === 'ldp') {
    return {
      sources: [
        { label: `[${shortHex(address)}]`, value: formatHex(readMemory(input.memory, address, firstWidth), firstWidth * 8) },
        { label: `[${shortHex(secondAddress)}]`, value: formatHex(readMemory(input.memory, secondAddress, firstWidth), firstWidth * 8) },
      ],
      operation: 'LDP',
      targets: [destination, second].map((operand) => ({
        label: registerLabel(operand.name),
        value: formatHex(readRegister(output.registers, operand.name), operand.name.startsWith('w') ? 32 : 64),
      })),
      note: memoryOperand.writeback === 'post'
        ? `Load the pair, then move ${memoryOperand.base.toUpperCase()} by ${memoryOperand.offset.toString()}.`
        : undefined,
    };
  }

  return {
    sources: [registerNode(destination), registerNode(second)],
    operation: 'STP',
    targets: [addressNode(address, firstWidth), addressNode(secondAddress, firstWidth)],
    note: memoryOperand.writeback === 'pre'
      ? `Move ${memoryOperand.base.toUpperCase()} by ${memoryOperand.offset.toString()}, then store the pair.`
      : undefined,
  };
}

function printablePreview(memory: ReadonlyMap<bigint, number>, address: bigint): string | null {
  if (!memory.has(address)) return null;
  let preview = '';
  for (let offset = 0; offset < 32; offset += 1) {
    const byte = memory.get(address + BigInt(offset));
    if (byte === undefined || byte === 0) break;
    if (byte === 10) {
      preview += '\\n';
    } else if (byte === 13) {
      preview += '\\r';
    } else if (byte === 9) {
      preview += '\\t';
    } else if (byte >= 0x20 && byte <= 0x7e) {
      preview += String.fromCharCode(byte);
    } else {
      return null;
    }
  }
  return preview.length >= 2 ? `"${preview}"` : null;
}

function pointerViews(
  snapshot: CPUSnapshot,
  changes: ReadonlySet<RegisterName>,
  describeAddress: DynamicVisualizerProps['describeAddress'],
  limit: number,
): PointerView[] {
  const order: RegisterName[] = [
    ...[...changes].filter((name) => name !== 'pc'),
    ...X_REGISTER_NAMES,
  ];
  const seen = new Set<RegisterName>();
  const views: PointerView[] = [];
  for (const register of order) {
    if (seen.has(register)) continue;
    seen.add(register);
    const address = snapshot.registers[register];
    if (address === 0n) continue;
    const described = describeAddress?.(address, register) ?? null;
    const isStoredMemory = snapshot.memory.has(address);
    const isStack = register === 'sp' && changes.has('sp');
    const codeFrame = snapshot.callStack.find((frame) => frame.address === address);
    if (!described && !isStoredMemory && !isStack && !codeFrame) continue;
    views.push({
      register,
      address,
      description: described ?? (codeFrame ? `code → ${codeFrame.name}` : isStack ? 'stack memory' : 'simulated memory'),
      preview: printablePreview(snapshot.memory, address),
    });
    if (views.length >= limit) break;
  }
  return views;
}

function changedRegisterNames(transition: VisualizationTransition): RegisterName[] {
  const explicit = asSet(transition.changedRegisters);
  const names = [...X_REGISTER_NAMES, 'sp', 'pc'] as RegisterName[];
  return names.filter((name) =>
    explicit.has(name) || transition.before.registers[name] !== transition.after.registers[name]);
}

function changedFlagNames(transition: VisualizationTransition): FlagName[] {
  const explicit = asSet(transition.changedFlags);
  return FLAG_NAMES.filter((name) => explicit.has(name) || transition.before.flags[name] !== transition.after.flags[name]);
}

function stackAddresses(beforeSP: bigint, afterSP: bigint, compact: boolean): bigint[] {
  const alignedAfter = afterSP & ~7n;
  const alignedBefore = beforeSP & ~7n;
  const radius = compact ? 2 : 3;
  const addresses = new Set<bigint>([alignedBefore, alignedAfter]);
  for (let index = -radius; index <= radius; index += 1) {
    addresses.add(alignedAfter + BigInt(index * 8));
  }
  return [...addresses].sort((left, right) => left > right ? -1 : left < right ? 1 : 0);
}

function transitionTitle(transition: VisualizationTransition): string {
  if (transition.direction === 'reset') return 'Reset CPU state';
  if (transition.direction === 'back') return transition.instruction
    ? `Previous · undo ${transition.instruction.opcode.toUpperCase()}`
    : 'Previous state restored';
  if (transition.direction === 'run') return 'Run completed';
  return transition.instruction?.sourceText ?? 'CPU state updated';
}

function flagSummary(flags: CPUFlags): string {
  return FLAG_NAMES.map((name) => `${name}=${flags[name] ? '1' : '0'}`).join('  ');
}

export function DynamicVisualizer({ transition, describeAddress, compact = false }: DynamicVisualizerProps) {
  const { before, after, instruction, direction } = transition;
  const explicitMemoryChanges = asSet(transition.changedMemory);
  const registerChanges = changedRegisterNames(transition);
  const flagChanges = changedFlagNames(transition);
  // A Run transition can contain thousands of instructions. Its endpoint
  // snapshots are valid for net state, but they are not the adjacent input and
  // output of the final instruction, so never imply a per-instruction flow.
  const hasAdjacentInstructionStates = direction === 'forward' || direction === 'back';
  const executionInput = direction === 'back' ? after : before;
  const executionOutput = direction === 'back' ? before : after;
  // Previous restores a snapshot; it does not execute an inverse LDR/STR/LDP.
  // Register and stack cards show that reversal without inventing an operation.
  const dataFlow = direction === 'forward'
    ? buildDataFlow(instruction, executionInput, executionOutput)
    : null;
  const stackRows = stackAddresses(before.registers.sp, after.registers.sp, compact);
  const pointers = pointerViews(after, new Set(registerChanges), describeAddress, compact ? 1 : 2);
  const spMoved = before.registers.sp !== after.registers.sp;
  const callStackChanged = before.callStack.length !== after.callStack.length;
  const isCallInstruction = hasAdjacentInstructionStates
    && (instruction?.opcode === 'bl' || instruction?.opcode === 'blr');
  const isReturnInstruction = hasAdjacentInstructionStates && instruction?.opcode === 'ret';
  const showCalls = isCallInstruction || isReturnInstruction || callStackChanged;
  const isConditionalBranch = hasAdjacentInstructionStates && (instruction?.opcode.startsWith('b.') ?? false);
  const isComparison = hasAdjacentInstructionStates
    && (instruction?.opcode === 'cmp' || instruction?.opcode === 'tst');
  const observedBranchOutput = direction === 'back' ? before : after;
  const branchTaken = (direction === 'back' ? before.lastBranchTaken : after.lastBranchTaken) ?? false;
  const animationKey = [
    direction,
    before.historyDepth,
    after.historyDepth,
    before.registers.pc.toString(16),
    after.registers.pc.toString(16),
    instruction?.sourceLine ?? 0,
    [...explicitMemoryChanges].map((address) => address.toString(16)).join(','),
  ].join(':');
  const visibleRegisterChanges = registerChanges.slice(0, compact ? 4 : 8);

  return (
    <section
      className={`dynamic-visualizer ${compact ? 'dv-compact' : ''} dv-${direction}`}
      aria-label="Live ARM64 state visualization"
      data-testid="dynamic-visualizer"
      key={animationKey}
    >
      <header className="dv-header">
        <div>
          <span className="dv-eyebrow">LIVE CPU VISUALIZATION</span>
          <h2>{compact ? 'Live state' : 'What the CPU just did'}</h2>
        </div>
        <code className="dv-instruction">{transitionTitle(transition)}</code>
      </header>

      <p className="dv-sr-only" aria-live="polite">
        {transitionTitle(transition)}. {registerChanges.length} registers changed.
        {spMoved ? ` Stack pointer is now ${formatHex(after.registers.sp)}.` : ''}
      </p>

      {visibleRegisterChanges.length > 0 && (
        <section className="dv-card dv-register-changes" aria-labelledby={`dv-register-title-${animationKey}`}>
          <div className="dv-section-heading">
            <h3 id={`dv-register-title-${animationKey}`}>Register changes</h3>
            {registerChanges.length > visibleRegisterChanges.length && (
              <span>+{registerChanges.length - visibleRegisterChanges.length} more</span>
            )}
          </div>
          <div className="dv-register-grid">
            {visibleRegisterChanges.map((name) => (
              <div className="dv-register-change" key={name} data-register={name}>
                <strong>{registerLabel(name)}</strong>
                <code className="dv-old-value">{formatHex(before.registers[name])}</code>
                <span className="dv-change-arrow" aria-hidden="true">→</span>
                <code className="dv-new-value">{formatHex(after.registers[name])}</code>
              </div>
            ))}
          </div>
        </section>
      )}

      {dataFlow && (
        <section className="dv-card dv-data-flow" aria-label={`${dataFlow.operation} data flow`}>
          <h3>Data flow</h3>
          <div className="dv-flow-track">
            <div className="dv-flow-side dv-flow-sources">
              {dataFlow.sources.map((node, index) => (
                <div className="dv-flow-node" key={`${node.label}-${index}`}>
                  <span>{node.label}</span><code>{node.value}</code>
                </div>
              ))}
            </div>
            <div className="dv-operation" aria-label={dataFlow.operation}>
              <span>{dataFlow.operation}</span>
              <svg viewBox="0 0 96 24" role="img" aria-label="flows to">
                <path d="M2 12 H86" />
                <path d="m78 4 10 8-10 8" />
              </svg>
            </div>
            <div className="dv-flow-side dv-flow-targets">
              {dataFlow.targets.map((node, index) => (
                <div className="dv-flow-node dv-flow-result" key={`${node.label}-${index}`}>
                  <span>{node.label}</span><code>{node.value}</code>
                </div>
              ))}
            </div>
          </div>
          {dataFlow.note && <p className="dv-note">{dataFlow.note}</p>}
        </section>
      )}

      <section className="dv-card dv-stack" aria-labelledby={`dv-stack-title-${animationKey}`} data-testid="dynamic-stack">
        <div className="dv-section-heading">
          <div>
            <h3 id={`dv-stack-title-${animationKey}`}>Stack</h3>
            <span>Higher addresses <b aria-hidden="true">↑</b></span>
          </div>
          {spMoved && (
            <div className="dv-sp-motion" aria-label={`SP moved from ${formatHex(before.registers.sp)} to ${formatHex(after.registers.sp)}`}>
              <code>{shortHex(before.registers.sp)}</code>
              <span className="dv-sp-arrow" aria-hidden="true">→</span>
              <code>{shortHex(after.registers.sp)}</code>
              <em>{signedDelta(after.registers.sp - before.registers.sp)} bytes</em>
            </div>
          )}
        </div>
        <div className="dv-stack-list">
          {stackRows.map((address) => {
            const isCurrentSP = address === (after.registers.sp & ~7n);
            const isOldSP = spMoved && address === (before.registers.sp & ~7n);
            const changed = memoryRowChanged(before.memory, after.memory, explicitMemoryChanges, address);
            const beforeValue = readMemory(before.memory, address);
            const afterValue = readMemory(after.memory, address);
            return (
              <div
                className={`dv-stack-row ${isCurrentSP ? 'dv-current-sp' : ''} ${isOldSP ? 'dv-old-sp' : ''} ${changed ? 'dv-stack-changed' : ''}`}
                key={address.toString()}
              >
                <code className="dv-stack-address" title={formatHex(address)}>{shortHex(address)}</code>
                <div className="dv-stack-cell">
                  {changed && beforeValue !== afterValue && <code className="dv-memory-before">{formatHex(beforeValue)}</code>}
                  <code>{formatHex(afterValue)}</code>
                </div>
                <div className="dv-stack-markers">
                  {isOldSP && <span className="dv-old-sp-marker">old SP</span>}
                  {isCurrentSP && <span className="dv-sp-marker">SP</span>}
                  {changed && <span className="dv-write-marker">changed</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="dv-stack-direction">Lower addresses <b aria-hidden="true">↓</b></div>
      </section>

      {pointers.length > 0 && (
        <section className="dv-card dv-pointers" aria-label="Live pointers" data-testid="dynamic-pointers">
          <h3>Pointers</h3>
          <div className="dv-pointer-list">
            {pointers.map((pointer) => (
              <div className="dv-pointer" key={pointer.register}>
                <div className="dv-pointer-source">
                  <strong>{registerLabel(pointer.register)}</strong>
                  <code>{formatHex(pointer.address)}</code>
                </div>
                <svg viewBox="0 0 150 46" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M2 8 C58 8 68 36 138 36" />
                  <path d="m128 29 11 7-11 7" />
                </svg>
                <div className="dv-pointer-target">
                  <code>{formatHex(pointer.address)}</code>
                  <strong>{pointer.description}</strong>
                  {pointer.preview && <span>{pointer.preview}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(isComparison || isConditionalBranch || flagChanges.length > 0) && (
        <section className="dv-card dv-control-flow" aria-label="Flags and branch visualization" data-testid="dynamic-branch">
          <h3>{isConditionalBranch ? 'Branch decision' : 'Flags'}</h3>
          {isComparison && instruction && (
            <div className="dv-comparison">
              <div><span>{operandLabel(instruction.operands[0])}</span><code>{valueLabel(instruction.operands[0], executionInput.registers)}</code></div>
              <strong>{instruction.opcode.toUpperCase()}</strong>
              <div><span>{operandLabel(instruction.operands[1])}</span><code>{valueLabel(instruction.operands[1], executionInput.registers)}</code></div>
            </div>
          )}
          <div className="dv-flags" aria-label={`NZCV flags: ${flagSummary(after.flags)}`}>
            {FLAG_NAMES.map((name) => (
              <div className={`${after.flags[name] ? 'dv-flag-set' : ''} ${flagChanges.includes(name) ? 'dv-flag-changed' : ''}`} key={name}>
                <strong>{name}</strong><span>{after.flags[name] ? '1' : '0'}</span>
              </div>
            ))}
          </div>
          {isConditionalBranch && instruction && (
            <div className={`dv-branch-result ${branchTaken ? 'dv-branch-taken' : 'dv-branch-skipped'}`}>
              <code>{instruction.opcode.toUpperCase()}</code>
              <strong>{branchTaken ? '✓ TAKEN' : '✕ NOT TAKEN'}</strong>
              <span aria-hidden="true">→</span>
              <code>
                {branchTaken && instruction.operands[0]?.kind === 'label'
                  ? `${instruction.operands[0].name}:`
                  : formatHex(observedBranchOutput.registers.pc)}
              </code>
              {direction === 'back' && <em>rewound</em>}
            </div>
          )}
        </section>
      )}

      {showCalls && (
        <section className="dv-card dv-calls" aria-label="Function call visualization" data-testid="dynamic-calls">
          <div className="dv-section-heading">
            <h3>Function calls</h3>
            <span className={`dv-call-event ${callStackChanged ? 'dv-call-event-active' : ''}`}>
              {direction === 'reset'
                ? 'Call stack reset'
                : direction === 'run'
                  ? 'Run call state'
                  : direction === 'back'
                ? 'Call state restored'
                : after.callStack.length > before.callStack.length
                  ? 'Call entered'
                  : after.callStack.length < before.callStack.length
                    ? 'Returned'
                    : isCallInstruction
                      ? 'Call'
                      : 'Return'}
            </span>
          </div>
          <div className="dv-pc-flow">
            <div><span>PC</span><code>{formatHex(before.registers.pc)}</code></div>
            <svg viewBox="0 0 96 24" aria-hidden="true"><path d="M2 12 H86"/><path d="m78 4 10 8-10 8"/></svg>
            <div><span>PC</span><code>{formatHex(after.registers.pc)}</code></div>
          </div>
          {(isCallInstruction || before.registers.x30 !== after.registers.x30) && (
            <div className="dv-lr-change">
              <strong>X30 / LR</strong>
              <code>{formatHex(before.registers.x30)}</code>
              <span aria-hidden="true">→</span>
              <code>{formatHex(after.registers.x30)}</code>
              <small>return address</small>
            </div>
          )}
          <ol className={`dv-call-stack ${after.callStack.length < before.callStack.length ? 'dv-call-pop' : 'dv-call-push'}`}>
            {after.callStack.map((frame, index) => (
              <li key={`${frame.name}-${frame.address.toString()}-${index}`}>
                <span>{index > 0 ? '↓' : ''}</span>
                <strong>{frame.name}</strong>
                <code>{shortHex(frame.address)}</code>
              </li>
            ))}
          </ol>
        </section>
      )}
    </section>
  );
}
