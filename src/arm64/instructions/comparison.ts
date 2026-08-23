import type { ImmediateOperand, ParsedInstruction, RegisterOperand } from '../parser';
import { MASK_32, MASK_64, readRegister, type RegisterState } from '../registers';
import type { CPUFlags, FlagName } from '../cpu';

export interface ComparisonEffect {
  changedFlags: FlagName[];
  explanation: string;
}

function setFlags(flags: CPUFlags, next: CPUFlags): FlagName[] {
  const changed = (Object.keys(next) as FlagName[]).filter((name) => flags[name] !== next[name]);
  Object.assign(flags, next);
  return changed;
}

export function executeComparison(
  instruction: ParsedInstruction,
  registers: RegisterState,
  flags: CPUFlags,
): ComparisonEffect {
  const leftOperand = instruction.operands[0] as RegisterOperand;
  const rightOperand = instruction.operands[1] as RegisterOperand | ImmediateOperand;
  const bits = leftOperand.name.startsWith('w') ? 32 : 64;
  const mask = bits === 32 ? MASK_32 : MASK_64;
  const sign = 1n << BigInt(bits - 1);
  const left = readRegister(registers, leftOperand.name) & mask;
  const right = rightOperand.kind === 'register'
    ? readRegister(registers, rightOperand.name) & mask
    : rightOperand.value & mask;

  if (instruction.opcode === 'tst') {
    const result = left & right;
    return {
      changedFlags: setFlags(flags, { N: (result & sign) !== 0n, Z: result === 0n, C: false, V: false }),
      explanation: `Test ${leftOperand.name.toUpperCase()} & ${rightOperand.kind === 'register' ? rightOperand.name.toUpperCase() : rightOperand.value}.`,
    };
  }

  const result = (left - right) & mask;
  const overflow = ((left ^ right) & (left ^ result) & sign) !== 0n;
  return {
    changedFlags: setFlags(flags, {
      N: (result & sign) !== 0n,
      Z: result === 0n,
      C: left >= right,
      V: overflow,
    }),
    explanation: `Compare ${leftOperand.name.toUpperCase()} with ${rightOperand.kind === 'register' ? rightOperand.name.toUpperCase() : rightOperand.value}.`,
  };
}
