import { executeArithmetic } from './instructions/arithmetic';
import { executeBranch } from './instructions/branches';
import { executeComparison } from './instructions/comparison';
import { executeMemory } from './instructions/memory';
import { executeSyscall, type SyscallInfo } from './instructions/syscalls';
import { ARM64Memory, type MemorySnapshot } from './memory';
import { parseProgram, type ParsedInstruction, type ParsedProgram } from './parser';
import {
  STACK_TOP,
  cloneRegisters,
  createRegisterState,
  type RegisterName,
  type RegisterState,
} from './registers';

export interface CPUFlags {
  N: boolean;
  Z: boolean;
  C: boolean;
  V: boolean;
}

export type FlagName = keyof CPUFlags;

export interface CallFrame {
  name: string;
  address: bigint;
  returnAddress: bigint | null;
  arguments: bigint[];
}

export interface StepResult {
  executed: ParsedInstruction | null;
  changedRegisters: RegisterName[];
  changedMemory: bigint[];
  changedFlags: FlagName[];
  explanation: string;
  halted: boolean;
}

export interface CPUSnapshot {
  registers: RegisterState;
  memory: MemorySnapshot;
  flags: CPUFlags;
  callStack: CallFrame[];
  terminalOutput: string;
  lastSyscall: SyscallInfo | null;
  exited: boolean;
  exitCode: bigint | null;
  halted: boolean;
  lastExplanation: string;
  lastBranchTaken: boolean | null;
  changedMemory: bigint[];
  historyDepth: number;
}

interface InternalSnapshot extends Omit<CPUSnapshot, 'historyDepth'> {}

const EMPTY_PROGRAM: ParsedProgram = {
  source: '',
  instructions: [],
  labels: new Map(),
  symbols: new Map(),
  codeLabels: new Set(),
  data: [],
  entryPoint: 0n,
};
const EMPTY_FLAGS: CPUFlags = { N: false, Z: false, C: false, V: false };

/** Small, UI-independent ARM64 teaching CPU. */
export class ARM64CPU {
  public registers: RegisterState = createRegisterState();
  public readonly memory = new ARM64Memory();
  public flags: CPUFlags = { ...EMPTY_FLAGS };
  public callStack: CallFrame[] = [];
  public program: ParsedProgram = EMPTY_PROGRAM;
  public halted = true;
  public lastExplanation = 'Load a program, then press Step.';
  public lastBranchTaken: boolean | null = null;
  public changedMemory: bigint[] = [];
  public terminalOutput = '';
  public lastSyscall: SyscallInfo | null = null;
  public exited = false;
  public exitCode: bigint | null = null;
  private history: InternalSnapshot[] = [];

  loadProgram(source: string): void {
    this.program = parseProgram(source);
    this.reset();
  }

  reset(): void {
    this.registers = createRegisterState();
    this.registers.sp = STACK_TOP;
    this.registers.pc = this.program.entryPoint;
    this.memory.clear();
    for (const segment of this.program.data) {
      segment.bytes.forEach((byte, index) => this.memory.writeByte(segment.address + BigInt(index), byte));
    }
    this.flags = { ...EMPTY_FLAGS };
    this.changedMemory = [];
    this.terminalOutput = '';
    this.lastSyscall = null;
    this.exited = false;
    this.exitCode = null;
    this.lastBranchTaken = null;
    this.history = [];
    const rootName = this.labelAtAddress(this.program.entryPoint) ?? '_start';
    this.callStack = [{ name: rootName, address: this.program.entryPoint, returnAddress: null, arguments: [] }];
    this.halted = this.currentInstruction === null;
    this.lastExplanation = this.halted
      ? 'The program is empty.'
      : 'Ready. Step executes the highlighted instruction.';
  }

  get currentInstruction(): ParsedInstruction | null {
    if (this.registers.pc % 4n !== 0n) return null;
    const index = Number(this.registers.pc / 4n);
    return this.program.instructions[index] ?? null;
  }

  labelAtAddress(address: bigint): string | null {
    for (const name of this.program.codeLabels) {
      if (this.program.labels.get(name) === address) return name;
    }
    return null;
  }

  describeAddress(address: bigint): string | null {
    if (address >= STACK_TOP - 0x10000n && address <= STACK_TOP + 0x100n) return 'stack memory';
    for (const segment of this.program.data) {
      const end = segment.address + BigInt(segment.bytes.length);
      if (address >= segment.address && address < end) {
        const offset = address - segment.address;
        const exactSymbol = [...this.program.symbols.values()].find(
          (symbol) => symbol.section === 'data' && symbol.address === address,
        );
        const label = exactSymbol?.name ?? segment.label ?? 'data';
        if (offset === 0n) {
          const bytes: number[] = [];
          for (let index = 0; index < Math.min(segment.bytes.length, 48); index += 1) {
            const byte = this.memory.readByte(address + BigInt(index));
            if (byte === 0) break;
            bytes.push(byte);
          }
          const preview = new TextDecoder().decode(Uint8Array.from(bytes))
            .replaceAll('\\', '\\\\')
            .replaceAll('\n', '\\n')
            .replaceAll('\r', '\\r')
            .replaceAll('\t', '\\t')
            .replaceAll('"', '\\"');
          return preview ? `${label} → "${preview}"` : label;
        }
        return `${label} + ${offset}`;
      }
    }
    const exactDataSymbol = [...this.program.symbols.values()].find(
      (symbol) => symbol.section === 'data' && symbol.address === address,
    );
    if (exactDataSymbol) return exactDataSymbol.name;
    const codeLabel = this.labelAtAddress(address);
    return codeLabel ? `code → ${codeLabel}` : null;
  }

