import type { Challenge, ChallengeCategory } from './types';

export const CHALLENGE_CATEGORIES = [
  'Registers',
  'Arithmetic',
  'Memory',
  'Stack',
  'Branches',
  'Functions',
  'Mixed',
] as const satisfies readonly ChallengeCategory[];

export const CHALLENGES: Challenge[] = [
  {
    id: 'register-copy',
    title: 'Follow a register copy',
    category: 'Registers',
    type: 'choice',
    description: 'Predict the value copied into X2.',
    code: `mov x0, 10
mov x1, 20
mov x2, x0`,
    options: [
      { id: 'zero', label: '0' },
      { id: 'ten', label: '10' },
      { id: 'twenty', label: '20' },
      { id: 'thirty', label: '30' },
    ],
    correctOptionId: 'ten',
    explanation: 'MOV copies X0 into X2, so X2 contains 10.',
  },
  {
    id: 'make-x2-thirty',
    title: 'Make X2 equal 30',
    category: 'Arithmetic',
    type: 'code',
    description: 'Use the two prepared argument registers in one addition.',
    prompt: 'X0 is 10 and X1 is 20. Write one instruction that makes X2 equal 30.',
    setupProgram: `mov x0, 10
mov x1, 20`,
    starterCode: '',
    solution: 'add x2, x0, x1',
    target: { kind: 'register', register: 'x2', value: 30n },
    maxLearnerInstructions: 1,
    explanation: 'ADD reads X0 and X1, adds them, and writes the result to X2.',
  },
  {
    id: 'restore-stored-value',
    title: 'Fill in the missing load',
    category: 'Memory',
    type: 'code',
    description: 'Recover a value that has already been stored on the stack.',
    prompt: 'The setup stores 42 at [SP]. Write the missing instruction that loads it into X1.',
    setupProgram: `mov x0, 42
sub sp, sp, #16
str x0, [sp]`,
    starterCode: '',
    solution: 'ldr x1, [sp]',
    target: { kind: 'register', register: 'x1', value: 42n },
    maxLearnerInstructions: 1,
    explanation: 'LDR dereferences SP and copies the 8-byte value from memory into X1.',
  },
  {
    id: 'track-the-stack-pointer',
    title: 'Track the final SP',
    category: 'Stack',
    type: 'choice',
    description: 'Follow stack allocation and restoration across three instructions.',
    code: `sub sp, sp, #16
sub sp, sp, #32
add sp, sp, #16`,
    options: [
      { id: 'unchanged', label: '0x00007FFFFFFFE000' },
      { id: 'minus-16', label: '0x00007FFFFFFFDFF0' },
      { id: 'minus-32', label: '0x00007FFFFFFFDFE0' },
      { id: 'minus-48', label: '0x00007FFFFFFFDFD0' },
    ],
    correctOptionId: 'minus-32',
    explanation: 'The program subtracts 48 bytes and restores 16, leaving SP 32 bytes below its initial value.',
  },
  {
    id: 'choose-the-branch-path',
    title: 'Which branch executes?',
    category: 'Branches',
    type: 'choice',
    description: 'Use the Z flag to predict a conditional branch.',
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
      { id: 'fall-through', label: 'Fall through; X3 becomes 0' },
      { id: 'notequal', label: 'Branch to notequal; X3 becomes 1' },
      { id: 'end-directly', label: 'Branch directly to end' },
      { id: 'halt', label: 'Execution stops at CMP' },
    ],
    correctOptionId: 'notequal',
    explanation: '5 and 7 are different, so CMP clears Z and B.NE branches to notequal.',
  },
  {
    id: 'find-the-ret-target',
    title: 'Where does RET go?',
    category: 'Functions',
    type: 'choice',
    description: 'Identify the return target saved by BL in X30/LR.',
    code: `_start:
mov x0, 5
bl addten
mov x1, x0
b end

addten:
add x0, x0, #10
ret

end:
mov x2, x1`,
    options: [
      { id: 'start', label: 'mov x0, 5' },
      { id: 'after-bl', label: 'mov x1, x0' },
      { id: 'function-start', label: 'add x0, x0, #10' },
      { id: 'end', label: 'mov x2, x1' },
    ],
    correctOptionId: 'after-bl',
    explanation: 'BL stores the address of the next instruction in X30, and RET returns to that address.',
  },
  {
    id: 'combine-registers-in-five',
    title: 'Build a result in 3–5 instructions',
    category: 'Mixed',
    type: 'code',
    description: 'Combine register arithmetic across a short instruction sequence.',
    prompt: 'X0 is 6 and X1 is 4. Using ADD and SUB (not a direct MOV), make X3 equal 12 in 3–5 instructions.',
    setupProgram: `mov x0, 6
mov x1, 4`,
    starterCode: '',
    solution: `add x2, x0, x1
add x2, x2, x1
sub x3, x2, #2`,
    target: { kind: 'register', register: 'x3', value: 12n },
    minLearnerInstructions: 3,
    maxLearnerInstructions: 5,
    forbiddenOpcodes: ['mov'],
    explanation: 'One route builds 10, then 14, then subtracts 2 to place 12 in X3.',
  },
  {
    id: 'w-register-write',
    title: 'Notice W-register zero-extension',
    category: 'Registers',
    type: 'choice',
    description: 'Predict how writing W0 changes its associated X register.',
    code: `mov x0, 0xffffffffffffffff
mov w0, 1`,
    options: [
      { id: 'one', label: '0x0000000000000001' },
      { id: 'upper-kept', label: '0xFFFFFFFF00000001' },
      { id: 'all-ones', label: '0xFFFFFFFFFFFFFFFF' },
      { id: 'zero', label: '0x0000000000000000' },
    ],
    correctOptionId: 'one',
    explanation: 'Writing W0 updates the lower 32 bits and zeroes the upper 32 bits of X0.',
  },
  {
    id: 'save-and-restore-lr',
    title: 'Save LR across a nested call',
    category: 'Functions',
    type: 'choice',
    description: 'Recognize the instruction that preserves a caller return address.',
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
    options: [
      { id: 'save-pair', label: 'stp x29, x30, [sp, #-16]!' },
      { id: 'frame-pointer', label: 'mov x29, sp' },
      { id: 'call-bar', label: 'bl bar' },
      { id: 'return', label: 'ret' },
    ],
    correctOptionId: 'save-pair',
    explanation: 'STP saves X30 before BL bar overwrites it with a new return address.',
  },
];

export function getChallenge(id: string): Challenge | undefined {
  return CHALLENGES.find((challenge) => challenge.id === id);
}
