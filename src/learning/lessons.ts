import type { Lesson } from './types';

export const LESSONS: Lesson[] = [
  {
    id: 'meet-arm64',
    order: 1,
    title: 'Meet ARM64',
    shortTitle: 'Meet ARM64',
    description: 'Build a practical mental model of instructions, registers, memory, and execution.',
    estimatedMinutes: 7,
    sections: [
      {
        id: 'aarch64-name',
        title: 'ARM64 and AArch64',
        paragraphs: [
          'AArch64 is Arm\'s 64-bit execution state and instruction set. ARM64 is the common platform name for the same 64-bit environment.',
          'Native Android libraries commonly contain AArch64 code, so these names appear often in disassemblers and debuggers.',
        ],
        diagram: 'mental-model',
      },
      {
        id: 'machine-state',
        title: 'The machine state',
        paragraphs: [
          'The CPU is the processor that executes instructions. An instruction is one small command, such as copying a value or adding two values.',
          'A register is a small named storage location inside the CPU. Memory is a larger collection of bytes, and each byte has a numeric address.',
          'The stack is a memory region functions use for saved state and temporary values.',
          'PC holds the current instruction address. After an ordinary instruction, execution advances to the next instruction; a branch can choose another address.',
        ],
        bullets: [
          'Registers: fast values, arguments, pointers, and results',
          'Memory: bytes located by addresses',
          'SP: the current top of the stack',
          'PC: the instruction being executed',
        ],
      },
      {
        id: 'first-instruction',
        title: 'One instruction at a time',
        paragraphs: [
          'A common shape is instruction destination, source. Some instructions have more operands, but reading from left to right is a useful start.',
          'The destination is where the result goes; the source provides the value being used.',
        ],
        codeLabel: 'Put 10 into X0',
        code: `mov x0, 10`,
        callout: 'Step once and watch X0 change while PC advances by 4 bytes.',
      },
    ],
    quiz: [
      {
        id: 'meet-pc-role',
        prompt: 'What does PC identify while an ARM64 program is running?',
        options: [
          { id: 'a', label: 'The current instruction address' },
          { id: 'b', label: 'The first function argument' },
          { id: 'c', label: 'The top stack value' },
          { id: 'd', label: 'The last memory byte written' },
        ],
        correctOptionId: 'a',
        explanation: 'PC is the program counter: it identifies the instruction address currently selected for execution.',
      },
    ],
    labProgram: `mov x0, 10`,
  },
  {
    id: 'registers',
    order: 2,
    title: 'Registers',
    shortTitle: 'Registers',
    description: 'Learn the core general-purpose registers and the important FP, LR, SP, and PC roles.',
    estimatedMinutes: 9,
    prerequisites: ['meet-arm64'],
    sections: [
      {
        id: 'register-map',
        title: 'The register map',
        paragraphs: [
          'X0–X30 are 64-bit general-purpose registers. Their W0–W30 names access only the lower 32 bits.',
          'Writing a W register clears the upper 32 bits of its matching X register. Reading W0 reads the low half of X0.',
          'SP points to the current top of the stack, PC selects the current instruction, X29 / FP can anchor a function’s stack frame, and X30 / LR can hold the address to return to after a call.',
        ],
        bullets: [
          'X0–X7: commonly integer or pointer arguments',
          'X0: commonly the return value',
          'X29 / FP: frame pointer',
          'X30 / LR: link register',
          'SP: stack pointer',
          'PC: current instruction address',
        ],
        diagram: 'register-map',
      },
      {
        id: 'copying-registers',
        title: 'Values can be copied',
        paragraphs: [
          'MOV can place an immediate value in a register or copy one register into another. Copying does not erase the source.',
        ],
        code: `mov x0, 10
mov x1, 20
mov x2, x0`,
        callout: 'After the third instruction, X0 and X2 both contain 10.',
      },
      {
        id: 'w-register-write',
        title: 'W and X are two views',
        paragraphs: [
          'W0 is not a separate storage location. It is the lower half of X0, with special zero-extending write behavior.',
        ],
        code: `mov x0, 0x1122334455667788
mov w0, 1`,
        callout: 'The final X0 value is 1 because writing W0 clears the upper half.',
      },
    ],
    quiz: [
      {
        id: 'registers-copy',
        prompt: 'What will X2 contain after these instructions?',
        code: `mov x0, 10
mov x1, 20
mov x2, x0`,
        options: [
          { id: 'a', label: '0' },
          { id: 'b', label: '10' },
          { id: 'c', label: '20' },
          { id: 'd', label: '30' },
        ],
        correctOptionId: 'b',
        explanation: 'MOV copies the value in X0 into X2, so X2 becomes 10.',
      },
    ],
    labProgram: `mov x0, 10
mov x1, 20
mov x2, x0`,
  },
  {
    id: 'mov-arithmetic',
    order: 3,
    title: 'MOV and Arithmetic',
    shortTitle: 'Arithmetic',
    description: 'Move values and combine register or immediate operands with ADD and SUB.',
    estimatedMinutes: 8,
    prerequisites: ['registers'],
    sections: [
      {
        id: 'mov-values',
        title: 'MOV establishes values',
        paragraphs: [
          'MOV copies a value into its destination. An immediate is a constant written directly in the instruction.',
        ],
        code: `mov x0, 10
mov x1, 20`,
      },
      {
        id: 'add-sub',
        title: 'ADD and SUB',
        paragraphs: [
          'ADD and SUB read their source operands and write the result to the first register. The source can be another register or an immediate.',
          'The # in #5 marks 5 as an immediate constant rather than a register.',
        ],
        code: `mov x0, 10
mov x1, 20
add x2, x0, x1
sub x3, x2, #5`,
        diagram: 'arithmetic',
        callout: 'X2 becomes 30, then X3 becomes 25.',
      },
    ],
    quiz: [
      {
        id: 'arithmetic-x3',
        prompt: 'What will X3 contain after the final instruction?',
        code: `mov x0, 10
mov x1, 20
add x2, x0, x1
sub x3, x2, #5`,
        options: [
          { id: 'a', label: '5' },
          { id: 'b', label: '15' },
          { id: 'c', label: '25' },
          { id: 'd', label: '35' },
        ],
        correctOptionId: 'c',
        explanation: 'ADD makes X2 equal 30, and subtracting the immediate 5 leaves 25 in X3.',
      },
    ],
    labProgram: `mov x0, 10
mov x1, 20
add x2, x0, x1
sub x3, x2, #5`,
  },
  {
    id: 'addresses-pointers',
    order: 4,
    title: 'Addresses and Pointers',
    shortTitle: 'Pointers',
    description: 'See how a register can name a location in memory and how dereferencing reads that location.',
    estimatedMinutes: 10,
    prerequisites: ['registers'],
    sections: [
      {
        id: 'address-as-value',
        title: 'An address is a value',
        paragraphs: [
          'An address is the number assigned to a location in memory. A pointer is a value interpreted as an address rather than ordinary numeric data.',
          'If X1 contains 0x400000, the debugger can follow X1 to the memory stored there.',
        ],
        diagram: 'pointer',
        callout: 'X1 = 0x400000 → memory → "android"',
      },
      {
        id: 'address-versus-load',
        title: 'Obtain an address or read memory',
        paragraphs: [
          'Dereferencing a pointer means accessing the memory at the address it contains. Square brackets request that access.',
          'A label is a readable name attached to an address. In this first string example, .data selects data memory and message names the first byte of "android"; a later lesson explains each directive in detail.',
          'The equals form puts a label address into the destination. Brackets instead dereference an address already held in a register.',
        ],
        bullets: [
          'ldr x1, =message → X1 receives the address of message',
          'ldr x2, [x1] → X2 receives 8 bytes read at the address in X1',
        ],
        code: `.data
message:
    .asciz "android"

.text
_start:
    ldr x1, =message
    ldr x2, [x1]`,
        callout: 'An equals sign obtains an address; square brackets read through a pointer.',
      },
    ],
    quiz: [
      {
        id: 'pointers-equals',
        prompt: 'What does the first instruction place in X1?',
        code: `ldr x1, =message
ldr x2, [x1]`,
        options: [
          { id: 'a', label: 'The address of message' },
          { id: 'b', label: 'The first 8 bytes of message' },
          { id: 'c', label: 'The length of message' },
          { id: 'd', label: 'The current stack pointer' },
        ],
        correctOptionId: 'a',
        explanation: 'The =label pseudo-instruction loads the label address. The bracketed instruction performs the later memory read.',
      },
    ],
    labProgram: `.data
message:
    .asciz "android"

.text
_start:
    ldr x1, =message
    ldr x2, [x1]`,
  },
  {
    id: 'memory-ldr-str',
    order: 5,
    title: 'Memory with LDR and STR',
    shortTitle: 'Memory',
    description: 'Store register values in memory and load them back through addresses and offsets.',
    estimatedMinutes: 10,
    prerequisites: ['addresses-pointers'],
    sections: [
      {
        id: 'load-store-direction',
        title: 'Follow the data direction',
        paragraphs: [
          'Load and store describe movement from the CPU’s point of view. LDR loads bytes from memory into a register; STR stores a register value into memory.',
          'The brackets contain the memory address to access. The register outside the brackets supplies or receives the value.',
        ],
        bullets: [
          'STR: register → memory',
          'LDR: memory → register',
        ],
        diagram: 'load-store',
      },
      {
        id: 'stack-memory-round-trip',
        title: 'Store and load the same value',
        paragraphs: [
          'After allocating 16 stack bytes, SP is a usable memory address. STR places 42 there, and LDR reads it into X1.',
        ],
        code: `mov x0, 42
sub sp, sp, #16
str x0, [sp]
ldr x1, [sp]
add sp, sp, #16`,
        callout: 'After LDR, X1 contains 42.',
      },
      {
        id: 'memory-offsets',
        title: 'Offsets select nearby memory',
        paragraphs: [
          'An offset is added to the base address without changing the base register. For example, [sp, #8] refers to the bytes eight addresses above SP.',
        ],
        code: `sub sp, sp, #16
mov x0, 99
str x0, [sp, #8]
ldr x1, [sp, #8]
add sp, sp, #16`,
      },
    ],
    quiz: [
      {
        id: 'memory-round-trip',
        prompt: 'What will X1 contain after the load?',
        code: `mov x0, 42
sub sp, sp, #16
str x0, [sp]
ldr x1, [sp]`,
        options: [
          { id: 'a', label: '0' },
          { id: 'b', label: '16' },
          { id: 'c', label: '42' },
          { id: 'd', label: 'The address in SP' },
        ],
        correctOptionId: 'c',
        explanation: 'STR writes 42 at SP, and LDR reads those same eight bytes into X1.',
      },
    ],
    labProgram: `mov x0, 42
sub sp, sp, #16
str x0, [sp]
ldr x1, [sp]
add sp, sp, #16`,
  },
  {
    id: 'little-endian',
    order: 6,
    title: 'Little Endian',
    shortTitle: 'Little Endian',
    description: 'Connect a 64-bit register value to the byte order shown in memory.',
    estimatedMinutes: 7,
    prerequisites: ['memory-ldr-str'],
    sections: [
      {
        id: 'byte-order',
        title: 'Least-significant byte first',
        paragraphs: [
          'AArch64 normally uses little-endian data storage. The least-significant byte of a multi-byte value is placed at the lowest address.',
          'The least-significant byte is the rightmost byte in the written hexadecimal value—the part representing the smallest place values.',
          'The register still displays the value normally; byte order becomes visible when that value is stored in memory.',
        ],
        diagram: 'little-endian',
      },
      {
        id: 'store-eight-bytes',
        title: 'Watch the bytes appear',
        paragraphs: [
          'Storing 0x1122334455667788 as eight bytes produces 88 77 66 55 44 33 22 11 from low address to high address.',
        ],
        code: `mov x0, 0x1122334455667788
sub sp, sp, #16
str x0, [sp]
ldr x1, [sp]
add sp, sp, #16`,
        callout: 'Register: 0x1122334455667788 ↔ memory: 88 77 66 55 44 33 22 11',
      },
    ],
    quiz: [
      {
        id: 'endian-first-byte',
        prompt: 'Which byte appears at the lowest address after this value is stored?',
        code: `mov x0, 0x1122334455667788
str x0, [sp]`,
        options: [
          { id: 'a', label: '0x11' },
          { id: 'b', label: '0x22' },
          { id: 'c', label: '0x77' },
          { id: 'd', label: '0x88' },
        ],
        correctOptionId: 'd',
        explanation: 'Little-endian storage places the least-significant byte, 0x88, at the lowest address.',
      },
    ],
    labProgram: `mov x0, 0x1122334455667788
sub sp, sp, #16
str x0, [sp]
ldr x1, [sp]
add sp, sp, #16`,
  },
  {
    id: 'stack',
    order: 7,
    title: 'Stack',
    shortTitle: 'Stack',
    description: 'Allocate stack space, store a local value, and restore SP when finished.',
    estimatedMinutes: 9,
    prerequisites: ['memory-ldr-str'],
    sections: [
      {
        id: 'stack-growth',
        title: 'The stack grows downward',
        paragraphs: [
          'The stack is a memory region used for saved registers, local values, and function-call state. SP holds the address of its current top.',
          'The stack typically grows toward lower addresses: a new allocation reduces SP. Subtracting from SP allocates space; adding the same amount restores it.',
        ],
        bullets: [
          'Before: SP → 0x…E000',
          'sub sp, sp, #16',
          'After: SP → 0x…DFF0',
        ],
        diagram: 'stack-growth',
      },
      {
        id: 'stack-local',
        title: 'A temporary local value',
        paragraphs: [
          'Code can use allocated stack memory for values that do not stay in registers. Every allocation should have a matching restoration along that path.',
        ],
        code: `mov x0, 42
sub sp, sp, #16
str x0, [sp]
ldr x1, [sp]
add sp, sp, #16`,
      },
      {
        id: 'stack-alignment',
        title: 'Keep SP aligned',
        paragraphs: [
          'The standard AArch64 calling convention keeps SP aligned to 16 bytes at function-call boundaries. Allocating 16, 32, or another suitable multiple makes that rule easy to follow.',
          'A64 Lab models the pointer movement directly so you can see allocation and restoration happen.',
        ],
      },
    ],
    quiz: [
      {
        id: 'stack-final-sp',
        prompt: 'Compared with its starting value, where is SP after all four instructions?',
        code: `sub sp, sp, #16
str x0, [sp]
ldr x1, [sp]
add sp, sp, #16`,
        options: [
          { id: 'a', label: '16 bytes lower' },
          { id: 'b', label: '8 bytes lower' },
          { id: 'c', label: 'Back at its starting value' },
          { id: 'd', label: '16 bytes higher' },
        ],
        correctOptionId: 'c',
        explanation: 'The final ADD reverses the initial SUB, so SP returns to its starting address.',
      },
    ],
    labProgram: `mov x0, 42
sub sp, sp, #16
str x0, [sp]
ldr x1, [sp]
add sp, sp, #16`,
  },
  {
    id: 'stack-frames',
    order: 8,
    title: 'STP / LDP and Stack Frames',
    shortTitle: 'Stack Frames',
    description: 'Recognize paired saves, frame setup, and pre/post-indexed stack addressing.',
    estimatedMinutes: 12,
    prerequisites: ['stack', 'registers'],
    sections: [
      {
        id: 'save-frame-state',
        title: 'Save FP and LR together',
        paragraphs: [
          'A stack frame is the part of the stack a function owns during one call. X29 / FP can provide a stable reference inside that frame, while X30 / LR holds the caller’s return address.',
          'STP means store pair, so it writes two registers to neighboring memory slots. The ! form is pre-indexed: it updates SP before using the new address.',
        ],
        bullets: [
          'SP -= 16',
          'memory[SP] = X29',
          'memory[SP + 8] = X30',
        ],
        code: `stp x29, x30, [sp, #-16]!
mov x29, sp`,
        diagram: 'stack-frame',
      },
      {
        id: 'restore-frame-state',
        title: 'Restore and return',
        paragraphs: [
          'LDP means load pair, so it restores two neighboring values. The offset after the brackets is post-indexed: memory is read at the old SP first, then SP advances.',
        ],
        bullets: [
          'X29 = memory[SP]',
          'X30 = memory[SP + 8]',
          'SP += 16',
        ],
        code: `ldp x29, x30, [sp], #16
ret`,
      },
      {
        id: 'complete-small-frame',
        title: 'A complete small frame',
        paragraphs: [
          'Step through the call and watch SP, X29, X30, and the stack slots. RET uses the restored X30.',
        ],
        code: `_start:
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
    ],
    quiz: [
      {
        id: 'frames-pre-index',
        prompt: 'When is SP updated by the pre-indexed STP instruction?',
        code: `stp x29, x30, [sp, #-16]!`,
        options: [
          { id: 'a', label: 'Before the pair is stored' },
          { id: 'b', label: 'After the pair is stored' },
          { id: 'c', label: 'Only when RET runs' },
          { id: 'd', label: 'SP is not updated' },
        ],
        correctOptionId: 'a',
        explanation: 'The ! marks pre-index writeback: SP is reduced first, then X29 and X30 are stored at the new stack address.',
      },
    ],
    labProgram: `_start:
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
    id: 'cmp-nzcv',
    order: 9,
    title: 'CMP and NZCV',
    shortTitle: 'Flags',
    description: 'Read comparison results through the N, Z, C, and V condition flags.',
    estimatedMinutes: 10,
    prerequisites: ['mov-arithmetic'],
    sections: [
      {
        id: 'compare-subtraction',
        title: 'CMP behaves like a subtraction',
        paragraphs: [
          'NZCV is a group of four one-bit condition flags: N marks a negative result, Z marks zero, C records carry or no unsigned borrow, and V marks signed overflow.',
          'CMP calculates a subtraction for its flags but does not save the arithmetic result in a register.',
          'If the compared values are equal, the conceptual result is zero and Z becomes 1.',
        ],
        code: `mov x0, 5
mov x1, 5
cmp x0, x1`,
        callout: '5 - 5 = 0 → Z = 1',
        diagram: 'flags',
      },
      {
        id: 'negative-result',
        title: 'N marks a negative signed result',
        paragraphs: [
          'When 5 is compared with 7, the conceptual result is -2. Z is clear and N is set because the result has its sign bit set.',
        ],
        code: `mov x0, 5
mov x1, 7
cmp x0, x1`,
        callout: '5 - 7 = -2 → Z = 0, N = 1',
      },
      {
        id: 'carry-overflow',
        title: 'C and V in brief',
        paragraphs: [
          'For CMP subtraction, C indicates no unsigned borrow, so it is set when the left unsigned value is at least the right value.',
          'V indicates signed overflow: the fixed-width signed result could not be represented. Signed branch conditions combine N and V.',
        ],
      },
    ],
    quiz: [
      {
        id: 'flags-equal',
        prompt: 'Which flag must be set after this comparison?',
        code: `mov x0, 5
mov x1, 5
cmp x0, x1`,
        options: [
          { id: 'a', label: 'N' },
          { id: 'b', label: 'Z' },
          { id: 'c', label: 'V' },
          { id: 'd', label: 'None' },
        ],
        correctOptionId: 'b',
        explanation: 'Equal operands produce a zero comparison result, which sets Z.',
      },
    ],
    labProgram: `mov x0, 5
mov x1, 5
cmp x0, x1
mov x0, 5
mov x1, 7
cmp x0, x1`,
  },
  {
    id: 'branches',
    order: 10,
    title: 'Branches',
    shortTitle: 'Branches',
    description: 'Follow direct and conditional control flow using labels and NZCV flags.',
    estimatedMinutes: 11,
    prerequisites: ['cmp-nzcv'],
    sections: [
      {
        id: 'branch-family',
        title: 'Choose the next instruction',
        paragraphs: [
          'A branch changes control flow by selecting a different instruction address for PC. A label is a readable name for one of those instruction addresses.',
          'B always jumps to its label. Conditional branches use flags from a preceding comparison to decide whether to jump or continue to the next instruction.',
        ],
        bullets: [
          'B.EQ / B.NE: equal / not equal',
          'B.GT / B.LT: signed greater / less than',
          'B.GE / B.LE: signed greater-or-equal / less-or-equal',
        ],
      },
      {
        id: 'branch-path',
        title: 'Predict the path',
        paragraphs: [
          'Five and seven are different, so CMP clears Z. B.NE sees Z = 0 and transfers control to notequal.',
        ],
        code: `mov x0, 5
mov x1, 7
cmp x0, x1
b.ne notequal
mov x2, 0
b end

notequal:
    mov x2, 1

end:
    mov x3, x2`,
        diagram: 'control-flow',
        callout: 'CMP → Z = 0 → B.NE → notequal',
      },
    ],
    quiz: [
      {
        id: 'branches-path',
        prompt: 'Which value reaches X3 in this program?',
        code: `mov x0, 5
mov x1, 7
cmp x0, x1
b.ne notequal
mov x2, 0
b end
notequal:
mov x2, 1
end:
mov x3, x2`,
        options: [
          { id: 'a', label: '0' },
          { id: 'b', label: '1' },
          { id: 'c', label: '5' },
          { id: 'd', label: '7' },
        ],
        correctOptionId: 'b',
        explanation: 'The values are not equal, so B.NE takes the notequal path and X2, then X3, becomes 1.',
      },
    ],
    labProgram: `mov x0, 5
mov x1, 7
cmp x0, x1
b.ne notequal
mov x2, 0
b end

notequal:
    mov x2, 1

end:
    mov x3, x2`,
  },
  {
    id: 'function-calls',
    order: 11,
    title: 'Function Calls',
    shortTitle: 'Functions',
    description: 'Pass arguments, call with BL, observe LR, and return a result in X0.',
    estimatedMinutes: 12,
    prerequisites: ['branches', 'registers'],
    sections: [
      {
        id: 'calling-convention',
        title: 'Arguments and return values',
        paragraphs: [
          'A function is a reusable sequence of instructions. A call transfers control to it, and a return continues at the caller’s saved address.',
          'A calling convention is the shared set of rules that tells callers and functions where to place arguments, results, and return information.',
          'Under the common AArch64 calling convention, X0–X7 carry the first integer or pointer arguments. X0 carries an integer or pointer return value.',
        ],
        bullets: [
          'X0 = first argument and return value',
          'X1 = second argument',
          'BL = call a labeled function',
          'X30 / LR = return address',
          'RET = continue at X30',
        ],
        diagram: 'function-call',
      },
      {
        id: 'bl-and-ret',
        title: 'BL saves where to return',
        paragraphs: [
          'BL writes the address of the next instruction into X30, then changes PC to the function label. RET changes PC back to the address in X30.',
        ],
        code: `mov x0, 10
mov x1, 20
bl addnumbers
b end

addnumbers:
    add x0, x0, x1
    ret

end:
    mov x2, x0`,
        callout: 'Step BL and RET slowly: X30 is the connection between caller and callee.',
      },
    ],
    quiz: [
      {
        id: 'functions-return',
        prompt: 'What value does addnumbers return in X0?',
        code: `mov x0, 10
mov x1, 20
bl addnumbers
b end

addnumbers:
add x0, x0, x1
ret

end:
mov x2, x0`,
        options: [
          { id: 'a', label: '10' },
          { id: 'b', label: '20' },
          { id: 'c', label: '30' },
          { id: 'd', label: 'The return address' },
        ],
        correctOptionId: 'c',
        explanation: 'The function adds its X0 and X1 arguments and leaves the result, 30, in the return-value register X0.',
      },
    ],
    labProgram: `mov x0, 10
mov x1, 20
bl addnumbers
b end

addnumbers:
    add x0, x0, x1
    ret

end:
    mov x2, x0`,
  },
  {
    id: 'nested-function-calls',
    order: 12,
    title: 'Nested Function Calls',
    shortTitle: 'Nested Calls',
    description: 'See why a function must preserve its incoming link register before it calls another function.',
    estimatedMinutes: 13,
    prerequisites: ['function-calls', 'stack-frames'],
    sections: [
      {
        id: 'lr-overwrite',
        title: 'Every BL writes X30',
        paragraphs: [
          '_start calls foo, so X30 initially points back into _start. When foo calls bar, BL bar replaces X30 with a return address inside foo.',
          'Without saving the first return address, foo would no longer know how to return to _start.',
        ],
        diagram: 'nested-calls',
      },
      {
        id: 'save-before-nesting',
        title: 'Preserve the caller link',
        paragraphs: [
          'foo saves X30 with X29 on the stack before BL bar. Its epilogue restores the original X30 before RET.',
        ],
        code: `_start:
    mov x0, 5
    bl foo
    b end

foo:
    stp x29, x30, [sp, #-16]!
    mov x29, sp
    bl bar
    ldp x29, x30, [sp], #16
    ret

bar:
    add x0, x0, #10
    ret

end:
    mov x1, x0`,
        callout: 'Watch Function Calls, Stack, X30 / LR, SP, and PC together.',
      },
    ],
    quiz: [
      {
        id: 'nested-why-save-lr',
        prompt: 'Why does foo save X30 before executing BL bar?',
        options: [
          { id: 'a', label: 'BL bar will overwrite X30' },
          { id: 'b', label: 'ADD requires X30 to be zero' },
          { id: 'c', label: 'SP cannot hold an address' },
          { id: 'd', label: 'X0 must contain the return address' },
        ],
        correctOptionId: 'a',
        explanation: 'Every BL writes a new return address to X30, so foo must preserve the address it needs when it later returns to _start.',
      },
    ],
    labProgram: `_start:
    mov x0, 5
    bl foo
    b end

foo:
    stp x29, x30, [sp, #-16]!
    mov x29, sp
    bl bar
    ldp x29, x30, [sp], #16
    ret

bar:
    add x0, x0, #10
    ret

end:
    mov x1, x0`,
  },
  {
    id: 'data-sections-strings',
    order: 13,
    title: 'Data Sections and Strings',
    shortTitle: 'Data & Strings',
    description: 'Define labeled bytes separately from executable text and load their stable addresses.',
    estimatedMinutes: 10,
    prerequisites: ['addresses-pointers'],
    sections: [
      {
        id: 'sections',
        title: 'Separate data from code',
        paragraphs: [
          'A section groups bytes with the same purpose. .data or .section .data selects stored data, while .text or .section .text selects executable instructions.',
          'A label gives a readable name to an address. Data labels name byte addresses; text labels name instruction addresses. .globl declares a linker-visible name and is accepted by A64 Lab without changing execution.',
        ],
      },
      {
        id: 'string-directives',
        title: 'ASCII bytes and terminators',
        paragraphs: [
          'ASCII is a character encoding that represents letters and symbols with numeric byte values. A NULL terminator is a zero byte used to mark the end of many C strings.',
          '.asciz stores the text bytes and appends a NULL byte. .ascii stores only the text bytes.',
        ],
        bullets: [
          '.asciz "ARM64\\n" → 41 52 4d 36 34 0a 00',
          '.ascii "ARM64\\n" → 41 52 4d 36 34 0a',
        ],
        diagram: 'data-bytes',
      },
      {
        id: 'labeled-data',
        title: 'Load a data address',
        paragraphs: [
          'The label identifies the first byte. LDR with =message places that address in a register without reading the bytes yet.',
        ],
        code: `.section .data
message:
    .asciz "ARM64\\n"
raw:
    .ascii "RAW"

.section .text
.globl _start
_start:
    ldr x1, =message
    ldr x2, =raw`,
      },
    ],
    quiz: [
      {
        id: 'data-terminator',
        prompt: 'How many bytes does this directive allocate?',
        code: `.data
message:
.asciz "ABC"`,
        options: [
          { id: 'a', label: '2 bytes' },
          { id: 'b', label: '3 bytes' },
          { id: 'c', label: '4 bytes' },
          { id: 'd', label: '8 bytes' },
        ],
        correctOptionId: 'c',
        explanation: '.asciz stores the three ASCII bytes and appends one NULL byte, for four bytes total.',
      },
    ],
    labProgram: `.section .data
message:
    .asciz "ARM64\\n"
raw:
    .ascii "RAW"

.section .text
.globl _start
_start:
    ldr x1, =message
    ldr x2, =raw`,
  },
  {
    id: 'linux-syscalls',
    order: 14,
    title: 'Linux AArch64 Syscalls',
    shortTitle: 'Syscalls',
    description: 'Use the simulator’s simplified Linux AArch64 write and exit system calls.',
    estimatedMinutes: 12,
    prerequisites: ['data-sections-strings', 'registers'],
    sections: [
      {
        id: 'linux-convention',
        title: 'Linux AArch64 convention',
        paragraphs: [
          'A system call is a program’s request for an operating-system service, such as writing output or ending a process.',
          'In the Linux AArch64 syscall convention, X0–X5 hold syscall arguments, X8 selects the service by number, and SVC 0 performs the request.',
          'These numbers are Linux AArch64 values; syscall numbers are not universal across operating systems or architectures.',
        ],
        bullets: [
          'X8 = 64 → write',
          'X8 = 93 → exit',
        ],
        diagram: 'syscall',
      },
      {
        id: 'write-arguments',
        title: 'Write to stdout',
        paragraphs: [
          'For write, X0 is the file descriptor, X1 is the buffer address, and X2 is the exact byte count. File descriptor 1 means stdout.',
        ],
        bullets: [
          'X0 = 1 → stdout',
          'X1 = address of message',
          'X2 = 6 → number of bytes',
          'X8 = 64 → write',
        ],
      },
      {
        id: 'hello-syscall',
        title: 'Write, then exit',
        paragraphs: [
          'Step through SVC 0 to append hello and a newline to the terminal. The second SVC exits cleanly with status 0.',
        ],
        code: `.section .data
message:
    .asciz "hello\\n"

.section .text
.globl _start
_start:
    mov x0, 1
    ldr x1, =message
    mov x2, 6
    mov x8, 64
    svc 0

    mov x0, 0
    mov x8, 93
    svc 0`,
        callout: 'With X8 = 64, SVC 0 means write(fd=X0, buffer=X1, size=X2).',
      },
    ],
    quiz: [
      {
        id: 'syscalls-size',
        prompt: 'Which register tells Linux write how many bytes to read from the buffer?',
        options: [
          { id: 'a', label: 'X0' },
          { id: 'b', label: 'X1' },
          { id: 'c', label: 'X2' },
          { id: 'd', label: 'X8' },
        ],
        correctOptionId: 'c',
        explanation: 'For write, X2 is the byte count. The call reads exactly that many bytes and does not depend on NULL termination.',
      },
    ],
    labProgram: `.section .data
message:
    .asciz "hello\\n"

.section .text
.globl _start
_start:
    mov x0, 1
    ldr x1, =message
    mov x2, 6
    mov x8, 64
    svc 0

    mov x0, 0
    mov x8, 93
    svc 0`,
  },
  {
    id: 'reading-disassembly',
    order: 15,
    title: 'Reading Disassembly',
    shortTitle: 'Disassembly',
    description: 'Turn a familiar prologue, body, and epilogue into simple pseudocode.',
    estimatedMinutes: 12,
    prerequisites: ['stack-frames', 'function-calls'],
    sections: [
      {
        id: 'recognize-shape',
        title: 'Read patterns, not isolated lines',
        paragraphs: [
          'Disassembly is readable assembly produced by decoding a binary’s machine-code bytes.',
          'A function prologue prepares its stack frame and saves needed state; an epilogue restores that state and returns. Locate those boundaries first, then track arguments, stack slots, loads, stores, and the return-value register.',
          'Actual compiler output varies with compiler, options, optimization, and surrounding code.',
        ],
        diagram: 'disassembly',
      },
      {
        id: 'increment-function',
        title: 'A small function pattern',
        paragraphs: [
          'To spill a register means to save its value in memory, often in a stack slot. This function saves FP/LR, spills its X0 argument, loads it again, adds one, and leaves the result in X0 before restoring the frame.',
        ],
        code: `function:
    stp x29, x30, [sp, #-32]!
    mov x29, sp
    str x0, [sp, #16]
    ldr x0, [sp, #16]
    add x0, x0, #1
    ldp x29, x30, [sp], #32
    ret`,
        callout: 'Simplified pseudocode: long function(long value) { return value + 1; }',
      },
      {
        id: 'trace-real-looking-code',
        title: 'Trace it in context',
        paragraphs: [
          'The lab adds a small caller so RET has a valid saved destination. Watch X0 travel through the call and return as 42.',
        ],
      },
    ],
    quiz: [
      {
        id: 'disassembly-purpose',
        prompt: 'What is the function approximately doing to its X0 argument?',
        code: `str x0, [sp, #16]
ldr x0, [sp, #16]
add x0, x0, #1`,
        options: [
          { id: 'a', label: 'Returns the value plus 1' },
          { id: 'b', label: 'Returns the stack address' },
          { id: 'c', label: 'Compares the value with 1' },
          { id: 'd', label: 'Calls an indirect function' },
        ],
        correctOptionId: 'a',
        explanation: 'The argument is stored and reloaded, then ADD increments the return-value register X0 by one.',
      },
    ],
    labProgram: `_start:
    mov x0, 41
    bl function
    b end

function:
    stp x29, x30, [sp, #-32]!
    mov x29, sp
    str x0, [sp, #16]
    ldr x0, [sp, #16]
    add x0, x0, #1
    ldp x29, x30, [sp], #32
    ret

end:
    mov x1, x0`,
  },
  {
    id: 'c-to-arm64',
    order: 16,
    title: 'C to ARM64',
    shortTitle: 'C to ARM64',
    description: 'Connect small C operations to illustrative register and branch patterns.',
    estimatedMinutes: 10,
    prerequisites: ['function-calls', 'branches'],
    sections: [
      {
        id: 'integer-add',
        title: 'Arguments become registers',
        paragraphs: [
          'For the illustrative C function int add(int a, int b), W0 can hold a, W1 can hold b, and W0 can hold the returned sum.',
          'A compact possible body is ADD W0, W0, W1 followed by RET. This is illustrative, not guaranteed compiler output.',
        ],
        code: `addints:
    add w0, w0, w1
    ret`,
        diagram: 'c-mapping',
      },
      {
        id: 'if-pattern',
        title: 'Conditions become flags and branches',
        paragraphs: [
          'A C condition such as if (a == b) can become CMP followed by a conditional branch. Other instruction selections are also possible.',
        ],
        code: `cmp w0, w1
b.ne notequal
mov w2, 1
b end

notequal:
    mov w2, 0

end:
    mov w3, w2`,
        callout: 'C describes intent; assembly exposes one concrete implementation of the data and control flow.',
      },
    ],
    quiz: [
      {
        id: 'c-register-map',
        prompt: 'In the illustrated add function, where is the integer return value placed?',
        code: `add w0, w0, w1
ret`,
        options: [
          { id: 'a', label: 'W0' },
          { id: 'b', label: 'W1' },
          { id: 'c', label: 'X29' },
          { id: 'd', label: 'SP' },
        ],
        correctOptionId: 'a',
        explanation: 'The common calling convention uses W0/X0 for the first argument and for an integer or pointer return value.',
      },
    ],
    labProgram: `_start:
    mov w0, 10
    mov w1, 20
    bl addints
    b end

addints:
    add w0, w0, w1
    ret

end:
    mov w2, w0`,
  },
  {
    id: 'debugging-state',
    order: 17,
    title: 'Debugging ARM64 State',
    shortTitle: 'Debugging State',
    description: 'Prioritize PC, LR, SP, arguments, pointers, and repeated byte patterns in a register snapshot.',
    estimatedMinutes: 9,
    prerequisites: ['registers', 'addresses-pointers', 'function-calls'],
    sections: [
      {
        id: 'state-triage',
        title: 'Start with control and stack state',
        paragraphs: [
          'PC shows where execution is headed, LR often shows where the current function plans to return, and SP anchors the current stack view.',
          'Next inspect argument registers and any values that resemble mapped addresses.',
        ],
        bullets: [
          'PC: current instruction address',
          'X30 / LR: likely return address',
          'SP and X29 / FP: current stack context',
          'X0–X7: likely arguments or recent values',
        ],
        diagram: 'debug-state',
      },
      {
        id: 'repeated-pattern',
        title: 'Repeated bytes stand out',
        paragraphs: [
          'Hex byte 0x41 is ASCII A. Debuggers often use repeated, recognizable input bytes, so 0x4141414141414141 is easy to connect back to eight A characters in test input.',
          'A repeated input pattern in PC or LR is especially unusual because those registers normally contain executable addresses. It can suggest overwritten control data, but the pattern alone does not prove a vulnerability.',
        ],
        bullets: [
          'X1 = 0x4141414141414141 → repeated A bytes',
          'X29 = 0x00007fffffffdff0 → pointer-looking stack address',
          'X30 or PC = 0x4141414141414141 → suspicious control-flow value',
        ],
      },
      {
        id: 'build-debug-state',
        title: 'Create a state to inspect',
        paragraphs: [
          'Step through the lab and inspect which values look like data, stack pointers, or control information. A pattern alone proves nothing; context determines what it means.',
        ],
        code: `mov x1, 0x4141414141414141
mov x29, sp
sub sp, sp, #32
mov x30, 0x4141414141414141
mov x2, x1`,
      },
    ],
    quiz: [
      {
        id: 'debug-pattern',
        prompt: 'Which value most clearly looks like repeated ASCII input rather than an ordinary aligned code address?',
        options: [
          { id: 'a', label: '0x0000000000000010' },
          { id: 'b', label: '0x00007fffffffdff0' },
          { id: 'c', label: '0x4141414141414141' },
          { id: 'd', label: '0x0000000000400000' },
        ],
        correctOptionId: 'c',
        explanation: '0x41 is ASCII A, so the value is a repeated-byte pattern. In PC or LR it would deserve immediate investigation.',
      },
    ],
    labProgram: `mov x1, 0x4141414141414141
mov x29, sp
sub sp, sp, #32
mov x30, 0x4141414141414141
mov x2, x1`,
  },
  {
    id: 'native-code-patterns',
    order: 18,
    title: 'Common Native-Code Patterns',
    shortTitle: 'Native Patterns',
    description: 'Recognize practical argument, frame, memory, branch, direct-call, and indirect-call patterns.',
    estimatedMinutes: 14,
    prerequisites: ['reading-disassembly', 'debugging-state'],
    sections: [
      {
        id: 'pattern-checklist',
        title: 'A practical reading checklist',
        paragraphs: [
          'When reading a native function, identify its incoming arguments, pointer dereferences, return value, saved LR, frame shape, comparisons, branches, and calls.',
        ],
        bullets: [
          'X0–X7 often reveal function inputs',
          'LDR and STR reveal memory flow',
          'CMP plus B.cond reveals decisions',
          'STP/LDP of X29 and X30 reveals frame boundaries',
          'BL names a direct target; BLR calls through a register',
        ],
      },
      {
        id: 'indirect-control-flow',
        title: 'Indirect jumps and calls',
        paragraphs: [
          'A direct call names its destination in the instruction. An indirect call reads its destination address from a register, so the target can be chosen at runtime.',
          'BL function makes a direct call to a label and saves a return address. BLR X8 indirectly calls the address currently stored in X8 and also saves a return address.',
          'BR X8 jumps to the address in X8 without saving a new return address. Indirect targets often come from tables, callbacks, or resolved function pointers.',
        ],
        bullets: [
          'bl function → direct call',
          'blr x8 → indirect call through X8',
          'br x8 → indirect jump through X8',
        ],
        diagram: 'indirect-call',
      },
      {
        id: 'trace-indirect-flow',
        title: 'Trace both indirect forms',
        paragraphs: [
          'The lab loads code-label addresses into registers. BLR calls worker and sets LR; after RET, BR jumps to end without changing LR.',
        ],
        code: `_start:
    mov x0, 5
    ldr x8, =worker
    blr x8
    ldr x9, =end
    br x9

worker:
    add x0, x0, #10
    ret

end:
    mov x1, x0`,
      },
    ],
    quiz: [
      {
        id: 'patterns-blr',
        prompt: 'What distinguishes BLR X8 from BR X8 in this simulator?',
        options: [
          { id: 'a', label: 'BLR saves a return address in X30' },
          { id: 'b', label: 'BR always jumps to a text label' },
          { id: 'c', label: 'BLR reads eight bytes from memory' },
          { id: 'd', label: 'BR stores X8 on the stack' },
        ],
        correctOptionId: 'a',
        explanation: 'Both use the address in X8, but BLR is a call and writes the next instruction address to X30 / LR. BR does not.',
      },
    ],
    labProgram: `_start:
    mov x0, 5
    ldr x8, =worker
    blr x8
    ldr x9, =end
    br x9

worker:
    add x0, x0, #10
    ret

end:
    mov x1, x0`,
  },
];

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.id === id);
}

export function getAdjacentLessons(id: string): { previous: Lesson | null; next: Lesson | null } {
  const index = LESSONS.findIndex((lesson) => lesson.id === id);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: LESSONS[index - 1] ?? null,
    next: LESSONS[index + 1] ?? null,
  };
}
