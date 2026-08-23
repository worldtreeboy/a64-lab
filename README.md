# A64 Lab

An interactive AArch64 learning simulator for Android reverse-engineering and
binary-exploitation fundamentals.

![A64 Lab debugger interface](docs/a64-lab.png)

A64 Lab lets you write a focused subset of GNU-style ARM64 assembly and watch
registers, flags, memory, stack state, function calls, and simplified Linux
syscalls change one instruction at a time.

> [!IMPORTANT]
> A64 Lab is an educational interpreter. It does not emulate a complete ARM64
> CPU, execute native machine code, or attach to Android processes like GDB or
> LLDB.

## Why A64 Lab?

ARM64 concepts become easier when every instruction has an immediate, visible
effect. A64 Lab is designed to make these relationships concrete:

- how X and W registers relate;
- how pointers refer to stack and data memory;
- how X0–X7 carry function arguments;
- how BL stores a return address in X30/LR;
- how FP/LR are saved in a stack frame;
- how NZCV flags control conditional branches;
- how Linux AArch64 `write` and `exit` syscalls use registers.

## Highlights

- X0–X30, W0–W30, SP, PC, FP/LR aliases, and NZCV flags
- Correct W-register zero-extension into its corresponding X register
- Step, Run, Reset, and full-state Step Back
- Changed-register, flag, stack, and memory highlighting
- Sparse, byte-addressable, little-endian memory
- Stack and hex/ASCII memory viewers
- Clickable register pointers that navigate directly to memory
- Labels, conditional branches, BL/RET, and a visual call stack
- `.data` strings and GNU-style `ldr xN, =label`
- Simplified Linux AArch64 syscall panel and terminal output
- Five beginner examples and three visual themes
- A React-independent TypeScript simulation engine

## Quick start

Requires Node.js 22.12 or newer.

```bash
git clone https://github.com/worldtreeboy/a64-lab.git
cd a64-lab
npm install
npm run dev
```

Open the URL printed by Vite.

To run the Electron development wrapper:

```bash
npm run electron:dev
```

## Try the Linux write example

This source runs unchanged:

```asm
.section .data
message:
    .asciz "shellcode"

.section .text
.globl _start

_start:
    mov x0, 1
    ldr x1, =message
    mov x2, 9
    mov x8, 64
    svc 0

    mov x0, 0
    mov x8, 93
    svc 0
```

The terminal displays `shellcode`, then reports exit status `0`.

`write` always reads exactly the number of bytes in X2; it does not stop at the
NULL terminator. If you change the message, update X2 to its UTF-8 byte length.

## Supported assembly

| Category | Instructions |
| --- | --- |
| Data movement | `MOV`, `LDR`, `STR`, `LDRB`, `STRB`, `LDP`, `STP` |
| Arithmetic | `ADD`, `SUB` |
| Comparison | `CMP`, `TST` |
| Branching | `B`, `BL`, `BR`, `BLR`, `RET` |
| Conditions | `B.EQ`, `B.NE`, `B.GT`, `B.LT`, `B.GE`, `B.LE` |
| Syscalls | `SVC` |

Memory operands include offsets and pre/post-index writeback:

```asm
ldr x0, [x1, #8]
str x0, [sp, #16]
stp x29, x30, [sp, #-16]!
ldp x29, x30, [sp], #16
```

The parser accepts:

```asm
.section .data
.data
.section .text
.text
.ascii "no automatic NULL"
.asciz "NULL terminated\n"
.globl _start
.global _start
ldr x1, =message
```

Supported string escapes are `\n`, `\r`, `\t`, `\\`, `\"`, and `\0`.
Assembler directives and labels do not consume instruction addresses. If a text
symbol named `_start` exists, execution and Reset begin there.

## Educational memory model

| Region | Base address | Behavior |
| --- | ---: | --- |
| `.text` | `0x00000000` | Each simulated instruction occupies four bytes |
| `.data` | `0x00400000` | Strings are allocated sequentially and restored on Reset |
| Stack | `0x7FFFFFFFE000` | Sparse memory grows downward by convention |

All addresses and X-register values use `bigint`, so the engine does not silently
lose 64-bit precision.

## Engine API

The simulator under `src/arm64` has no React or Electron dependency:

```ts
import { ARM64CPU } from './src/arm64/interpreter';

const cpu = new ARM64CPU();

cpu.loadProgram(`
  mov x0, 10
  mov x1, 20
  add x2, x0, x1
`);

cpu.step();
console.log(cpu.registers.x0); // 10n
```

## Project structure

```text
src/
  arm64/
    cpu.ts
    registers.ts
    memory.ts
    parser.ts
    interpreter.ts
    instructions/
      arithmetic.ts
      memory.ts
      comparison.ts
      branches.ts
      syscalls.ts
  components/
  examples/
electron/
```

The parser and interpreter own assembly semantics. React consumes snapshots and
step results, keeping presentation separate from CPU behavior.

## Validation

```bash
npm test
npm run typecheck
npm run build
npm run electron:smoke
```

The automated suite covers arithmetic, memory, stack addressing, W/X semantics,
labels, branches, BL/RET, flags, history, data directives, string escapes,
entry-point resolution, and Linux write/exit syscalls.

## Deliberate simplifications

A64 Lab has no instruction decoder, MMU, exception levels, pipeline, device
model, host syscall access, or complete AArch64 instruction set. Unsupported
syntax produces a line-numbered parser error.

The goal is clarity: learn the state changes that matter before moving to native
tooling such as GDB, LLDB, Frida, and real Android binaries.
