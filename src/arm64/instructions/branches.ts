import type { LabelOperand, ParsedInstruction, RegisterOperand } from '../parser';
import {
  X_REGISTER_NAMES,
  formatHex,
  readRegister,
  writeRegister,
  type RegisterName,
  type RegisterState,
} from '../registers';
import type { CPUFlags } from '../cpu';

export interface CallEffect {
  name: string;
  address: bigint;
  returnAddress: bigint;
  arguments: bigint[];
}

export interface BranchEffect {
  changedRegisters: RegisterName[];
  nextPC: bigint;
  explanation: string;
  call: CallEffect | null;
  returning: boolean;
}

function conditionPassed(opcode: string, flags: CPUFlags): boolean {
  switch (opcode) {
    case 'b.eq': return flags.Z;
    case 'b.ne': return !flags.Z;
    case 'b.gt': return !flags.Z && flags.N === flags.V;
    case 'b.lt': return flags.N !== flags.V;
    case 'b.ge': return flags.N === flags.V;
    case 'b.le': return flags.Z || flags.N !== flags.V;
    default: return true;
  }
}

export function executeBranch(
  instruction: ParsedInstruction,
  registers: RegisterState,
  flags: CPUFlags,
  labels: ReadonlyMap<string, bigint>,
  labelAtAddress: (address: bigint) => string | null,
): BranchEffect {
  const defaultNext = instruction.address + 4n;
  const base: BranchEffect = {
    changedRegisters: [],
    nextPC: defaultNext,
    explanation: '',
    call: null,
    returning: false,
  };

  if (instruction.opcode === 'ret') {
    const target = registers.x30;
    return { ...base, nextPC: target, explanation: `Return to ${formatHex(target)} using X30 / LR.`, returning: true };
  }

  if (instruction.opcode === 'br' || instruction.opcode === 'blr') {
    const register = instruction.operands[0] as RegisterOperand;
    const target = readRegister(registers, register.name);
    if (instruction.opcode === 'blr') {
      writeRegister(registers, 'x30', defaultNext);
      return {
        ...base,
        changedRegisters: ['x30'],
        nextPC: target,
        explanation: `Call ${register.name.toUpperCase()}; save ${formatHex(defaultNext)} in X30 / LR.`,
        call: {
          name: labelAtAddress(target) ?? formatHex(target),
          address: target,
          returnAddress: defaultNext,
          arguments: X_REGISTER_NAMES.slice(0, 8).map((name) => registers[name]),
        },
      };
    }
    return { ...base, nextPC: target, explanation: `Branch to the address in ${register.name.toUpperCase()}.` };
  }

  const labelOperand = instruction.operands[0] as LabelOperand;
  const target = labels.get(labelOperand.name)!;
  if (instruction.opcode.startsWith('b.') && !conditionPassed(instruction.opcode, flags)) {
    return { ...base, explanation: `${instruction.opcode.toUpperCase()} condition is false; continue.` };
  }
  if (instruction.opcode === 'bl') {
    writeRegister(registers, 'x30', defaultNext);
    return {
      ...base,
      changedRegisters: ['x30'],
      nextPC: target,
      explanation: `Call ${labelOperand.name}; save ${formatHex(defaultNext)} in X30 / LR.`,
      call: {
        name: labelOperand.name,
        address: target,
        returnAddress: defaultNext,
        arguments: X_REGISTER_NAMES.slice(0, 8).map((name) => registers[name]),
      },
    };
  }
  return {
    ...base,
    nextPC: target,
    explanation: instruction.opcode === 'b'
      ? `Branch to ${labelOperand.name}.`
      : `${instruction.opcode.toUpperCase()} condition is true; branch to ${labelOperand.name}.`,
  };
}