  get canStepBack(): boolean {
    return this.history.length > 0;
  }

  stepBack(): boolean {
    const previous = this.history.pop();
    if (!previous) return false;
    this.restore(previous);
    return true;
  }

  step(): StepResult {
    const instruction = this.currentInstruction;
    if (!instruction) {
      this.halted = true;
      this.lastBranchTaken = null;
      this.lastExplanation = 'Program complete.';
      return {
        executed: null,
        changedRegisters: [],
        changedMemory: [],
        changedFlags: [],
        explanation: this.lastExplanation,
        halted: true,
      };
    }

    this.history.push(this.capture());

    let changedRegisters: RegisterName[] = [];
    let changedMemory: bigint[] = [];
    let changedFlags: FlagName[] = [];
    let explanation = '';
    let nextPC = instruction.address + 4n;
    this.lastBranchTaken = null;

    if (instruction.opcode === 'mov' || instruction.opcode === 'add' || instruction.opcode === 'sub') {
      const effect = executeArithmetic(instruction, this.registers);
      changedRegisters = effect.changedRegisters;
      explanation = effect.explanation;
    } else if (['ldr', 'str', 'ldrb', 'strb', 'ldp', 'stp'].includes(instruction.opcode)) {
      const effect = executeMemory(instruction, this.registers, this.memory, this.program.labels);
      changedRegisters = effect.changedRegisters;
      changedMemory = effect.changedMemory;
      explanation = effect.explanation;
    } else if (instruction.opcode === 'cmp' || instruction.opcode === 'tst') {
      const effect = executeComparison(instruction, this.registers, this.flags);
      changedFlags = effect.changedFlags;
      explanation = effect.explanation;
    } else if (instruction.opcode === 'svc') {
      const effect = executeSyscall(this.registers, this.memory);
      this.lastSyscall = effect.info;
      this.terminalOutput += effect.output;
      this.exited = effect.halt;
      this.exitCode = effect.exitCode;
      explanation = effect.explanation;
    } else {
      const effect = executeBranch(
        instruction,
        this.registers,
        this.flags,
        this.program.labels,
        (address) => this.labelAtAddress(address),
      );
      changedRegisters = effect.changedRegisters;
      nextPC = effect.nextPC;
      explanation = effect.explanation;
      this.lastBranchTaken = effect.conditionTaken;
      if (effect.call) this.callStack.push({ ...effect.call });
      if (effect.returning && this.callStack.length > 1) this.callStack.pop();
    }

    this.registers.pc = nextPC;
    this.changedMemory = changedMemory;
    this.halted = this.exited || this.currentInstruction === null;
    this.lastExplanation = explanation;
    changedRegisters = [...new Set([...changedRegisters, 'pc' as RegisterName])];

    return {
      executed: instruction,
      changedRegisters,
      changedMemory,
      changedFlags,
      explanation,
      halted: this.halted,
    };
  }

  snapshot(): CPUSnapshot {
    return { ...this.capture(), historyDepth: this.history.length };
  }

  private capture(): InternalSnapshot {
    return {
      registers: cloneRegisters(this.registers),
      memory: this.memory.snapshot(),
      flags: { ...this.flags },
      callStack: this.callStack.map((frame) => ({ ...frame, arguments: [...frame.arguments] })),
      terminalOutput: this.terminalOutput,
      lastSyscall: this.lastSyscall
        ? { ...this.lastSyscall, arguments: this.lastSyscall.arguments.map((argument) => ({ ...argument })) }
        : null,
      exited: this.exited,
      exitCode: this.exitCode,
      halted: this.halted,
      lastExplanation: this.lastExplanation,
      lastBranchTaken: this.lastBranchTaken,
      changedMemory: [...this.changedMemory],
    };
  }

  private restore(snapshot: InternalSnapshot): void {
    this.registers = cloneRegisters(snapshot.registers);
    this.memory.restore(snapshot.memory);
    this.flags = { ...snapshot.flags };
    this.callStack = snapshot.callStack.map((frame) => ({ ...frame, arguments: [...frame.arguments] }));
    this.terminalOutput = snapshot.terminalOutput;
    this.lastSyscall = snapshot.lastSyscall
      ? { ...snapshot.lastSyscall, arguments: snapshot.lastSyscall.arguments.map((argument) => ({ ...argument })) }
      : null;
    this.exited = snapshot.exited;
    this.exitCode = snapshot.exitCode;
    this.halted = snapshot.halted;
    this.lastExplanation = snapshot.lastExplanation;
    this.lastBranchTaken = snapshot.lastBranchTaken;
    this.changedMemory = [...snapshot.changedMemory];
  }
}
