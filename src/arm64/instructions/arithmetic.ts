import type { ParsedInstruction, Operand, RegisterOperand } from '../parser';
import {
  canonicalRegisterName,
  readRegister,
  writeRegister,
  type RegisterName,
  type RegisterState,
} from '../registers';

export interface InstructionEffect {
  changedRegisters: RegisterName[];
  explanation: string;
}

function readOperand(operand: Operand, registers: RegisterState): bigint {
  if (operand.kind === 'memory' || operand.kind === 'label' || operand.kind === 'literal-label') {
    throw new Error('Invalid arithmetic operand');
  }
  return operand.kind === 'register' ? readRegister(registers, operand.name) : operand.value;
}

function operandLabel(operand: Operand): string {
  if (operand.kind === 'memory' || operand.kind === 'label' || operand.kind === 'literal-label') {
    throw new Error('Invalid arithmetic operand');
  }
  return operand.kind === 'register' ? operand.name.toUpperCase() : operand.value.toString();
}

export function executeArithmetic(
  instruction: ParsedInstruction,
  registers: RegisterState,
): InstructionEffect {
  const destination = instruction.operands[0] as RegisterOperand;
  const sourceA = instruction.operands[1];
  const sourceB = instruction.operands[2];
  const canonicalDestination = canonicalRegisterName(destination.name);
  const before = registers[canonicalDestination];
  let value = 0n;
  let explanation = '';

  switch (instruction.opcode) {
    case 'mov':
      value = readOperand(sourceA, registers);
      explanation = `${destination.name.toUpperCase()} = ${operandLabel(sourceA)}`;
      break;
    case 'add':
      value = readOperand(sourceA, registers) + readOperand(sourceB, registers);
      explanation = `${destination.name.toUpperCase()} = ${operandLabel(sourceA)} + ${operandLabel(sourceB)}`;
      break;
    case 'sub':
      value = readOperand(sourceA, registers) - readOperand(sourceB, registers);
      explanation = `${destination.name.toUpperCase()} = ${operandLabel(sourceA)} - ${operandLabel(sourceB)}`;
      break;
    default:
      throw new Error(`${instruction.opcode.toUpperCase()} is not an arithmetic instruction`);
  }

  writeRegister(registers, destination.name, value);

  const adjustsSP = destination.name === 'sp'
    && sourceA?.kind === 'register'
    && sourceA.name === 'sp'
    && sourceB?.kind === 'immediate'
    && sourceB.value > 0n;
  if (adjustsSP && instruction.opcode === 'sub') {
    explanation = `SP moves ${sourceB.value} bytes lower to reserve stack space. Memory bytes are unchanged.`;
  } else if (adjustsSP && instruction.opcode === 'add') {
    explanation = `SP moves ${sourceB.value} bytes higher to release stack space. Old memory bytes are not erased.`;
  } else if (destination.name.startsWith('w')) {
    explanation += ` Writing ${destination.name.toUpperCase()} also clears ${canonicalDestination.toUpperCase()}'s upper 32 bits to zero.`;
  }

  return {
    changedRegisters: before === registers[canonicalDestination] ? [] : [canonicalDestination],
    explanation,
  };
}
