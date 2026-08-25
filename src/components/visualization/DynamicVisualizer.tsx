import type { CSSProperties } from 'react';
import type { CPUFlags, CPUSnapshot, FlagName } from '../../arm64/cpu';
import type {
  MemoryOperand,
  Operand,
  ParsedInstruction,
  RegisterOperand,
} from '../../arm64/parser';
import {
  MASK_64,
  X_REGISTER_NAMES,
  formatHex,
  readRegister,
  type OperandRegisterName,
  type RegisterName,
  type RegisterState,
} from '../../arm64/registers';
import type { LessonVisualFocus, StackVisualizationMode } from '../../learning/types';
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
  focus?: readonly LessonVisualFocus[];
  flagFocus?: readonly FlagName[];
  registerFocus?: readonly RegisterName[];
  stackVisualization?: StackVisualizationMode;
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

interface MemoryByteView {
  address: bigint;
  width: number;
  opcode: string;
  title: string;
  isContiguous: boolean;
  wraps: boolean;
  reconstructValue: boolean;
  bytes: Array<{ address: bigint; value: number; changed: boolean; offset: bigint }>;
}

interface SimpleStackView {
  stage: 'reserve' | 'use' | 'restore' | null;
  label: string;
  message: string;
}

interface ComparisonExplanation {
  operation: string;
  formula: string;
  zeroResult: string;
  unchanged: string;
}

const FLAG_NAMES: FlagName[] = ['N', 'Z', 'C', 'V'];

const SIMPLE_STACK_STAGES = [
  { id: 'reserve', number: '1', label: 'RESERVE', instruction: 'sub sp, sp, #16', note: 'move SP down' },
  { id: 'use', number: '2', label: 'USE', instruction: 'str x0, [sp] → ldr x1, [sp]', note: 'store and load 42' },
  { id: 'restore', number: '3', label: 'RESTORE', instruction: 'add sp, sp, #16', note: 'move SP back' },
] as const;

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

function simpleStackAddress(value: bigint): string {
  return `0x${formatHex(value).slice(-4)}`;
}

function signedDelta(value: bigint): string {
  if (value === 0n) return 'unchanged';
  return `${value > 0n ? '+' : '−'}${(value > 0n ? value : -value).toString()}`;
}

function normalizeAddress(address: bigint): bigint {
  return address & MASK_64;
}

function readMemory(memory: ReadonlyMap<bigint, number>, address: bigint, size = 8): bigint {
  let value = 0n;
  for (let offset = 0; offset < size; offset += 1) {
    value |= BigInt(memory.get(normalizeAddress(address + BigInt(offset))) ?? 0) << BigInt(offset * 8);
  }
  return value;
}

