export interface SimulatorExample {
  id: string;
  name: string;
  description: string;
  source: string;
}

export const BEGINNER_EXAMPLES: SimulatorExample[] = [
  {
    id: 'registers',
    name: 'Example 1 — Registers',
    description: 'Move values into X0/X1 and add them into X2.',
    source: `mov x0, 10
mov x1, 20
add x2, x0, x1`,
  },
  {
    id: 'function-arguments',
    name: 'Example 2 — Function arguments',
    description: 'Pass X0/X1, call with BL, and return through X30/LR.',
    source: `_start:
    mov x0, 10
    mov x1, 20
    bl addNumbers
    b end

addNumbers:
    add x0, x0, x1
    ret

end:
    mov x2, x0`,
  },
  {
    id: 'stack',
    name: 'Example 3 — Stack',
    description: 'Allocate a stack slot, store X0, load X1, and release it.',
    source: `mov x0, 0x41414141

sub sp, sp, #16
str x0, [sp]

ldr x1, [sp]

add sp, sp, #16`,
  },
  {
    id: 'function-frame',
    name: 'Example 4 — Function stack frame',
    description: 'Save FP/LR, establish X29, restore the pair, and return.',
    source: `_start:
    bl function
    b end

function:
    stp x29, x30, [sp, #-16]!
    mov x29, sp

    mov x0, 42

    ldp x29, x30, [sp], #16
    ret

end:
    mov x1, x0`,
  },
  {
    id: 'linux-syscall',
    name: 'Example 5 — Linux write() syscall',
    description: 'Print an initialized string with write, then exit.',
    source: `.section .data
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
    svc 0`,
  },
];

export const DEFAULT_SOURCE = BEGINNER_EXAMPLES[0].source;
