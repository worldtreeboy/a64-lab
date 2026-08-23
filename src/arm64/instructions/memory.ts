import type { LiteralLabelOperand, MemoryOperand, ParsedInstruction, RegisterOperand } from '../parser';
import { ARM64Memory } from '../memory';
import {
  canonicalRegisterName,
  readRegister,
  writeRegister,
  type RegisterName,
  type RegisterState,
} from '../registers';
import type { InstructionEffect } from './arithmetic';

export interface MemoryInstructionEffect extends InstructionEffect {
  changedMemory: bigint[];
}

function registerWidth(name: string): number {
  return name.startsWith('w') ? 4 : 8;
}

function addressLabel(memoryOperand: MemoryOperand): string {
  const base = memoryOperand.base.toUpperCase();
  if (memoryOperand.offset === 0n) return base;
  return `${base} ${memoryOperand.offset < 0n ? '-' : '+'} ${memoryOperand.offset < 0n ? -memoryOperand.offset : memoryOperand.offset}`;
}

function resolveAddress(
  operand: MemoryOperand,
  registers: RegisterState,
  changedRegisters: RegisterName[],
): { address: bigint; finish: () => void } {
  const originalBase = readRegister(registers, operand.base);
  if (operand.writeback === 'pre') {
    writeRegister(registers, operand.base, originalBase + operand.offset);
    changedRegisters.push(canonicalRegisterName(operand.base));
    return { address: readRegister(registers, operand.base), finish: () => undefined };
  }
  if (operand.writeback === 'post') {
    return {
      address: originalBase,
      finish: () => {
        writeRegister(registers, operand.base, originalBase + operand.offset);
        changedRegisters.push(canonicalRegisterName(operand.base));
      },
    };
  }
  return { address: originalBase + operand.offset, finish: () => undefined };
}

export function executeMemory(
  instruction: ParsedInstruction,
  registers: RegisterState,
  memory: ARM64Memory,
  labels: ReadonlyMap<string, bigint>,
): MemoryInstructionEffect {
  const changedRegisters: RegisterName[] = [];
  const changedMemory: bigint[] = [];
  const first = instruction.operands[0] as RegisterOperand;
  if (instruction.opcode === 'ldr' && instruction.operands[1]?.kind === 'literal-label') {
    const literal = instruction.operands[1] as LiteralLabelOperand;
    const canonical = canonicalRegisterName(first.name);
    const before = registers[canonical];
    const address = labels.get(literal.name)!;
    writeRegister(registers, first.name, address);
    return {
      changedRegisters: before === registers[canonical] ? [] : [canonical],
      changedMemory: [],
      explanation: `${first.name.toUpperCase()} = address of ${literal.name}.`,
    };
  }
  const pair = instruction.opcode === 'ldp' || instruction.opcode === 'stp';
  const second = pair ? instruction.operands[1] as RegisterOperand : null;
  const memoryOperand = instruction.operands[pair ? 2 : 1] as MemoryOperand;
  const resolved = resolveAddress(memoryOperand, registers, changedRegisters);
  const firstCanonical = canonicalRegisterName(first.name);
  const firstBefore = registers[firstCanonical];
  let explanation = '';

  switch (instruction.opcode) {
    case 'ldr': {
      writeRegister(registers, first.name, memory.read(resolved.address, registerWidth(first.name)));
      if (firstBefore !== registers[firstCanonical]) changedRegisters.push(firstCanonical);
      explanation = `Read ${registerWidth(first.name)} bytes from ${addressLabel(memoryOperand)} into ${first.name.toUpperCase()}.`;
      break;
    }
    case 'ldrb': {
      writeRegister(registers, first.name, BigInt(memory.readByte(resolved.address)));
      if (firstBefore !== registers[firstCanonical]) changedRegisters.push(firstCanonical);
      explanation = `Read 1 byte from ${addressLabel(memoryOperand)} into ${first.name.toUpperCase()}.`;
      break;
    }
    case 'str': {
      changedMemory.push(...memory.write(resolved.address, readRegister(registers, first.name), registerWidth(first.name)));
      explanation = `Store ${first.name.toUpperCase()} at memory address ${addressLabel(memoryOperand)}.`;
      break;
    }
    case 'strb': {
      changedMemory.push(...memory.write(resolved.address, readRegister(registers, first.name), 1));
      explanation = `Store the low byte of ${first.name.toUpperCase()} at ${addressLabel(memoryOperand)}.`;
      break;
    }
    case 'ldp': {
      const secondCanonical = canonicalRegisterName(second!.name);
      const secondBefore = registers[secondCanonical];
      const width = registerWidth(first.name);
      writeRegister(registers, first.name, memory.read(resolved.address, width));
      writeRegister(registers, second!.name, memory.read(resolved.address + BigInt(width), width));
      if (firstBefore !== registers[firstCanonical]) changedRegisters.push(firstCanonical);
      if (secondBefore !== registers[secondCanonical]) changedRegisters.push(secondCanonical);
      explanation = `Load ${first.name.toUpperCase()} and ${second!.name.toUpperCase()} from ${addressLabel(memoryOperand)}.`;
      break;
    }
    case 'stp': {
      const width = registerWidth(first.name);
      changedMemory.push(...memory.write(resolved.address, readRegister(registers, first.name), width));
      changedMemory.push(...memory.write(resolved.address + BigInt(width), readRegister(registers, second!.name), width));
      explanation = `Store ${first.name.toUpperCase()} and ${second!.name.toUpperCase()} at ${addressLabel(memoryOperand)}.`;
      break;
    }
  }

  resolved.finish();
  return {
    changedRegisters: [...new Set(changedRegisters)],
    changedMemory,
    explanation,
  };
}
