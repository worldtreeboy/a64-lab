import { describe, expect, it } from 'vitest';
import { ARM64CPU } from './cpu';
import { ARM64Memory } from './memory';
import { AssemblyParseError, parseProgram } from './parser';
import { MASK_64 } from './registers';

function run(source: string): ARM64CPU {
  const cpu = new ARM64CPU();
  cpu.loadProgram(source);
  while (!cpu.halted) cpu.step();
  return cpu;
}

describe('educational-subset operand validation', () => {
  it.each([
    ['mov pc, 16', /PC is controlled by branches/],
    ['mov x0, pc', /PC is controlled by branches/],
    ['mov w0, x1', /MOV registers must use the same X or W width/],
    ['add x0, x1, w2', /Arithmetic registers must use the same X or W width/],
    ['cmp x0, w1', /Comparison registers must use the same X or W width/],
    ['ldrb x0, [x1]', /LDRB data operand must be a 32-bit W register/],
    ['strb x0, [x1]', /STRB data operand must be a 32-bit W register/],
    ['ldp x0, w1, [sp]', /LDP registers must use the same X or W width/],
    ['stp w0, x1, [sp]', /STP registers must use the same X or W width/],
    ['br w0', /Branch target must be a 64-bit X register/],
    ['blr sp', /Branch target must be a 64-bit X register/],
    ['ldr sp, [x0]', /LDR data operand must be an X or W register/],
    ['str sp, [x0]', /STR data operand must be an X or W register/],
    ['mov sp, 16', /MOV to SP expects a 64-bit X register or SP source/],
    ['add w0, sp, #1', /SP arithmetic uses 64-bit X registers/],
    ['add x0, x1, sp', /SP arithmetic in this educational subset expects an immediate third operand/],
  ])('rejects %s with a clear parse error', (source, message) => {
    expect(() => parseProgram(source)).toThrow(AssemblyParseError);
    expect(() => parseProgram(source)).toThrow(message);
  });

  it('keeps the supported X, W, SP, memory, and indirect-branch forms valid', () => {
    expect(() => parseProgram(`mov x0, 1
mov w1, w0
mov x29, sp
mov sp, x29
add x0, sp, #16
sub sp, x0, #16
cmp w0, w1
tst x0, x1
ldr w0, [sp]
str w0, [x1]
ldrb w0, [x1]
strb w0, [x1]
ldp w0, w1, [sp]
stp x29, x30, [sp, #-16]!
br x9
blr x10`)).not.toThrow();
  });
});

describe('64-bit sparse-memory addresses', () => {
  it('wraps every byte of a cross-boundary access modulo 2^64', () => {
    const memory = new ARM64Memory();
    const start = MASK_64 - 3n;

    const changed = memory.write64(start, 0x1122_3344_5566_7788n);

    expect(changed).toEqual([
      MASK_64 - 3n,
      MASK_64 - 2n,
      MASK_64 - 1n,
      MASK_64,
      0n,
      1n,
      2n,
      3n,
    ]);
    expect(memory.read64(start)).toBe(0x1122_3344_5566_7788n);
    expect(memory.hasStoredByte(-1n)).toBe(true);
    expect([...memory.snapshot().keys()].every((address) => address >= 0n && address <= MASK_64)).toBe(true);
  });

  it('wraps a no-writeback effective address before a later pointer dereferences it', () => {
    const cpu = run(`mov x1, 0xfffffffffffffff8
mov x0, 42
str x0, [x1, #8]
mov x2, 0
ldr x3, [x2]`);

    expect(cpu.registers.x3).toBe(42n);
    expect(cpu.memory.read64(0n)).toBe(42n);
    expect(cpu.memory.snapshot().has(1n << 64n)).toBe(false);
  });
});

describe('truthful snapshots and teaching metadata', () => {
  it('does not report PC changed for a self-branch', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram('loop: b loop');

    const result = cpu.step();

    expect(cpu.registers.pc).toBe(0n);
    expect(result.changedRegisters).toEqual([]);
  });

  it('does not report LR or a writeback base when their values stay equal', () => {
    const call = new ARM64CPU();
    call.loadProgram(`mov x30, 8
bl foo
b end
foo:
ret
end:
mov x0, 1`);
    call.step();
    expect(call.step().changedRegisters).toEqual(['pc']);

    const load = new ARM64CPU();
    load.loadProgram('ldr x0, [sp], #0');
    expect(load.step().changedRegisters).toEqual(['pc']);
  });

  it('describes addresses backed by dynamically stored sparse memory', () => {
    const cpu = run(`mov x1, 0x500000
mov x0, 42
str x0, [x1]`);

    expect(cpu.memory.hasStoredByte(cpu.registers.x1)).toBe(true);
    expect(cpu.describeAddress(cpu.registers.x1)).toBe('simulated memory');
  });

  it('prefers _start for the root frame when another label aliases its address', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`helper:
_start:
mov x0, 1`);

    expect(cpu.callStack[0]?.name).toBe('_start');
  });
});