function buildSimpleStackView(transition: VisualizationTransition): SimpleStackView {
  const { before, after, instruction, direction } = transition;
  const stackOperand = instruction?.operands.find((operand) => operand.kind === 'memory');
  const usesSP = stackOperand?.kind === 'memory' && stackOperand.base === 'sp';

  if (direction === 'reset') {
    return {
      stage: null,
      label: 'READY',
      message: `SP starts at ${simpleStackAddress(after.registers.sp)}. No temporary space has been reserved yet.`,
    };
  }
  if (direction === 'back') {
    return {
      stage: null,
      label: 'STEP BACK',
      message: `The previous complete state was restored. SP is now ${simpleStackAddress(after.registers.sp)}.`,
    };
  }
  if (direction === 'run') {
    return {
      stage: 'restore',
      label: 'CYCLE COMPLETE',
      message: `The program reserved space, used it, and restored SP to ${simpleStackAddress(after.registers.sp)}.`,
    };
  }
  if (after.registers.sp < before.registers.sp) {
    const reservedBytes = before.registers.sp - after.registers.sp;
    return {
      stage: 'reserve',
      label: 'RESERVED',
      message: `SP moved down to ${simpleStackAddress(after.registers.sp)}. ${reservedBytes.toString()} bytes are reserved; memory contents did not change.`,
    };
  }
  if (usesSP && (instruction?.opcode === 'str' || instruction?.opcode === 'strb')) {
    const width = instruction.opcode === 'strb' ? 1 : 8;
    const storedValue = readMemory(after.memory, after.registers.sp, width);
    return {
      stage: 'use',
      label: 'VALUE STORED',
      message: `STR stored ${storedValue.toString()} in the reserved space. SP stays at ${simpleStackAddress(after.registers.sp)}.`,
    };
  }
  if (usesSP && (instruction?.opcode === 'ldr' || instruction?.opcode === 'ldrb')) {
    const destination = instruction.operands[0];
    const destinationLabel = destination?.kind === 'register' ? registerLabel(destination.name) : 'the register';
    const loadedValue = destination?.kind === 'register'
      ? readRegister(after.registers, destination.name)
      : 0n;
    return {
      stage: 'use',
      label: 'VALUE LOADED',
      message: `LDR loaded ${loadedValue.toString()} into ${destinationLabel}. The stored copy remains in memory.`,
    };
  }
  if (after.registers.sp > before.registers.sp) {
    return {
      stage: 'restore',
      label: 'SP RESTORED',
      message: `SP moved back to ${simpleStackAddress(after.registers.sp)}. The temporary space is finished; its old bytes were not erased.`,
    };
  }
  if (instruction?.opcode === 'mov') {
    return {
      stage: null,
      label: 'VALUE READY',
      message: `X0 now holds ${after.registers.x0.toString()}. SP and stack memory did not change.`,
    };
  }
  return {
    stage: null,
    label: 'NO STACK CHANGE',
    message: `SP stays at ${simpleStackAddress(after.registers.sp)}.`,
  };
}

