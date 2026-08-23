import { describe, expect, it } from 'vitest';
import { ARM64CPU } from './cpu';
import { STACK_TOP } from './registers';
import { DATA_BASE } from './parser';
import { BEGINNER_EXAMPLES } from '../examples/examples';

function run(source: string): ARM64CPU {
  const cpu = new ARM64CPU();
  cpu.loadProgram(source);
  while (!cpu.halted) cpu.step();
  return cpu;
}

describe('ARM64CPU Phase 1', () => {
  it('moves an immediate into a register', () => {
    const cpu = run('mov x0, 10');
    expect(cpu.registers.x0).toBe(10n);
  });

  it('moves one register into another', () => {
    const cpu = run('mov x0, 0x41\nmov x1, x0');
    expect(cpu.registers.x1).toBe(0x41n);
  });

  it('adds registers and immediates', () => {
    const cpu = run(`
      mov x0, 10
      mov x1, 20
      add x2, x0, x1
      add x3, x2, #12
    `);
    expect(cpu.registers.x2).toBe(30n);
    expect(cpu.registers.x3).toBe(42n);
  });

  it('subtracts registers and immediates', () => {
    const cpu = run(`
      mov x0, 50
      mov x1, 8
      sub x2, x0, x1
      sub sp, x2, #10
    `);
    expect(cpu.registers.x2).toBe(42n);
    expect(cpu.registers.sp).toBe(32n);
  });

  it('advances PC by four bytes per step and reports changes', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram('mov x0, 10\nmov x1, 20');

    const result = cpu.step();

    expect(cpu.registers.pc).toBe(4n);
    expect(result.changedRegisters).toEqual(['x0', 'pc']);
    expect(cpu.currentInstruction?.sourceLine).toBe(2);
  });

  it('reset restores all register state and PC', () => {
    const cpu = run('mov x0, 10');
    cpu.reset();

    expect(cpu.registers.x0).toBe(0n);
    expect(cpu.registers.pc).toBe(0n);
    expect(cpu.halted).toBe(false);
  });

  it('wraps arithmetic to unsigned 64 bits', () => {
    const cpu = run('mov x0, 0\nsub x1, x0, #1');
    expect(cpu.registers.x1).toBe((1n << 64n) - 1n);
  });

  it('stores and loads a 64-bit little-endian value', () => {
    const cpu = run(`
      mov x0, 0x1122334455667788
      sub sp, sp, #16
      str x0, [sp, #8]
      ldr x1, [sp, #8]
    `);
    expect(cpu.registers.x1).toBe(0x1122334455667788n);
    expect(cpu.memory.readByte(STACK_TOP - 8n)).toBe(0x88);
    expect(cpu.memory.readByte(STACK_TOP - 1n)).toBe(0x11);
  });

  it('supports pre-index pair stores and post-index pair loads', () => {
    const cpu = run(`
      mov x29, 0x29
      mov x30, 0x30
      stp x29, x30, [sp, #-16]!
      mov x29, 0
      mov x30, 0
      ldp x29, x30, [sp], #16
    `);
    expect(cpu.registers.x29).toBe(0x29n);
    expect(cpu.registers.x30).toBe(0x30n);
    expect(cpu.registers.sp).toBe(STACK_TOP);
  });

  it('implements byte loads/stores and W-register zero extension', () => {
    const cpu = run(`
      mov x0, 0xffffffffffffffff
      mov w0, 0x12345678
      sub sp, sp, #16
      strb w0, [sp]
      ldrb w1, [sp]
    `);
    expect(cpu.registers.x0).toBe(0x12345678n);
    expect(cpu.registers.x1).toBe(0x78n);
  });

  it('uses zero for untouched sparse memory', () => {
    const cpu = run('ldr x0, [sp, #32]');
    expect(cpu.registers.x0).toBe(0n);
  });

  it('resolves labels and models BL/LR/RET', () => {
    const cpu = run(`
      _start:
        mov x0, 5
        bl addTen
        b end
      addTen:
        add x0, x0, #10
        ret
      end:
        mov x1, x0
    `);
    expect(cpu.registers.x0).toBe(15n);
    expect(cpu.registers.x1).toBe(15n);
    expect(cpu.registers.x30).toBe(8n);
    expect(cpu.callStack.map((frame) => frame.name)).toEqual(['_start']);
  });

  it('captures function arguments when BL executes', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`
      _start:
        mov x0, 10
        mov x1, 20
        bl calculate
        b end
      calculate:
        add x0, x0, x1
        ret
      end:
        mov x2, x0
    `);
    cpu.step();
    cpu.step();
    const call = cpu.step();
    expect(call.changedRegisters).toContain('x30');
    expect(cpu.callStack.at(-1)?.name).toBe('calculate');
    expect(cpu.callStack.at(-1)?.arguments.slice(0, 2)).toEqual([10n, 20n]);
  });

  it.each([
    ['b.eq', 10, 10, 1],
    ['b.ne', 10, 11, 1],
    ['b.gt', 11, 10, 1],
    ['b.lt', 9, 10, 1],
    ['b.ge', 10, 10, 1],
    ['b.le', 10, 10, 1],
  ])('executes %s using NZCV flags', (branch, left, right, expected) => {
    const cpu = run(`
      mov x0, ${left}
      cmp x0, #${right}
      ${branch} taken
      mov x1, 0
      b end
      taken:
      mov x1, 1
      end:
      mov x2, x1
    `);
    expect(cpu.registers.x2).toBe(BigInt(expected));
  });

  it('records the actual conditional decision even when the target is fallthrough', () => {
    const taken = new ARM64CPU();
    taken.loadProgram(`mov x0, 5
cmp x0, #5
b.eq adjacent
adjacent:
mov x1, 1`);
    taken.step();
    taken.step();
    taken.step();
    expect(taken.lastBranchTaken).toBe(true);
    taken.step();
    expect(taken.lastBranchTaken).toBeNull();
    expect(taken.stepBack()).toBe(true);
    expect(taken.lastBranchTaken).toBe(true);

    const notTaken = new ARM64CPU();
    notTaken.loadProgram(`mov x0, 4
cmp x0, #5
b.eq adjacent
adjacent:
mov x1, 1`);
    notTaken.step();
    notTaken.step();
    notTaken.step();
    expect(notTaken.lastBranchTaken).toBe(false);
  });

  it('sets Z for TST and supports a not-taken branch', () => {
    const cpu = run(`
      mov x0, 0b0
    `.replace('0b0', '0'));
    expect(cpu.registers.x0).toBe(0n);

    const branchCPU = run(`
      mov x0, 0xf0
      mov x1, 0x0f
      tst x0, x1
      b.ne nonzero
      mov x2, 42
      b end
      nonzero:
      mov x2, 1
      end:
      mov x3, x2
    `);
    expect(branchCPU.flags.Z).toBe(true);
    expect(branchCPU.registers.x3).toBe(42n);
  });

  it('supports indirect BR and BLR targets', () => {
    const brCPU = run(`
      mov x0, 12
      br x0
      mov x1, 1
      mov x1, 2
    `);
    expect(brCPU.registers.x1).toBe(2n);

    const blrCPU = new ARM64CPU();
    blrCPU.loadProgram(`
      mov x9, 12
      blr x9
      b end
      target:
      mov x0, 7
      ret
      end:
      mov x1, x0
    `);
    while (!blrCPU.halted) blrCPU.step();
    expect(blrCPU.registers.x1).toBe(7n);
    expect(blrCPU.registers.x30).toBe(8n);
  });

  it('loads .asciz data and resolves LDR register, =label', () => {
    const cpu = run(`
      .data
      message:
        .asciz "hello"
      .text
      _start:
        ldr x1, =message
        ldrb w0, [x1, #1]
    `);
    expect(cpu.registers.x1).toBe(DATA_BASE);
    expect(cpu.registers.x0).toBe(BigInt('e'.charCodeAt(0)));
    expect(cpu.memory.readByte(DATA_BASE + 5n)).toBe(0);
    expect(cpu.describeAddress(DATA_BASE)).toBe('message → "hello"');
  });

  it('simulates Linux AArch64 write and exit syscalls', () => {
    const cpu = run(`
      .data
      string:
        .asciz "shellcode"
      .text
      _start:
        mov x0, 1
        ldr x1, =string
        mov x2, 9
        mov x8, 64
        svc 0
        mov x8, 93
        mov x0, 7
        svc 0
        mov x3, 99
    `);
    expect(cpu.terminalOutput).toBe('shellcode');
    expect(cpu.exited).toBe(true);
    expect(cpu.exitCode).toBe(7n);
    expect(cpu.lastSyscall?.name).toBe('exit');
    expect(cpu.registers.x3).toBe(0n);
  });

  it('decodes write syscall arguments without using host I/O', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`
      .data
      value: .asciz "ARM64"
      .text
      ldr x1, =value
      mov x0, 1
      mov x2, 5
      mov x8, 64
      svc #0
    `);
    while (!cpu.halted) cpu.step();
    expect(cpu.lastSyscall?.arguments.map((argument) => argument.register)).toEqual(['x0', 'x1', 'x2', 'x8']);
    expect(cpu.lastExplanation).toContain('write');
    expect(cpu.terminalOutput).toBe('ARM64');
  });

  it('steps backward through complete register, memory, and flag state', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`
      mov x0, 1
      sub sp, sp, #16
      str x0, [sp]
      cmp x0, #1
    `);
    cpu.step();
    cpu.step();
    cpu.step();
    cpu.step();
    expect(cpu.flags.Z).toBe(true);
    expect(cpu.memory.read64(STACK_TOP - 16n)).toBe(1n);

    expect(cpu.stepBack()).toBe(true);
    expect(cpu.flags.Z).toBe(false);
    expect(cpu.registers.pc).toBe(12n);
    expect(cpu.stepBack()).toBe(true);
    expect(cpu.memory.hasStoredByte(STACK_TOP - 16n)).toBe(false);
    expect(cpu.registers.pc).toBe(8n);
  });

  it('steps backward across BL and restores LR and the visual call stack', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`
      _start:
      bl target
      b end
      target:
      ret
      end:
      mov x0, 1
    `);
    cpu.step();
    expect(cpu.registers.x30).toBe(4n);
    expect(cpu.callStack).toHaveLength(2);
    expect(cpu.stepBack()).toBe(true);
    expect(cpu.registers.x30).toBe(0n);
    expect(cpu.registers.pc).toBe(0n);
    expect(cpu.callStack.map((frame) => frame.name)).toEqual(['_start']);
  });

  it('steps backward across a syscall and restores terminal state', () => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(`
      .data
      text: .asciz "ok"
      .text
      mov x0, 1
      ldr x1, =text
      mov x2, 2
      mov x8, 64
      svc 0
    `);
    while (!cpu.halted) cpu.step();
    expect(cpu.terminalOutput).toBe('ok');
    expect(cpu.lastSyscall?.name).toBe('write');
    expect(cpu.stepBack()).toBe(true);
    expect(cpu.terminalOutput).toBe('');
    expect(cpu.lastSyscall).toBeNull();
    expect(cpu.halted).toBe(false);
  });

  it('keeps comment markers inside .asciz strings', () => {
    const cpu = run(`
      .data
      url: .asciz "https://example.test;a"
      .text
      ldr x0, =url
    `);
    expect(cpu.describeAddress(DATA_BASE)).toBe('url → "https://example.test;a"');
  });

  it.each(BEGINNER_EXAMPLES)('loads and completes $name', (example) => {
    const cpu = new ARM64CPU();
    cpu.loadProgram(example.source);
    let steps = 0;
    while (!cpu.halted && steps < 100) {
      cpu.step();
      steps += 1;
    }
    expect(cpu.halted).toBe(true);
    expect(steps).toBeLessThan(100);
  });
});
