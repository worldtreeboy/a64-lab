export interface BeginnerGuideTerm {
  term: string;
  meaning: string;
}

export interface BeginnerGuideStep {
  title: string;
  explanation: string;
  example?: string;
}

export interface BeginnerGuide {
  lessonId: BeginnerGuideLessonId;
  order: number;
  title: string;
  purpose: string;
  terms: readonly BeginnerGuideTerm[];
  steps: readonly BeginnerGuideStep[];
  remember: string;
}

export type BeginnerGuideLessonId =
  | 'cmp-nzcv'
  | 'unconditional-branches'
  | 'branches'
  | 'signed-flags'
  | 'ordered-branches'
  | 'function-calls'
  | 'function-return'
  | 'function-arguments'
  | 'function-results'
  | 'saving-return-address'
  | 'load-store-pair'
  | 'indexed-addressing'
  | 'frame-pointer'
  | 'stack-frames'
  | 'nested-function-calls'
  | 'data-sections-strings'
  | 'string-data'
  | 'loading-addresses'
  | 'syscall-gate'
  | 'linux-syscalls'
  | 'reading-disassembly'
  | 'c-to-arm64'
  | 'debugging-state'
  | 'indirect-control-flow'
  | 'native-code-patterns';

const BEGINNER_GUIDES = {
  'cmp-nzcv': {
    lessonId: 'cmp-nzcv',
    order: 12,
    title: 'How CMP and TST Answer Questions',
    purpose: 'Programs need a small result they can use to decide what to do next. These instructions examine values, leave the original values alone, and update flags—including the one-bit Z zero-or-non-zero answer.',
    terms: [
      {
        term: 'Flag',
        meaning: 'A one-bit result kept by the processor. A flag is either 0 or 1 and describes something about the most recent flag-setting operation.',
      },
      {
        term: 'CMP — Compare',
        meaning: 'CMP checks two values by calculating the first value minus the second for flags only. It does not save that subtraction result and does not change either input.',
      },
      {
        term: 'TST — Test bits',
        meaning: 'TST performs a bitwise AND for flags only. It is useful for asking whether selected bits overlap. It does not save the AND result or change either input.',
      },
      {
        term: 'Z — Zero flag',
        meaning: 'Z becomes 1 when the calculated comparison or test result is zero. Otherwise Z becomes 0.',
      },
    ],
    steps: [
      {
        title: 'Start with a question',
        explanation: 'To ask whether two values are equal, compare them. Equal values produce a subtraction result of zero.',
        example: 'cmp x0, x1',
      },
      {
        title: 'Read the Z flag',
        explanation: 'If X0 equals X1, Z becomes 1. If they differ, Z becomes 0. X0 and X1 keep their values.',
      },
      {
        title: 'Use TST for bits',
        explanation: 'TST combines matching bit positions with AND. If no tested bit is 1 in both values, the temporary result is zero and Z becomes 1.',
        example: 'tst x0, x1',
      },
      {
        title: 'Use the answer soon',
        explanation: 'A later flag-setting instruction replaces the earlier flag answers. Conditional branches therefore usually appear close to the comparison that supplies their flags.',
      },
    ],
    remember: 'CMP asks about values; TST asks about bits; both write flags rather than a normal register result.',
  },
  'unconditional-branches': {
    lessonId: 'unconditional-branches',
    order: 13,
    title: 'Jump to Another Instruction with B',
    purpose: 'Code normally runs from one instruction to the next. An unconditional branch lets the program continue from a different named location instead.',
    terms: [
      {
        term: 'Label',
        meaning: 'A name that an assembler associates with an address. A label marks a location; it is not an instruction and does not take an execution step.',
      },
      {
        term: 'PC — Program Counter',
        meaning: 'The register-like processor state that identifies the current instruction address.',
      },
      {
        term: 'B — Branch',
        meaning: 'An unconditional jump. B changes the next instruction address to the address named by its label.',
      },
      {
        term: 'Fall through',
        meaning: 'Continue to the next instruction in address order without jumping elsewhere.',
      },
    ],
    steps: [
      {
        title: 'Find the destination label',
        explanation: 'The assembler resolves the label to an instruction address before the program runs.',
        example: 'end:',
      },
      {
        title: 'Execute the branch',
        explanation: 'B makes the destination address the next value of the program counter.',
        example: 'b end',
      },
      {
        title: 'Skip the instructions in between',
        explanation: 'Instructions between B and the destination are not executed on that path, so they cannot change registers or memory.',
      },
      {
        title: 'Continue at the destination',
        explanation: 'Execution resumes with the instruction attached to the label. The label itself performs no work.',
      },
    ],
    remember: 'B always jumps to its label; it does not test a value and it does not save a return address.',
  },
  branches: {
    lessonId: 'branches',
    order: 14,
    title: 'Choose Equal or Not-Equal Paths',
    purpose: 'A program can choose between two paths by first recording a comparison result and then letting a conditional branch read that result.',
    terms: [
      {
        term: 'Condition flag',
        meaning: 'A one-bit result from a comparison or another flag-setting instruction.',
      },
      {
        term: 'CMP — Compare',
        meaning: 'CMP calculates a subtraction for flags only. It leaves both compared values unchanged.',
      },
      {
        term: 'Z — Zero flag',
        meaning: 'After CMP, Z is 1 when the compared values are equal and 0 when they are different.',
      },
      {
        term: 'B.EQ — Branch if equal',
        meaning: 'B.EQ takes its branch when Z is 1. EQ means equal.',
      },
      {
        term: 'B.NE — Branch if not equal',
        meaning: 'B.NE takes its branch when Z is 0. NE means not equal.',
      },
    ],
    steps: [
      {
        title: 'Compare first',
        explanation: 'CMP updates the flags that describe the two values.',
        example: 'cmp x0, x1',
      },
      {
        title: 'Ask one flag question',
        explanation: 'B.EQ asks whether Z is 1. B.NE asks whether Z is 0. The branch does not repeat the comparison.',
        example: 'b.ne different',
      },
      {
        title: 'Follow exactly one path',
        explanation: 'When the condition is true, execution jumps to the label. When it is false, execution falls through to the following instruction.',
      },
      {
        title: 'Keep the pair together',
        explanation: 'Another flag-setting instruction between CMP and the branch could replace Z and change the decision.',
      },
    ],
    remember: 'CMP creates the answer in Z; B.EQ or B.NE reads that answer and chooses the path.',
  },
  'signed-flags': {
    lessonId: 'signed-flags',
    order: 15,
    title: 'Understand Signed Comparison Flags',
    purpose: 'The same bits can represent a signed or an unsigned number. Correct less-than and greater-than decisions depend on choosing the intended interpretation.',
    terms: [
      {
        term: 'Signed value',
        meaning: 'A fixed-width bit pattern interpreted as a value that may be negative, zero, or positive.',
      },
      {
        term: 'Unsigned value',
        meaning: 'The same fixed-width bit pattern interpreted as zero or a positive value only.',
      },
      {
        term: 'N — Negative flag',
        meaning: 'N copies the top bit of the fixed-width result. For a subtraction, it is one part of a signed comparison.',
      },
      {
        term: 'Z — Zero flag',
        meaning: 'Z is 1 when the fixed-width result is zero.',
      },
      {
        term: 'C — Carry flag',
        meaning: 'For subtraction, C is 1 when no unsigned borrow was needed. It is mainly used for unsigned comparisons.',
      },
      {
        term: 'V — Overflow flag',
        meaning: 'V is 1 when a signed result cannot be represented in the chosen register width.',
      },
      {
        term: 'Two’s complement',
        meaning: 'The fixed-width signed-number interpretation used by AArch64. A top bit of 1 represents the negative half of the range, but overflow can make the computed top bit misleading.',
      },
    ],
    steps: [
      {
        title: 'Choose the number meaning',
        explanation: 'Decide whether the values should be treated as signed or unsigned. Assembly registers themselves do not store a type label.',
      },
      {
        title: 'Compare in the correct width',
        explanation: 'CMP on X registers performs a 64-bit comparison. CMP on W registers performs a 32-bit comparison. Width changes the sign bit and wraparound point.',
        example: 'cmp x0, x1',
      },
      {
        title: 'Read flags as a group',
        explanation: 'For signed ordering, N must be considered with V. For example, 32-bit 0x80000000 minus 1 wraps to 0x7FFFFFFF: N = 0 but V = 1, so N alone would give the wrong less-than answer.',
      },
      {
        title: 'Use C for unsigned order',
        explanation: 'After a subtraction-style comparison, C = 1 means the first value was at least the second as unsigned values. Later lessons focus on the signed branch conditions supported by this simulator.',
      },
    ],
    remember: 'Bits have no built-in signed type: signed comparisons use N with V, while unsigned comparisons use C with Z.',
  },
  'ordered-branches': {
    lessonId: 'ordered-branches',
    order: 16,
    title: 'Choose Greater and Less Paths',
    purpose: 'Equality is only one kind of decision. Ordered branches let code choose a path by asking whether one signed value is greater than, less than, or equal to another.',
    terms: [
      {
        term: 'Ordered comparison',
        meaning: 'A comparison that asks where one value comes before, matches, or comes after another value.',
      },
      {
        term: 'B.GT — Branch if signed greater than',
        meaning: 'Takes the branch when Z is 0 and N equals V.',
      },
      {
        term: 'B.LT — Branch if signed less than',
        meaning: 'Takes the branch when N differs from V.',
      },
      {
        term: 'B.GE — Branch if signed greater than or equal',
        meaning: 'Takes the branch when N equals V. GE includes equality.',
      },
      {
        term: 'B.LE — Branch if signed less than or equal',
        meaning: 'Takes the branch when Z is 1 or N differs from V. LE includes equality.',
      },
    ],
    steps: [
      {
        title: 'Compare the two values',
        explanation: 'CMP updates N, Z, C, and V as though it subtracted the second value from the first.',
        example: 'cmp x0, x1',
      },
      {
        title: 'Read the condition in sentence order',
        explanation: 'After CMP X0, X1, B.LT means branch when X0 is signed less than X1.',
        example: 'b.lt smaller',
      },
      {
        title: 'Notice whether equality counts',
        explanation: 'GT and LT exclude equality. GE and LE include equality.',
      },
      {
        title: 'Do not mix signed and unsigned intent',
        explanation: 'These four conditions are signed. Real AArch64 also has unsigned higher and lower conditions, but this educational simulator does not currently expose them.',
      },
    ],
    remember: 'Read CMP X0, X1 as “compare X0 with X1,” then choose the signed condition that matches the question.',
  },
  'function-calls': {
    lessonId: 'function-calls',
    order: 17,
    title: 'Call a Function with BL and LR',
    purpose: 'A function call needs two destinations: where the called function begins and where execution should continue after that function finishes.',
    terms: [
      {
        term: 'Function',
        meaning: 'A reusable block of code entered from a caller and normally returned from later.',
      },
      {
        term: 'Caller',
        meaning: 'The code that starts a function call.',
      },
      {
        term: 'Callee',
        meaning: 'The function that the caller enters.',
      },
      {
        term: 'BL — Branch with link',
        meaning: 'BL jumps to a named function and writes the address of the following instruction into X30.',
      },
      {
        term: 'LR — Link Register',
        meaning: 'The conventional name for X30 when it holds a return address. The return address tells the callee where its caller should resume.',
      },
    ],
    steps: [
      {
        title: 'Prepare any input values',
        explanation: 'Prepare any inputs the callee expects. Lesson 19 explains the agreed register locations used for common function arguments.',
      },
      {
        title: 'Execute BL',
        explanation: 'BL writes the address after the call into X30, then changes the program counter to the function label.',
        example: 'bl calculate',
      },
      {
        title: 'Run the callee',
        explanation: 'The callee performs its instructions. BL itself does not reserve stack memory or save general registers.',
      },
      {
        title: 'Keep the return route safe',
        explanation: 'A later BL overwrites X30. A function that makes another call must preserve its incoming return address if it still needs it.',
      },
    ],
    remember: 'BL performs two state changes: it jumps to the callee and puts the return address in X30, also called LR.',
  },
  'function-return': {
    lessonId: 'function-return',
    order: 18,
    title: 'Return to the Caller with RET',
    purpose: 'After a function finishes its work, execution needs to resume at the instruction following the call.',
    terms: [
      {
        term: 'Return address',
        meaning: 'The instruction address where the caller should continue after the callee finishes.',
      },
      {
        term: 'X30 or LR — Link Register',
        meaning: 'The register that normally holds the current return address after a direct function call.',
      },
      {
        term: 'RET — Return',
        meaning: 'RET transfers control to an address in a register. Plain RET uses X30 by default.',
      },
      {
        term: 'PC — Program Counter',
        meaning: 'The processor state that selects the current instruction address.',
      },
    ],
    steps: [
      {
        title: 'Begin with a valid return address',
        explanation: 'A preceding call normally placed the address after that call in X30.',
      },
      {
        title: 'Finish the callee’s work',
        explanation: 'Prepare any result and restore any state the callee promised to preserve before returning.',
      },
      {
        title: 'Execute RET',
        explanation: 'Plain RET uses X30 as its destination, so the program counter changes to the saved return address.',
        example: 'ret',
      },
      {
        title: 'Resume the caller',
        explanation: 'RET changes control flow. It does not erase X30, restore stack memory, or calculate a function result by itself.',
      },
    ],
    remember: 'Plain RET means “continue at the address currently in X30.”',
  },
  'function-arguments': {
    lessonId: 'function-arguments',
    order: 19,
    title: 'Pass Function Arguments in Registers',
    purpose: 'A caller and callee need an agreed place for input values. The platform calling convention provides that shared map.',
    terms: [
      {
        term: 'Argument',
        meaning: 'A value supplied by a caller to a function.',
      },
      {
        term: 'Calling convention',
        meaning: 'A shared set of rules for passing values, returning results, and preserving machine state across function calls.',
      },
      {
        term: 'AAPCS64 — Procedure Call Standard for the Arm 64-bit Architecture',
        meaning: 'The Arm calling standard used as the basis for common AArch64 native function calls, including Android native code.',
      },
      {
        term: 'X0–X7',
        meaning: 'The eight general-purpose parameter/result registers. Simple integer and pointer arguments are commonly assigned here from left to right when they fit.',
      },
    ],
    steps: [
      {
        title: 'Identify the call boundary',
        explanation: 'Register roles are clearest immediately before entry to a function. Later, the callee may reuse the same registers.',
      },
      {
        title: 'Place simple inputs in order',
        explanation: 'For a simple two-integer example, the caller places argument 1 in X0 and argument 2 in X1 before the call.',
        example: 'mov x0, 10\nmov x1, 20\nbl calculate',
      },
      {
        title: 'Let the callee read them',
        explanation: 'The callee can use X0 and X1 immediately because both sides follow the same convention.',
      },
      {
        title: 'Treat this as the beginner case',
        explanation: 'Real argument placement also depends on value type and size; additional arguments or large values may use the stack. “The first eight arguments are always X0–X7” is not a complete rule for every type.',
      },
    ],
    remember: 'At a simple integer or pointer call boundary, start by looking in X0 through X7 for inputs.',
  },
  'function-results': {
    lessonId: 'function-results',
    order: 20,
    title: 'Return a Function Result in X0',
    purpose: 'The caller needs to know where a completed function leaves its answer. For a simple integer or pointer result, the standard answer register is X0.',
    terms: [
      {
        term: 'Return value',
        meaning: 'A result produced by a function for its caller.',
      },
      {
        term: 'X0',
        meaning: 'The first parameter/result register. It may begin a call as an input and finish the call as a new output.',
      },
      {
        term: 'W0',
        meaning: 'The lower 32-bit view of X0, commonly used for a 32-bit integer result.',
      },
      {
        term: 'RET — Return',
        meaning: 'The control-flow instruction that returns to the caller. It does not move or calculate the return value.',
      },
    ],
    steps: [
      {
        title: 'Receive the inputs',
        explanation: 'A function may begin with its first input already in X0.',
      },
      {
        title: 'Place the answer in X0',
        explanation: 'The function writes its final simple integer or pointer result into X0 before returning.',
        example: 'add x0, x0, x1',
      },
      {
        title: 'Return without moving the answer',
        explanation: 'RET changes the program counter using X30. X0 simply keeps the prepared result.',
      },
      {
        title: 'Use or preserve the result',
        explanation: 'The caller reads X0 after the return. If the value must survive another call, the caller must keep it in storage that the calling convention says will be preserved, or save it in memory. Larger or multiple results can follow different rules.',
      },
    ],
    remember: 'For the common single integer or pointer case, prepare X0 first and then RET.',
  },
  'saving-return-address': {
    lessonId: 'saving-return-address',
    order: 21,
    title: 'Protect a Return Address Across Another Call',
    purpose: 'A function that calls another function still needs its own route back to its caller. Because each call writes X30, the older return address must be preserved first.',
    terms: [
      {
        term: 'Leaf function',
        meaning: 'A function that does not call another function.',
      },
      {
        term: 'Non-leaf function',
        meaning: 'A function that makes at least one function call.',
      },
      {
        term: 'LR — Link Register',
        meaning: 'The X30 register when it carries a return address.',
      },
      {
        term: 'Preserve',
        meaning: 'Keep a value safe so the same value can be restored later.',
      },
      {
        term: '16-byte aligned SP',
        meaning: 'The address in SP is a multiple of 16. AAPCS64 requires this at public function interfaces and whenever memory is accessed through SP; adding or subtracting 16 keeps an aligned SP aligned.',
      },
    ],
    steps: [
      {
        title: 'Notice the danger',
        explanation: 'When the current function was called, X30 received its return-to-caller address. A nested BL would replace that value.',
      },
      {
        title: 'Reserve stack space',
        explanation: 'Lower the stack pointer before writing the saved return address. Keeping the stack pointer 16-byte aligned follows the standard stack rule used by these examples.',
        example: 'sub sp, sp, #16',
      },
      {
        title: 'Save X30, then make the call',
        explanation: 'Store the incoming X30 in the reserved memory. The nested call may now write a new return address to X30.',
        example: 'str x30, [sp]\nbl bar',
      },
      {
        title: 'Restore before returning',
        explanation: 'Load the older address back into X30, release the stack space, and only then use RET.',
        example: 'ldr x30, [sp]\nadd sp, sp, #16\nret',
      },
    ],
    remember: 'A nested call overwrites X30, so a non-leaf function must preserve its incoming return address somewhere safe.',
  },
  'load-store-pair': {
    lessonId: 'load-store-pair',
    order: 22,
    title: 'Move Two Registers with STP and LDP',
    purpose: 'Functions often save or restore two neighboring 64-bit values. Pair instructions express that common memory transfer clearly.',
    terms: [
      {
        term: 'Pair',
        meaning: 'Two register values handled by one instruction.',
      },
      {
        term: 'STP — Store Pair',
        meaning: 'STP writes two registers to neighboring memory locations.',
      },
      {
        term: 'LDP — Load Pair',
        meaning: 'LDP reads two neighboring memory values into two registers.',
      },
      {
        term: 'SP — Stack Pointer',
        meaning: 'A register containing the address of the currently active stack boundary.',
      },
    ],
    steps: [
      {
        title: 'Reserve enough space',
        explanation: 'Two X registers contain eight bytes each, so this example reserves sixteen stack bytes.',
        example: 'sub sp, sp, #16',
      },
      {
        title: 'Store the pair',
        explanation: 'STP stores X29 at the address in SP and X30 at SP plus eight. The registers themselves keep their values.',
        example: 'stp x29, x30, [sp]',
      },
      {
        title: 'Load in the same order',
        explanation: 'LDP loads the first eight-byte value into X29 and the next value into X30.',
        example: 'ldp x29, x30, [sp]',
      },
      {
        title: 'Release the space separately',
        explanation: 'The forms above do not change SP. A separate ADD restores the earlier stack boundary.',
        example: 'add sp, sp, #16',
      },
    ],
    remember: 'With X registers, STP and LDP transfer two eight-byte values; plain [SP] does not move SP.',
  },
  'indexed-addressing': {
    lessonId: 'indexed-addressing',
    order: 23,
    title: 'Combine Memory Access with Address Update',
    purpose: 'Pre-index and post-index forms can update a base register as part of a load or store. Stack save-and-restore sequences often use them to reduce the number of instructions.',
    terms: [
      {
        term: 'Base register',
        meaning: 'The register containing the starting address for a memory access, such as SP.',
      },
      {
        term: 'Offset',
        meaning: 'A byte amount added to or subtracted from a base address.',
      },
      {
        term: 'Writeback',
        meaning: 'Updating the base register with the calculated address as part of the memory instruction.',
      },
      {
        term: 'Pre-index',
        meaning: 'Calculate and write back the new base first, then access memory at that new address. The exclamation mark requests writeback.',
      },
      {
        term: 'Post-index',
        meaning: 'Access memory using the old base address, then update the base by the trailing offset.',
      },
    ],
    steps: [
      {
        title: 'Recognize pre-index punctuation',
        explanation: 'The offset is inside the brackets and an exclamation mark follows them.',
        example: 'stp x29, x30, [sp, #-16]!',
      },
      {
        title: 'Follow pre-index in two ideas',
        explanation: 'First SP becomes SP minus 16. Then the pair is stored at the new SP address. This one instruction both reserves and uses the space.',
      },
      {
        title: 'Recognize post-index punctuation',
        explanation: 'The memory brackets contain the old base only, and the update appears after the brackets.',
        example: 'ldp x29, x30, [sp], #16',
      },
      {
        title: 'Follow post-index in two ideas',
        explanation: 'First the pair is loaded from the old SP address. Then SP becomes SP plus 16, releasing that space.',
      },
    ],
    remember: 'Pre-index updates then accesses; post-index accesses then updates.',
  },
  'frame-pointer': {
    lessonId: 'frame-pointer',
    order: 24,
    title: 'Use X29 as a Stable Stack Reference',
    purpose: 'The stack pointer can move while a function runs. A frame pointer can keep one stable address for referring to the current function’s stack area.',
    terms: [
      {
        term: 'Stack frame',
        meaning: 'The part of stack memory used by one active function invocation for saved state and local temporary data.',
      },
      {
        term: 'FP — Frame Pointer',
        meaning: 'A register used as a stable reference point inside the current stack frame. AArch64 convention commonly uses X29.',
      },
      {
        term: 'SP — Stack Pointer',
        meaning: 'The register marking the current stack boundary. A function may adjust it as stack space is reserved or released.',
      },
      {
        term: 'Optional frame pointer',
        meaning: 'A compiler may omit X29 as a frame pointer when it can address everything from SP and other information is sufficient.',
      },
    ],
    steps: [
      {
        title: 'Reserve the function’s stack area',
        explanation: 'Move SP down by 32 bytes. Because 32 is a multiple of 16, an already 16-byte-aligned SP remains aligned.',
        example: 'sub sp, sp, #32',
      },
      {
        title: 'Anchor X29',
        explanation: 'Copy the current SP address into X29. MOV changes only the register value; it does not reserve more memory.',
        example: 'mov x29, sp',
      },
      {
        title: 'Allow SP to move',
        explanation: 'If SP changes again, X29 can still point to the chosen frame location.',
      },
      {
        title: 'Restore the caller’s state',
        explanation: 'Before returning, a function using the standard convention restores the incoming X29 value and returns SP to its incoming value.',
      },
    ],
    remember: 'SP is the moving stack boundary; X29 can be used as a stable reference inside one function, but it is not mandatory.',
  },
  'stack-frames': {
    lessonId: 'stack-frames',
    order: 25,
    title: 'Build and Remove One Stack Frame',
    purpose: 'A function can organize its saved state and temporary memory as one stack frame, then undo that work before it returns.',
    terms: [
      {
        term: 'Stack frame',
        meaning: 'The currently active function invocation’s region of stack memory.',
      },
      {
        term: 'Prologue',
        meaning: 'A conventional group of instructions at function entry that prepares the stack frame and preserves needed state.',
      },
      {
        term: 'Epilogue',
        meaning: 'A conventional group of instructions near function exit that restores saved state and removes the frame.',
      },
      {
        term: 'Frame record',
        meaning: 'When this convention is used, two neighboring 64-bit values containing the previous X29 frame pointer and X30 link register.',
      },
    ],
    steps: [
      {
        title: 'Save the incoming frame and return state',
        explanation: 'Pre-indexed STP lowers SP by 16, then saves X29 and X30 in that space.',
        example: 'stp x29, x30, [sp, #-16]!',
      },
      {
        title: 'Establish this frame’s reference',
        explanation: 'Copy the new SP into X29 so it can serve as the current frame pointer.',
        example: 'mov x29, sp',
      },
      {
        title: 'Perform the useful work',
        explanation: 'The function may use registers and any additional stack space it deliberately reserves. Creating a frame does not calculate the result.',
      },
      {
        title: 'Restore, release, and return',
        explanation: 'Post-indexed LDP reloads X29 and X30 and raises SP. RET then uses the restored X30 as its destination.',
        example: 'ldp x29, x30, [sp], #16\nret',
      },
    ],
    remember: 'A frame must be undone in reverse: restore saved state, return SP to its incoming value, then return.',
  },
  'nested-function-calls': {
    lessonId: 'nested-function-calls',
    order: 26,
    title: 'Keep Nested Function Calls Separate',
    purpose: 'When one function calls another, both invocations need the correct return route. Stack memory lets the outer function preserve its return state while the inner call uses X30.',
    terms: [
      {
        term: 'Nested call',
        meaning: 'A function call made while an earlier function call is still active.',
      },
      {
        term: 'Call chain',
        meaning: 'The active sequence of callers and callees, such as start → foo → bar.',
      },
      {
        term: 'Live value',
        meaning: 'A value that will be needed again later and therefore must not be lost.',
      },
      {
        term: 'Saved return address',
        meaning: 'An older X30 value copied to safe storage before a later call overwrites X30.',
      },
    ],
    steps: [
      {
        title: 'The first call creates foo’s return route',
        explanation: 'Calling foo puts the caller’s continuation address in X30.',
        example: 'bl foo',
      },
      {
        title: 'Foo saves its incoming route',
        explanation: 'Before calling bar, foo stores the incoming X30 in its stack frame because it is still live.',
      },
      {
        title: 'The second call creates bar’s route',
        explanation: 'Calling bar overwrites X30 with the address where foo should resume.',
        example: 'bl bar',
      },
      {
        title: 'Unwind in reverse order',
        explanation: 'Bar returns to foo. Foo restores its older X30 from memory, removes its frame, and returns to its own caller.',
      },
      {
        title: 'Treat the visual call stack as an explanation',
        explanation: 'The simulator draws a call-stack tree for learning. Real AArch64 has registers and memory, not a hidden hardware list of function names.',
      },
    ],
    remember: 'Each active call needs its own return route; nested functions preserve older routes and unwind last-called first.',
  },
  'data-sections-strings': {
    lessonId: 'data-sections-strings',
    order: 27,
    title: 'Separate Executable Code from Stored Data',
    purpose: 'Assembly source contains more than instructions. Directives tell build tools how names and bytes should be organized in the program image.',
    terms: [
      {
        term: 'Assembler',
        meaning: 'A build tool that translates assembly source into encoded machine code and object-file data.',
      },
      {
        term: 'Linker',
        meaning: 'A build tool that combines code and data, resolves symbol references, and produces an executable or shared library.',
      },
      {
        term: 'Loader',
        meaning: 'Operating-system machinery that maps an executable and its libraries into a process so they can run.',
      },
      {
        term: 'Assembler directive',
        meaning: 'A command for the tool that builds the program. A directive describes layout or metadata; the processor does not execute it as an instruction.',
      },
      {
        term: '.text section',
        meaning: 'The section normally used for executable machine instructions.',
      },
      {
        term: '.data section',
        meaning: 'The section normally used for initialized writable data.',
      },
      {
        term: '.global or .globl',
        meaning: 'A directive that makes a symbol visible to the linker as a global symbol. It does not choose the processor’s next instruction.',
      },
      {
        term: 'ELF — Executable and Linkable Format',
        meaning: 'A common binary file format used by Linux and Android native executables and libraries.',
      },
    ],
    steps: [
      {
        title: 'Place initialized bytes in a data section',
        explanation: 'A data label can name bytes that the program will read or write.',
        example: '.section .data',
      },
      {
        title: 'Place instructions in a text section',
        explanation: 'The text section tells build tools that the following content is executable code.',
        example: '.section .text',
      },
      {
        title: 'Expose a conventional start label',
        explanation: 'A label such as _start names a code address. .globl makes that symbol visible to the linker; it does not by itself choose a real ELF entry point. A64 Lab starts at _start when that label is present.',
        example: '.globl _start\n_start:',
      },
      {
        title: 'Separate the teaching model from a real process',
        explanation: 'This simulator uses one fake code region and one fake data region. A real Android ELF image has more sections and mapped segments with permissions chosen by build tools and the loader.',
      },
    ],
    remember: 'Dots usually introduce build-tool directives; labels name locations; only actual instructions execute on the processor.',
  },
  'string-data': {
    lessonId: 'string-data',
    order: 28,
    title: 'See a String as Bytes in Memory',
    purpose: 'The processor does not store a special “string object” for assembly code. It sees bytes, while the program gives those bytes meaning and length.',
    terms: [
      {
        term: 'Byte',
        meaning: 'Eight bits of storage. Each memory address identifies one byte.',
      },
      {
        term: 'ASCII — American Standard Code for Information Interchange',
        meaning: 'A character encoding in which common characters have numeric byte values, such as hexadecimal 0x41 (decimal 65) for uppercase A.',
      },
      {
        term: '.ascii',
        meaning: 'An assembler directive that emits the encoded bytes for the written characters without automatically appending a zero byte.',
      },
      {
        term: '.asciz',
        meaning: 'An assembler directive that emits the character bytes and appends one zero byte.',
      },
      {
        term: 'NUL terminator',
        meaning: 'A byte whose value is zero, used by C-style string functions to mark the end of a string. It is different from a null pointer.',
      },
    ],
    steps: [
      {
        title: 'Encode each character',
        explanation: 'A text character becomes one or more numeric bytes according to an encoding. The basic ASCII characters in this lesson each use one byte.',
      },
      {
        title: 'Lay the bytes next to one another',
        explanation: 'The label names the address of the first byte. Following addresses contain the following bytes.',
        example: 'message:\n    .asciz "hello"',
      },
      {
        title: 'Choose whether a terminator is needed',
        explanation: '.asciz adds a trailing zero byte; .ascii does not. The bytes are otherwise ordinary memory.',
      },
      {
        title: 'Keep length separate from termination',
        explanation: 'Some interfaces use a NUL terminator. Linux write instead receives an explicit byte count and does not stop automatically at a zero byte.',
      },
    ],
    remember: 'A string in memory is encoded bytes plus whatever length rule the receiving code expects.',
  },
  'loading-addresses': {
    lessonId: 'loading-addresses',
    order: 29,
    title: 'Turn a Data Label into a Pointer',
    purpose: 'Instructions that read memory need an address. A data label gives build tools a name that can be resolved into that address.',
    terms: [
      {
        term: 'Symbol or label',
        meaning: 'A name associated with a code or data location.',
      },
      {
        term: 'Pointer',
        meaning: 'A value being used as a memory address.',
      },
      {
        term: 'Pseudo-instruction',
        meaning: 'Convenient assembly notation that an assembler may replace with one or more real encoded instructions.',
      },
      {
        term: 'LDR equals-label form',
        meaning: 'In notation such as LDR X1, =message, the goal is to place message’s address in X1, not to load the bytes stored at message into X1.',
      },
    ],
    steps: [
      {
        title: 'Define and name the data',
        explanation: 'The label marks the first byte of the data.',
        example: 'message:\n    .asciz "hello"',
      },
      {
        title: 'Load the label’s address',
        explanation: 'The equals-label pseudo-instruction makes X1 a pointer to the first byte.',
        example: 'ldr x1, =message',
      },
      {
        title: 'Distinguish address from contents',
        explanation: 'After the pseudo-load, X1 contains an address. A bracketed load would follow that address and read memory contents.',
      },
      {
        title: 'Know what the simulator simplifies',
        explanation: 'The simulator resolves labels directly and uses a stable fake data address. Real build tools may need extra instructions and may adjust the address when the program is loaded.',
      },
    ],
    remember: 'LDR X1, =label gives X1 the label’s address; LDR X1, [X2] reads bytes from the address in X2.',
  },
  'syscall-gate': {
    lessonId: 'syscall-gate',
    order: 30,
    title: 'Request a Linux Service with SVC',
    purpose: 'Application code cannot directly perform every privileged operation. A system call is the controlled request path into the operating-system kernel.',
    terms: [
      {
        term: 'Operating-system kernel',
        meaning: 'Privileged software that manages processes, memory, devices, files, and other protected resources.',
      },
      {
        term: 'System call or syscall',
        meaning: 'A request from a user program for a service implemented by the kernel.',
      },
      {
        term: 'Syscall number',
        meaning: 'The number that selects a kernel service. For a raw Linux AArch64 syscall, code places it in X8; outside that request setup, X8 is an ordinary general-purpose register.',
      },
      {
        term: 'SVC — Supervisor Call',
        meaning: 'An instruction that causes a controlled processor event and enters the operating system’s privileged handler for the prepared request. The usual Linux AArch64 form is SVC 0.',
      },
      {
        term: 'Exit status',
        meaning: 'A small integer a process reports when it finishes. Zero conventionally indicates success.',
      },
    ],
    steps: [
      {
        title: 'Choose the Linux AArch64 service',
        explanation: 'The exit syscall has number 93, so place 93 in X8.',
        example: 'mov x8, 93',
      },
      {
        title: 'Prepare its arguments',
        explanation: 'For exit, X0 contains the exit status. Register setup alone does not contact the kernel.',
        example: 'mov x0, 0',
      },
      {
        title: 'Trigger the request',
        explanation: 'SVC 0 transfers control through the system-call mechanism. The zero after SVC is not the Linux syscall number; X8 selects the service.',
        example: 'svc 0',
      },
      {
        title: 'Understand the teaching boundary',
        explanation: 'This simulator recognizes only write number 64 and exit number 93. It updates fake state and never makes a real syscall on the host. On real Linux, syscall 93 exits the calling thread; that ends this single-thread example, while exit_group number 94 ends every thread in a process. Android native programs often call library wrappers instead of using SVC directly.',
      },
    ],
    remember: 'Prepare the syscall number in X8 and its arguments first; SVC 0 is the instruction that submits the request.',
  },
  'linux-syscalls': {
    lessonId: 'linux-syscalls',
    order: 31,
    title: 'Write Bytes with the Linux write Syscall',
    purpose: 'To display text, a native program can ask Linux to copy a chosen number of bytes from its memory to an open output destination.',
    terms: [
      {
        term: 'File descriptor',
        meaning: 'A small process-local integer that identifies an open input or output resource. Descriptor 1 conventionally means standard output.',
      },
      {
        term: 'Buffer',
        meaning: 'A region of memory containing the bytes that an operation should read or write.',
      },
      {
        term: 'write syscall',
        meaning: 'The Linux service that attempts to write a requested byte count from a buffer to a file descriptor. Its AArch64 syscall number is 64.',
      },
      {
        term: 'Byte count',
        meaning: 'The number of bytes requested. write uses this count; it does not search for a NUL string terminator.',
      },
    ],
    steps: [
      {
        title: 'Prepare the destination in X0',
        explanation: 'Use file descriptor 1 for standard output in this example.',
        example: 'mov x0, 1',
      },
      {
        title: 'Prepare the buffer pointer in X1',
        explanation: 'X1 must contain the address of the first byte to write.',
        example: 'ldr x1, =message',
      },
      {
        title: 'Prepare the byte count in X2',
        explanation: 'Set the maximum number of bytes requested from this buffer. A trailing zero from .asciz is usually not included for visible text.',
        example: 'mov x2, 6',
      },
      {
        title: 'Select and request write',
        explanation: 'Put 64 in X8 and execute SVC 0. After a raw real-Linux call, X0 contains either the number of bytes written or a negative error code, and a short write is possible.',
        example: 'mov x8, 64\nsvc 0',
      },
      {
        title: 'Understand the simulator result',
        explanation: 'The simulator appends bytes to its fake terminal for descriptor 1 or 2 and assumes success. It does not model host files, permissions, errors, partial writes, or the real return value in X0.',
      },
    ],
    remember: 'Linux AArch64 write uses X0 = descriptor, X1 = buffer address, X2 = byte count, X8 = 64, then SVC 0.',
  },
  'reading-disassembly': {
    lessonId: 'reading-disassembly',
    order: 32,
    title: 'Read Disassembly as Small Patterns',
    purpose: 'A disassembly can look dense when read as one wall of instructions. Grouping control flow, setup, useful work, and cleanup turns it into a short behavior story.',
    terms: [
      {
        term: 'Machine code',
        meaning: 'The encoded instruction bytes that the processor executes.',
      },
      {
        term: 'Disassembler',
        meaning: 'A tool that translates machine-code bytes into assembly instruction text.',
      },
      {
        term: 'Disassembly',
        meaning: 'The assembly-like listing produced by a disassembler. Helpful names and original source details may be missing.',
      },
      {
        term: 'Mnemonic',
        meaning: 'The short instruction name, such as MOV, LDR, BL, or RET.',
      },
      {
        term: 'Operand',
        meaning: 'A register, immediate value, memory form, or target used by an instruction.',
      },
    ],
    steps: [
      {
        title: 'Mark control-flow boundaries',
        explanation: 'Find calls, branches, return instructions, and their possible destinations before tracing every value.',
      },
      {
        title: 'Recognize setup and cleanup',
        explanation: 'Look for saved frame or return state near entry and matching restoration near exit. These are common patterns, not proof of a function’s purpose.',
      },
      {
        title: 'Trace arguments and results',
        explanation: 'At call boundaries, inspect likely input registers. Follow each write until the value is used or replaced, and note the final result register.',
      },
      {
        title: 'Calculate memory addresses',
        explanation: 'For every load or store, compute the base plus offset and record the transfer direction.',
      },
      {
        title: 'Summarize only supported behavior',
        explanation: 'State what values and control flow prove. The simulator shows clean source with labels; real disassembly may show raw addresses, encoded bytes, generated names, and no original comments.',
      },
    ],
    remember: 'Read unfamiliar code as control flow, inputs, state changes, memory accesses, cleanup, and output—not as isolated mnemonics.',
  },
  'c-to-arm64': {
    lessonId: 'c-to-arm64',
    order: 33,
    title: 'Connect C-Like Ideas to Register Flow',
    purpose: 'Source code names values by purpose, while machine code moves values through registers and memory. Following data flow lets you form a careful source-level hypothesis.',
    terms: [
      {
        term: 'C source code',
        meaning: 'Human-written code in the C programming language, with functions, variables, and types.',
      },
      {
        term: 'Compiler',
        meaning: 'A tool that translates source code into machine code and may reorganize or remove operations while preserving required behavior.',
      },
      {
        term: 'Data flow',
        meaning: 'The path a value follows as instructions read, transform, copy, store, and replace it.',
      },
      {
        term: 'W register',
        meaning: 'A 32-bit view of an X register. Android’s common 64-bit data model uses a 32-bit C int, so simple int examples commonly use W0, W1, and related W registers.',
      },
    ],
    steps: [
      {
        title: 'Write the smallest source-level question',
        explanation: 'For example: does this function accept two 32-bit integers and return their sum?',
      },
      {
        title: 'Map likely inputs at the call boundary',
        explanation: 'In the simple example, W0 carries the first int and W1 carries the second.',
      },
      {
        title: 'Follow the transformation',
        explanation: 'The ADD reads both values and replaces W0 with their 32-bit sum.',
        example: 'add w0, w0, w1',
      },
      {
        title: 'Confirm the output path',
        explanation: 'The function returns with the result already in W0. The caller may then copy it to another register.',
      },
      {
        title: 'Keep the reconstruction tentative',
        explanation: 'Optimization can produce many instruction sequences for the same behavior. Register width and data flow do not recover original variable names or prove the exact source spelling.',
      },
    ],
    remember: 'Describe the value flow you can prove first; treat reconstructed C as a useful hypothesis, not recovered source.',
  },
  'debugging-state': {
    lessonId: 'debugging-state',
    order: 34,
    title: 'Read One Paused Debugger State',
    purpose: 'A debugger snapshot contains many numbers but little explanation. A repeatable inspection order helps turn those numbers into evidence about control flow and data flow.',
    terms: [
      {
        term: 'Debugger',
        meaning: 'A tool that can pause a program and inspect or change its execution state.',
      },
      {
        term: 'Snapshot',
        meaning: 'The registers, flags, and relevant memory visible at one paused moment.',
      },
      {
        term: 'Hexadecimal',
        meaning: 'Base-16 number notation, usually written with a 0x prefix. Two hexadecimal digits represent one byte.',
      },
      {
        term: 'Recognizable pattern',
        meaning: 'A deliberately noticeable byte value used to trace where data travels. For example, repeated hexadecimal 41 bytes represent uppercase A in the American Standard Code for Information Interchange, shortened to ASCII.',
      },
    ],
    steps: [
      {
        title: 'Start with the current instruction',
        explanation: 'Read the program counter and the instruction at that address. State what will change if it executes.',
      },
      {
        title: 'Inspect the return and stack state',
        explanation: 'Check X30 as a possible return address, SP as the stack boundary, and X29 as a possible frame pointer. Nearby code decides whether those roles apply.',
      },
      {
        title: 'Inspect likely inputs and pointers',
        explanation: 'At a call boundary, X0 through X7 may contain arguments. A number is a pointer only when code uses it as an address.',
      },
      {
        title: 'Trace unusual values backward',
        explanation: 'A repeated pattern in X30 or the program counter is unusual, but it does not identify a vulnerability by itself. Find the instruction or memory read that supplied it and determine whether external input could influence it.',
      },
      {
        title: 'Account for simulator shorthand',
        explanation: 'The simulator can place any 64-bit constant with one MOV teaching step. Real AArch64 code may need several instructions or a memory load for the same constant.',
      },
    ],
    remember: 'A suspicious value is a clue: connect it to the current instruction, its origin, and its later use before drawing a security conclusion.',
  },
  'indirect-control-flow': {
    lessonId: 'indirect-control-flow',
    order: 35,
    title: 'Jump or Call Through a Register',
    purpose: 'Sometimes code chooses a destination while it is running. Indirect control flow stores that destination address in a register and branches through the register.',
    terms: [
      {
        term: 'Code pointer',
        meaning: 'An address value intended to identify executable code.',
      },
      {
        term: 'Direct branch',
        meaning: 'A branch whose instruction names its destination, such as B label or BL function.',
      },
      {
        term: 'Indirect branch',
        meaning: 'A branch whose destination is read from a register at runtime.',
      },
      {
        term: 'BR — Branch to register',
        meaning: 'BR jumps to the code address in a register and does not create a new return address.',
      },
      {
        term: 'BLR — Branch with link to register',
        meaning: 'BLR writes the following instruction address into X30, then jumps to the code address in a register.',
      },
      {
        term: 'RET — Register-targeted return',
        meaning: 'Plain RET is also indirect control flow: it reads its destination from X30 rather than naming a fixed label.',
      },
    ],
    steps: [
      {
        title: 'Find where the target value comes from',
        explanation: 'A register must receive a code address before BR or BLR can use it. Trace every write to that register.',
        example: 'ldr x8, =worker',
      },
      {
        title: 'Choose jump or call behavior',
        explanation: 'BR changes only the control-flow destination. BLR also creates a return address in X30.',
        example: 'blr x8',
      },
      {
        title: 'Follow the chosen target',
        explanation: 'The program counter becomes the register’s address. A later RET can use the link made by BLR; BR made no new link.',
      },
      {
        title: 'Ask a security question carefully',
        explanation: 'Callbacks and function pointers make indirect calls normal. The important question is whether untrusted input can incorrectly influence the target. This simulator omits real memory permissions and hardware or compiler control-flow protections.',
      },
    ],
    remember: 'BR and BLR use an explicit target register; plain RET is another indirect transfer and normally uses X30.',
  },
  'native-code-patterns': {
    lessonId: 'native-code-patterns',
    order: 36,
    title: 'Use One Workflow for Unfamiliar Native Code',
    purpose: 'You do not need to understand a whole function at once. A fixed sequence of small questions turns registers, memory, branches, calls, and stack work into a defensible behavior summary.',
    terms: [
      {
        term: 'Native code',
        meaning: 'Machine code compiled for the device’s processor, such as AArch64 instructions in an Android process.',
      },
      {
        term: 'Pattern',
        meaning: 'A familiar group of instructions that suggests a role, such as saving a return address or choosing a branch. A pattern is evidence, not certainty by itself.',
      },
      {
        term: 'State change',
        meaning: 'A change to a register, flag, memory byte, output, or next instruction address.',
      },
      {
        term: 'Input influence',
        meaning: 'The degree to which data supplied outside the trusted code can affect a value, address, length, branch, or memory operation.',
      },
    ],
    steps: [
      {
        title: 'Mark the control-flow shape',
        explanation: 'Find function entries, calls, conditional and unconditional branches, indirect destinations, and returns.',
      },
      {
        title: 'Identify likely inputs and output',
        explanation: 'Use the calling convention at call boundaries, then verify each register role from actual reads and writes.',
      },
      {
        title: 'Trace every meaningful state change',
        explanation: 'For each instruction, record which register, flag, memory location, output, or next address changes. Do not assign work to an instruction that it did not perform.',
      },
      {
        title: 'Pair setup with cleanup',
        explanation: 'Match stack reservation with release, saved registers with loads, and each call route with the return that consumes it.',
      },
      {
        title: 'Explore both branch paths',
        explanation: 'Write the flag condition in words and determine what each possible path changes.',
      },
      {
        title: 'Make a narrow security assessment',
        explanation: 'Ask whether untrusted input influences a memory address, byte count, write, return address, or indirect target. Do not claim a vulnerability until the instruction and data-flow evidence support it.',
      },
      {
        title: 'Write the smallest accurate summary',
        explanation: 'Describe observed inputs, transformations, side effects, and result. Clearly mark anything inferred rather than directly shown.',
      },
    ],
    remember: 'When native code feels dense, return to one question: what state does this instruction actually change?',
  },
} as const satisfies Record<BeginnerGuideLessonId, BeginnerGuide>;

export function getBeginnerGuide(id: string): BeginnerGuide | undefined {
  return Object.prototype.hasOwnProperty.call(BEGINNER_GUIDES, id)
    ? BEGINNER_GUIDES[id as BeginnerGuideLessonId]
    : undefined;
}
