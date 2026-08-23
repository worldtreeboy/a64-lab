import { describe, expect, it } from 'vitest';
import { ARM64CPU } from './cpu';
import {
  AssemblyParseError,
  DATA_BASE,
  parseProgram,
} from './parser';

function run(source: string, maxSteps = 1_000): ARM64CPU {
  const cpu = new ARM64CPU();
  cpu.loadProgram(source);

  let steps = 0;
  while (!cpu.halted && steps < maxSteps) {
    cpu.step();
    steps += 1;
  }
  if (!cpu.halted) throw new Error(`Program did not halt within ${maxSteps} steps`);

  return cpu;
}

function bytesAt(cpu: ARM64CPU, address: bigint, length: number): number[] {
  return Array.from(
    { length },
    (_, index) => cpu.memory.readByte(address + BigInt(index)),
  );
}

describe('GNU AArch64 data directives', () => {
  it('stores .asciz bytes followed by a stored NULL byte', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`.data
message:
    .asciz "ABC"`);

    expect(bytesAt(cpu, DATA_BASE, 4)).toEqual([0x41, 0x42, 0x43, 0x00]);
    expect(cpu.memory.hasStoredByte(DATA_BASE + 3n)).toBe(true);
    expect(cpu.program.data[0]?.bytes).toHaveLength(4);
  });

  it('stores .ascii bytes without allocating an automatic NULL byte', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`.data
message:
    .ascii "ABC"`);

    expect(bytesAt(cpu, DATA_BASE, 3)).toEqual([0x41, 0x42, 0x43]);
    expect(cpu.memory.hasStoredByte(DATA_BASE + 3n)).toBe(false);
    expect(cpu.program.data[0]?.bytes).toHaveLength(3);
  });

  it('decodes newline, carriage return, tab, backslash, quote, and NUL escapes', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(String.raw`.data
escaped:
    .asciz "\n\r\t\\\"\0"`);

    expect(bytesAt(cpu, DATA_BASE, 7)).toEqual([
      0x0a,
      0x0d,
      0x09,
      0x5c,
      0x22,
      0x00,
      0x00,
    ]);
    expect(cpu.program.data[0]?.bytes).toHaveLength(7);
  });

  it('places each data label immediately after the preceding allocation', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`.data
one:
    .asciz "A"

two:
    .asciz "BC"`);

    expect(cpu.program.labels.get('one')).toBe(DATA_BASE);
    expect(cpu.program.labels.get('two')).toBe(DATA_BASE + 2n);
    expect(cpu.program.symbols.get('one')).toMatchObject({ section: 'data', address: DATA_BASE });
    expect(cpu.program.symbols.get('two')).toMatchObject({ section: 'data', address: DATA_BASE + 2n });
    expect(bytesAt(cpu, DATA_BASE, 5)).toEqual([0x41, 0x00, 0x42, 0x43, 0x00]);
  });

  it('accepts section and global directives without consuming instruction addresses', () => {
    const program = parseProgram(`.section .data
.global message
message:
    .ascii "X"

.section .text
.globl _start
_start:
    mov x0, 1
.global helper
helper:
    add x1, x0, #1`);

    expect(program.instructions.map((instruction) => instruction.address)).toEqual([0n, 4n]);
    expect(program.instructions.map((instruction) => instruction.sourceLine)).toEqual([9, 12]);
    expect(program.labels.get('_start')).toBe(0n);
    expect(program.labels.get('helper')).toBe(4n);
    expect(program.symbols.get('message')?.section).toBe('data');
    expect(program.symbols.get('_start')?.section).toBe('text');
  });

  it('keeps address loading distinct from dereferencing memory', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`.data
value:
    .ascii "ABCDEFGH"

.text
_start:
    ldr x1, =value
    ldr x2, [x1]`);

    const addressLoad = cpu.step();
    expect(cpu.registers.x1).toBe(DATA_BASE);
    expect(cpu.registers.x2).toBe(0n);
    expect(addressLoad.explanation).toBe('X1 = address of value.');

    cpu.step();
    expect(cpu.registers.x1).toBe(DATA_BASE);
    expect(cpu.registers.x2).toBe(0x4847464544434241n);
  });

  it('starts and resets at _start even when helper code appears first', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`.text
helper:
    mov x0, 99
    ret

_start:
    mov x0, 1`);

    const assertAtEntry = () => {
      expect(cpu.program.entryPoint).toBe(8n);
      expect(cpu.registers.pc).toBe(8n);
      expect(cpu.currentInstruction?.sourceText).toBe('mov x0, 1');
      expect(cpu.callStack).toEqual([{
        name: '_start',
        address: 8n,
        returnAddress: null,
        arguments: [],
      }]);
    };

    assertAtEntry();
    cpu.step();
    expect(cpu.registers.x0).toBe(1n);

    cpu.reset();
    expect(cpu.registers.x0).toBe(0n);
    assertAtEntry();
  });

  it('restores initialized data and its stable label address on reset', () => {
    const cpu = run(`.data
message:
    .asciz "ABC"

.text
_start:
    ldr x1, =message
    mov w0, 0x5a
    strb w0, [x1]`);
    const initialAddress = cpu.program.labels.get('message');

    expect(initialAddress).toBe(DATA_BASE);
    expect(bytesAt(cpu, DATA_BASE, 4)).toEqual([0x5a, 0x42, 0x43, 0x00]);

    cpu.reset();

    expect(cpu.program.labels.get('message')).toBe(initialAddress);
    expect(bytesAt(cpu, DATA_BASE, 4)).toEqual([0x41, 0x42, 0x43, 0x00]);
    expect(cpu.changedMemory).toEqual([]);
    expect(cpu.registers.pc).toBe(cpu.program.entryPoint);
  });

  it('runs the exact Linux write and exit acceptance program unchanged', () => {
    const cpu = run(`.section .data
string:
    .asciz "shellcode"

.section .text
.globl _start

_start:
    mov x0, 1
    ldr x1, =string
    mov x2, 9
    mov x8, 64
    svc 0

    mov x8, 93
    mov x0, 0
    svc 0`);

    expect(cpu.terminalOutput).toBe('shellcode');
    expect(cpu.exited).toBe(true);
    expect(cpu.exitCode).toBe(0n);
    expect(cpu.lastSyscall?.name).toBe('exit');
    expect(cpu.registers.x1).toBe(DATA_BASE);
  });
});