function buildMemoryByteView(
  direction: VisualizationTransition['direction'],
  instruction: ParsedInstruction | null,
  before: CPUSnapshot,
  after: CPUSnapshot,
  explicitChanges: ReadonlySet<bigint>,
): MemoryByteView | null {
  // Only a forward Step has adjacent instruction input/output snapshots. A Run
  // may retain its final parsed instruction, but `before` is the state from the
  // beginning of the whole Run. Using those registers to calculate the final
  // instruction's address would invent a false per-instruction visualization.
  const memoryOperand = direction === 'forward'
    ? instruction?.operands.find((operand) => operand.kind === 'memory')
    : null;
  if (direction === 'forward' && instruction && memoryOperand?.kind === 'memory') {
    const firstRegister = instruction.operands[0]?.kind === 'register'
      ? instruction.operands[0]
      : null;
    if (!firstRegister) return null;
    const singleWidth = instruction.opcode.endsWith('b') ? 1 : registerWidth(firstRegister.name);
    const width = instruction.opcode === 'ldp' || instruction.opcode === 'stp'
      ? singleWidth * 2
      : singleWidth;
    const address = effectiveAddress(memoryOperand, before.registers);
    const addresses = Array.from({ length: width }, (_, index) => normalizeAddress(address + BigInt(index)));
    return {
      address,
      width,
      opcode: instruction.opcode.toUpperCase(),
      title: 'Memory bytes for this Step',
      isContiguous: true,
      wraps: addresses.some((byteAddress, index) => index > 0 && byteAddress < addresses[index - 1]),
      reconstructValue: width <= 8,
      bytes: addresses.map((byteAddress, index) => {
        return {
          address: byteAddress,
          value: after.memory.get(byteAddress) ?? 0,
          changed: explicitChanges.has(byteAddress),
          offset: BigInt(index),
        };
      }),
    };
  }

  const changedAddresses = [...explicitChanges]
    .sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  if (changedAddresses.length === 0) return null;
  const isContiguous = changedAddresses.every((address, index) => (
    index === 0 || address === changedAddresses[index - 1] + 1n
  ));
  return {
    address: changedAddresses[0],
    width: changedAddresses.length,
    opcode: direction === 'back' ? 'RESTORED' : 'RUN CHANGES',
    title: direction === 'back'
      ? 'Memory restored by Step Back'
      : 'Memory changed during Run',
    isContiguous,
    wraps: false,
    reconstructValue: false,
    bytes: changedAddresses.map((address) => ({
      address,
      value: after.memory.get(address) ?? 0,
      changed: true,
      offset: address - changedAddresses[0],
    })),
  };
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

function buildComparisonExplanation(
  instruction: ParsedInstruction,
  input: CPUSnapshot,
  output: CPUSnapshot,
): ComparisonExplanation | null {
  if (instruction.opcode !== 'cmp' && instruction.opcode !== 'tst') return null;
  const leftOperand = instruction.operands[0];
  const rightOperand = instruction.operands[1];
  if (leftOperand?.kind !== 'register' || !rightOperand) return null;
  const left = operandValue(leftOperand, input.registers);
  const right = operandValue(rightOperand, input.registers);
  if (left === null || right === null) return null;

  const bits = leftOperand.name.startsWith('w') ? 32 : 64;
  const widthMask = (1n << BigInt(bits)) - 1n;
  const result = instruction.opcode === 'cmp'
    ? (left - right) & widthMask
    : (left & right) & widthMask;
  const operator = instruction.opcode === 'cmp' ? '−' : 'AND';
  const leftLabel = operandLabel(leftOperand);
  const rightLabel = operandLabel(rightOperand);
  const isZero = result === 0n;

  return {
    operation: instruction.opcode === 'cmp'
      ? 'CMP means Compare · temporary subtraction'
      : 'TST means Test Bits · temporary bitwise AND',
    formula: `${formatHex(left, bits)} ${operator} ${formatHex(right, bits)} = ${formatHex(result, bits)}`,
    zeroResult: `${isZero ? 'Zero' : 'Non-zero'} temporary answer → Z = ${output.flags.Z ? '1' : '0'}`,
    unchanged: `${leftLabel}${rightOperand.kind === 'register' ? ` and ${rightLabel}` : ''} ${rightOperand.kind === 'register' ? 'stay' : 'stays'} unchanged`,
  };
}

function effectiveAddress(memoryOperand: MemoryOperand, registers: RegisterState): bigint {
  const base = readRegister(registers, memoryOperand.base);
  return normalizeAddress(memoryOperand.writeback === 'post' ? base : base + memoryOperand.offset);
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
  const secondAddress = normalizeAddress(address + BigInt(firstWidth));
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
  if (!memory.has(normalizeAddress(address))) return null;
  let preview = '';
  for (let offset = 0; offset < 32; offset += 1) {
    const byte = memory.get(normalizeAddress(address + BigInt(offset)));
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
    ? `Step Back · undo ${transition.instruction.opcode.toUpperCase()}`
    : 'Previous snapshot restored';
  if (transition.direction === 'run') return transition.after.halted
    ? 'Run completed'
    : 'Run paused at the step limit';
  return transition.instruction?.sourceText ?? 'CPU state updated';
}

function flagSummary(flags: CPUFlags, names: readonly FlagName[]): string {
  return names.map((name) => `${name}=${flags[name] ? '1' : '0'}`).join('  ');
}

function phaseAction(transition: VisualizationTransition): string {
  if (transition.direction === 'reset') return 'Press Step';
  if (transition.direction === 'back') return 'Restore previous snapshot';
  if (transition.direction === 'run') return 'Run program';
  return transition.instruction?.sourceText ?? 'Update CPU state';
}

function WatchedRegisters({
  snapshot,
  registers,
  comparison,
}: {
  snapshot: CPUSnapshot;
  registers: readonly RegisterName[];
  comparison?: CPUSnapshot;
}) {
  return (
    <div className="dv-phase-registers">
      {registers.map((name) => {
        const changed = comparison !== undefined
          && snapshot.registers[name] !== comparison.registers[name];
        return (
          <div
            className={`dv-phase-register ${changed ? 'dv-phase-register-changed' : ''}`}
            data-register={name}
            key={name}
          >
            <strong>{registerLabel(name)}</strong>
            <code>{formatHex(snapshot.registers[name])}</code>
            {comparison && !changed && <small>unchanged</small>}
          </div>
        );
      })}
    </div>
  );
}

export function DynamicVisualizer({
  transition,
  describeAddress,
  compact = false,
  focus,
  flagFocus,
  registerFocus,
  stackVisualization = 'detailed',
}: DynamicVisualizerProps) {
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
  const memoryByteView = direction === 'reset'
    ? null
    : buildMemoryByteView(direction, instruction, before, after, explicitMemoryChanges);
  const stackRows = stackAddresses(before.registers.sp, after.registers.sp, compact);
  const registerChangeSet = new Set(registerChanges);
  const watchedRegisters = registerFocus
    ? [...new Set(registerFocus)].slice(0, compact ? 4 : 8)
    : [];
  const hasRegisterScope = watchedRegisters.length > 0;
  const scopedRegisterChanges = hasRegisterScope
    ? watchedRegisters.filter((name) => registerChangeSet.has(name))
    : registerChanges;
  const pointers = pointerViews(after, registerChangeSet, describeAddress, compact ? 1 : 2)
    .filter((pointer) => !hasRegisterScope || watchedRegisters.includes(pointer.register));
  const spMoved = before.registers.sp !== after.registers.sp;
  const callStackChanged = before.callStack.length !== after.callStack.length;
  const isCallInstruction = hasAdjacentInstructionStates
    && (instruction?.opcode === 'bl' || instruction?.opcode === 'blr');
  const isReturnInstruction = hasAdjacentInstructionStates && instruction?.opcode === 'ret';
  const showCalls = isCallInstruction || isReturnInstruction || callStackChanged;
  const showInitialCalls = direction === 'reset' && (focus?.includes('calls') ?? false);
  const isConditionalBranch = hasAdjacentInstructionStates && (instruction?.opcode.startsWith('b.') ?? false);
  const isComparison = direction === 'forward'
    && (instruction?.opcode === 'cmp' || instruction?.opcode === 'tst');
  const comparisonExplanation = isComparison && instruction
    ? buildComparisonExplanation(instruction, executionInput, executionOutput)
    : null;
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
  const visibleRegisterChanges = scopedRegisterChanges.slice(0, compact ? 4 : 8);
  const shows = (area: LessonVisualFocus): boolean => !focus || focus.includes(area);
  const showRegisterChanges = hasRegisterScope || shows('registers');
  const stackOperand = instruction?.operands.find((operand) => operand.kind === 'memory');
  const showStackDataFlow = shows('stack') && stackOperand?.kind === 'memory' && stackOperand.base === 'sp';
  const showDataFlow = shows('registers') || shows('memory') || shows('pointers') || showStackDataFlow;
  const simpleStackView = shows('stack') && stackVisualization === 'simple'
    ? buildSimpleStackView(transition)
    : null;
  const visibleFlags = flagFocus ?? FLAG_NAMES;
  const phaseBefore = direction === 'reset' ? after : before;

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

      {showRegisterChanges && hasRegisterScope && (
        <section className="dv-card dv-phase-timeline" aria-label="Before, execute, and after register state" data-testid="dynamic-context">
          <div className="dv-section-heading">
            <h3>{direction !== 'reset' && visibleRegisterChanges.length > 0 ? 'Register changes' : 'Registers to watch'}</h3>
            <span>{visibleRegisterChanges.length > 0 ? `${visibleRegisterChanges.length} changed` : 'focused state only'}</span>
          </div>
          <div className="dv-phase-track">
            <div className="dv-phase dv-phase-before" data-testid="visual-phase-before">
              <span>Before</span>
              <WatchedRegisters snapshot={phaseBefore} registers={watchedRegisters} />
            </div>
            <span className="dv-phase-arrow" aria-hidden="true">→</span>
            <div className="dv-phase dv-phase-execute" data-testid="visual-phase-execute">
              <span>Execute</span>
              <code>{phaseAction(transition)}</code>
            </div>
            <span className="dv-phase-arrow" aria-hidden="true">→</span>
            <div className="dv-phase dv-phase-after" data-testid="visual-phase-after">
              <span>After</span>
              {direction === 'reset'
                ? <p>Waiting for the first Step.</p>
                : <WatchedRegisters snapshot={after} registers={watchedRegisters} comparison={before} />}
            </div>
          </div>
        </section>
      )}

      {showRegisterChanges && !hasRegisterScope && visibleRegisterChanges.length > 0 && (
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

      {showDataFlow && dataFlow && (
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

      {shows('memory') && memoryByteView && (
        <section
          className="dv-card dv-memory-bytes"
          aria-label="Little-endian memory bytes"
          data-testid="dynamic-memory-bytes"
        >
          <div className="dv-section-heading">
            <div>
              <h3>{memoryByteView.title}</h3>
              <span>
                {memoryByteView.wraps
                  ? 'Address order wraps from 0xFFFF… to zero'
                  : memoryByteView.isContiguous ? 'Lowest address first' : 'Sorted by address'}
              </span>
            </div>
            <code>{memoryByteView.opcode} · {memoryByteView.width} byte{memoryByteView.width === 1 ? '' : 's'}</code>
          </div>
          <div className="dv-byte-address-range">
            <code>{formatHex(memoryByteView.address)}</code>
            <span aria-hidden="true">
              {memoryByteView.wraps
                ? 'increasing address → wraps to zero'
                : memoryByteView.isContiguous ? 'low address → high address' : 'lowest change → highest change'}
            </span>
            <code>{formatHex(memoryByteView.bytes.at(-1)?.address ?? memoryByteView.address)}</code>
          </div>
          <div
            className="dv-byte-strip"
            style={{ '--dv-byte-columns': Math.min(memoryByteView.bytes.length, 8) } as CSSProperties}
          >
            {memoryByteView.bytes.map((byte) => (
              <div className={byte.changed ? 'dv-byte-changed' : ''} key={byte.address.toString()}>
                <code>{byte.value.toString(16).padStart(2, '0')}</code>
                <small>+{byte.offset.toString()}</small>
              </div>
            ))}
          </div>
          {memoryByteView.reconstructValue && memoryByteView.width > 1 && (
            <p className="dv-endian-explanation">
              {memoryByteView.wraps
                ? 'Little endian stores the least-significant byte at the effective address. Following bytes use increasing addresses and wrap to zero.'
                : 'Little endian stores the least-significant byte at the lowest address.'}{' '}
              The {memoryByteView.width * 8}-bit value still reconstructs as{' '}
              <code>{formatHex(readMemory(after.memory, memoryByteView.address, memoryByteView.width), memoryByteView.width * 8)}</code>.
            </p>
          )}
        </section>
      )}

      {simpleStackView && (
        <section
          className="dv-card dv-stack dv-simple-stack"
          aria-labelledby={`dv-simple-stack-title-${animationKey}`}
          data-testid="dynamic-stack"
        >
          <div className="dv-section-heading">
            <div>
              <h3 id={`dv-simple-stack-title-${animationKey}`}>Stack · simple view</h3>
              <span>ordinary memory</span>
            </div>
            <code className="dv-simple-stack-sp">SP = {simpleStackAddress(after.registers.sp)}</code>
          </div>
          <div className="dv-simple-stack-flow" aria-label="Reserve, use, and restore stack flow">
            {SIMPLE_STACK_STAGES.map((stage) => (
              <article
                className={`dv-simple-stack-stage ${simpleStackView.stage === stage.id ? 'dv-simple-stack-active' : ''}`}
                key={stage.id}
              >
                <header><span>{stage.number}</span><strong>{stage.label}</strong></header>
                <code>{stage.instruction}</code>
                <small>{stage.note}</small>
              </article>
            ))}
          </div>
          <div className="dv-simple-stack-status" aria-live="polite">
            <strong>{simpleStackView.label}</strong>
            <p>{simpleStackView.message}</p>
          </div>
        </section>
      )}

      {shows('stack') && stackVisualization === 'detailed' && <section className="dv-card dv-stack" aria-labelledby={`dv-stack-title-${animationKey}`} data-testid="dynamic-stack">
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
            const currentSPOffset = after.registers.sp - address;
            const oldSPOffset = before.registers.sp - address;
            const newlyReserved = after.registers.sp < before.registers.sp
              && address >= after.registers.sp
              && address < before.registers.sp;
            const newlyReleased = after.registers.sp > before.registers.sp
              && address >= before.registers.sp
              && address < after.registers.sp;
            const changed = memoryRowChanged(before.memory, after.memory, explicitMemoryChanges, address);
            const beforeValue = readMemory(before.memory, address);
            const afterValue = readMemory(after.memory, address);
            return (
              <div
                className={`dv-stack-row ${isCurrentSP ? 'dv-current-sp' : ''} ${isOldSP ? 'dv-old-sp' : ''} ${newlyReserved ? 'dv-stack-reserved' : ''} ${newlyReleased ? 'dv-stack-released' : ''} ${changed ? 'dv-stack-changed' : ''}`}
                key={address.toString()}
              >
                <code className="dv-stack-address" title={formatHex(address)}>{shortHex(address)}</code>
                <div className="dv-stack-cell">
                  {changed && beforeValue !== afterValue && <code className="dv-memory-before">{formatHex(beforeValue)}</code>}
                  <code>{formatHex(afterValue)}</code>
                </div>
                <div className="dv-stack-markers">
                  {isOldSP && (
                    <span className="dv-old-sp-marker" title={`Old SP = ${formatHex(before.registers.sp)}`}>
                      {oldSPOffset === 0n ? 'old SP' : `old SP at row +${oldSPOffset.toString()}`}
                    </span>
                  )}
                  {isCurrentSP && (
                    <span className="dv-sp-marker" title={`SP = ${formatHex(after.registers.sp)}`}>
                      {currentSPOffset === 0n ? 'SP' : `SP at row +${currentSPOffset.toString()}`}
                    </span>
                  )}
                  {newlyReserved && <span className="dv-range-marker dv-reserved-marker">current area</span>}
                  {newlyReleased && <span className="dv-range-marker dv-released-marker">may be reused</span>}
                  {changed && <span className="dv-write-marker">changed</span>}
                </div>
              </div>
            );
          })}
        </div>
        {spMoved && (
          <p className="dv-stack-plain-meaning">
            {after.registers.sp < before.registers.sp
              ? <>
                  SP changed <code>{formatHex(before.registers.sp)}</code> → <code>{formatHex(after.registers.sp)}</code>.{' '}
                  Addresses <code>{formatHex(after.registers.sp)}</code> through{' '}
                  <code>{formatHex(before.registers.sp - 1n)}</code> are now reserved as current stack space.
                  Changing SP alone does not modify memory bytes; only a store instruction does.
                </>
              : <>
                  SP changed <code>{formatHex(before.registers.sp)}</code> → <code>{formatHex(after.registers.sp)}</code>.{' '}
                  Addresses <code>{formatHex(before.registers.sp)}</code> through{' '}
                  <code>{formatHex(after.registers.sp - 1n)}</code> were released and may now be reused.
                  Their stored bytes remain until later code overwrites them.
                </>}
          </p>
        )}
        <div className="dv-stack-direction">Lower addresses <b aria-hidden="true">↓</b></div>
      </section>}

      {shows('pointers') && pointers.length > 0 && (
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

      {shows('flags') && (
        isComparison
        || isConditionalBranch
        || flagChanges.length > 0
        || (direction === 'reset' && (focus?.includes('flags') ?? false))
      ) && (
        <section className="dv-card dv-control-flow" aria-label="Flags and branch visualization" data-testid="dynamic-branch">
          <h3>{isConditionalBranch ? 'Branch decision' : 'Flags'}</h3>
          {isComparison && instruction && (
            <div className="dv-comparison-block">
              <div className="dv-comparison">
                <div><span>{operandLabel(instruction.operands[0])}</span><code>{valueLabel(instruction.operands[0], executionInput.registers)}</code></div>
                <strong>{instruction.opcode.toUpperCase()}</strong>
                <div><span>{operandLabel(instruction.operands[1])}</span><code>{valueLabel(instruction.operands[1], executionInput.registers)}</code></div>
              </div>
              {comparisonExplanation && (
                <div className="dv-comparison-explanation">
                  <strong>{comparisonExplanation.operation}</strong>
                  <code>{comparisonExplanation.formula}</code>
                  <span>{comparisonExplanation.zeroResult}</span>
                  <small>{comparisonExplanation.unchanged}</small>
                </div>
              )}
            </div>
          )}
          <div className="dv-flags" aria-label={`Condition flags: ${flagSummary(after.flags, visibleFlags)}`}>
            {visibleFlags.map((name) => (
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

      {shows('calls') && (showCalls || showInitialCalls) && (
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