describe('GNU data parser errors', () => {
  it.each([
    {
      name: 'unknown literal label',
      source: `.text
_start:
    ldr x1, =message`,
      line: 3,
      message: /Unknown label: message/,
    },
    {
      name: '.asciz in text',
      source: `.text
_start:
    mov x0, 1
    .asciz "bad"`,
      line: 4,
      message: /\.asciz is only valid in a data section/,
    },
    {
      name: 'unterminated string',
      source: `.data
message:
    .ascii "ok"
    .asciz "unterminated`,
      line: 4,
      message: /Unterminated string literal/,
    },
    {
      name: 'unsupported directive',
      source: `.data
message:
    .foobar 1`,
      line: 3,
      message: /Unsupported directive: \.foobar/,
    },
    {
      name: 'unsupported section',
      source: `.text
.section .rodata
_start:
    mov x0, 1`,
      line: 2,
      message: /Unsupported section: \.rodata/,
    },
  ])('reports the source line for $name', ({ source, line, message }) => {
    let caught: unknown;
    try {
      parseProgram(source);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AssemblyParseError);
    const parseError = caught as AssemblyParseError;
    expect(parseError.line).toBe(line);
    expect(parseError.message).toMatch(message);
    expect(parseError.message).toMatch(new RegExp(`^Line ${line}:`));
  });
});
