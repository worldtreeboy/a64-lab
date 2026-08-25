import type { DiagramKind } from '../../learning/types';
import {
  AdvancedConceptScene,
  type AdvancedConceptKind,
} from './AdvancedConceptScenes';
import {
  ControlConceptScene,
  type ControlConceptSceneKind,
} from './ControlConceptScenes';
import {
  FoundationConceptScene,
  type FoundationConceptKind,
} from './FoundationConceptScenes';

const FOUNDATION_SCENE_BY_KIND: Partial<Record<DiagramKind, FoundationConceptKind>> = {
  'mental-model': 'cpu-state',
  arithmetic: 'arithmetic-flow',
  'address-number': 'address-pointer',
  'load-store': 'memory-offset',
  'stack-growth': 'stack-growth-four-stages',
  'stack-value': 'stack-value-five-steps',
};

const CONTROL_SCENE_BY_KIND: Partial<Record<DiagramKind, ControlConceptSceneKind>> = {
  'cmp-zero': 'cmp-zero',
  'signed-flags': 'signed-flags',
  'ordered-branch': 'ordered-branch',
  'bl-only': 'bl-only',
  'return-flow': 'return-flow',
  'function-arguments': 'function-arguments',
  'function-result': 'function-result',
  'save-lr-cycle': 'save-lr-cycle',
  'pair-transfer': 'pair-transfer',
  'stack-frame-flow': 'stack-frame-flow',
  'nested-return-addresses': 'nested-return-addresses',
};

const ADVANCED_SCENE_BY_KIND: Partial<Record<DiagramKind, AdvancedConceptKind>> = {
  'code-data-sections': 'code-data-sections',
  'string-bytes': 'string-bytes',
  'label-address': 'label-address',
  'syscall-boundary': 'syscall-boundary',
  'write-bytes': 'write-bytes',
  'disassembly-anatomy': 'disassembly-anatomy',
  'c-mapping': 'c-mapping',
  'debug-snapshot': 'debug-snapshot',
  'indirect-control': 'indirect-control',
  'native-workflow': 'native-workflow',

  // Keep existing lessons compatible while their public diagram names remain stable.
  'code-sections': 'code-data-sections',
  'data-bytes': 'string-bytes',
  pointer: 'label-address',
  'syscall-gate': 'syscall-boundary',
  syscall: 'write-bytes',
  disassembly: 'disassembly-anatomy',
  'debug-state': 'debug-snapshot',
  'indirect-call': 'indirect-control',
};

const DIAGRAMS: Partial<Record<DiagramKind, { label: string; nodes: string[]; note: string }>> = {
  'mental-model': {
    label: 'Instruction execution flow',
    nodes: ['PC', 'instruction', 'registers + memory', 'next PC'],
    note: 'The PC selects an instruction; execution changes state and advances or branches.',
  },
  'general-registers': {
    label: 'General register values',
    nodes: ['X0 = 10', 'MOV X2, X0', 'X2 = 10'],
    note: 'Registers are named CPU storage. Copying a value leaves the source unchanged.',
  },
  'register-map': {
    label: 'X and W register relationship',
    nodes: ['X0 · 64 bits', 'lower 32 bits', 'W0 · 32 bits'],
    note: 'Writing W0 zero-extends into X0.',
  },
  arithmetic: {
    label: 'ARM64 addition data flow',
    nodes: ['X0 = 10', 'X1 = 20', 'ADD', 'X2 = 30'],
    note: 'ADD reads both sources and writes their sum to the destination.',
  },
  'address-number': {
    label: 'A register value interpreted as a memory address',
    nodes: ['X1', '0x00400000', 'memory at 0x00400000'],
    note: 'A pointer is a number that code interprets as an address.',
  },
  pointer: {
    label: 'Pointer to data memory',
    nodes: ['X1 = 0x400000', '.data:message', '"android"'],
    note: 'The register holds an address, not the string itself.',
  },
  'memory-store': {
    label: 'Store a register value into memory',
    nodes: ['X0 = 42', 'STR X0, [X1]', 'memory[X1] = 42'],
    note: 'STR copies a register value to memory. The source register and pointer stay unchanged.',
  },
  'memory-load': {
    label: 'Load a memory value into a register',
    nodes: ['memory[X1] = 42', 'LDR X2, [X1]', 'X2 = 42'],
    note: 'LDR reads memory through the pointer and writes the value into its destination register.',
  },
  'load-store': {
    label: 'Load and store directions',
    nodes: ['X0 = 42', 'STR → [X1]', 'LDR → X2 = 42'],
    note: 'STR moves data to memory. LDR moves data from memory.',
  },
  'little-endian': {
    label: 'Little-endian byte order',
    nodes: ['0x1122334455667788', '88 77 66 55 44 33 22 11', 'low → high address'],
    note: 'The least-significant byte is stored at the lowest address.',
  },
  'stack-value': {
    label: 'One stack value followed through four instructions',
    nodes: ['SUB moves SP', 'STR writes 42', 'LDR copies 42', 'ADD moves SP'],
    note: 'Only STR writes memory. LDR leaves the memory value in place, and ADD changes only SP.',
  },
  'register-pair': {
    label: 'Two registers stored in neighboring stack slots',
    nodes: ['X29 and X30', 'STP [SP]', '[SP] and [SP + 8]', 'LDP [SP]', 'X29 and X30'],
    note: 'STP and LDP move two 64-bit registers between registers and neighboring memory slots.',
  },
  'stack-frame': {
    label: 'Saved frame pointer and link register',
    nodes: ['higher addresses', 'saved X30 / LR', 'saved X29 / FP ← SP', 'lower addresses'],
    note: 'A paired store preserves FP and LR in one 16-byte frame.',
  },
  'frame-pointer': {
    label: 'Frame pointer remains stable while SP moves',
    nodes: ['SP = frame', 'MOV X29, SP', 'SP moves', 'X29 = frame'],
    note: 'X29 can preserve a stable frame address while later instructions move SP.',
  },
  'zero-flag': {
    label: 'Equality comparison sets the zero flag',
    nodes: ['CMP 5, 5', '5 − 5 = 0', 'Z = 1'],
    note: 'CMP keeps the flags, not the numeric subtraction result.',
  },
  flags: {
    label: 'Comparison flags',
    nodes: ['CMP X0, X1', 'X0 − X1', 'NZCV'],
    note: 'CMP discards the subtraction result and keeps the flags.',
  },
  'control-flow': {
    label: 'Conditional branch flow',
    nodes: ['CMP', 'Z = 0', 'B.NE', 'notequal'],
    note: 'B.NE is taken when Z is clear.',
  },
  'unconditional-branch': {
    label: 'Unconditional branch changes the next PC',
    nodes: ['PC at B', 'B target', 'PC at target'],
    note: 'B always chooses its label, so the sequential instruction is skipped.',
  },
  'function-call': {
    label: 'Direct function call',
    nodes: ['caller', 'BL foo · LR = return', 'foo', 'RET · PC = LR', 'caller'],
    note: 'BL records where RET should continue.',
  },
  'lr-overwrite': {
    label: 'A nested BL overwrites the older return address',
    nodes: ['BL foo · X30 = return to _start', 'BL bar · X30 = return to foo', 'old X30 is lost'],
    note: 'foo must save its return address before it executes BL bar.',
  },
  'nested-calls': {
    label: 'Nested function calls',
    nodes: ['_start → foo', 'save foo LR', 'foo → bar', 'restore foo LR', 'foo → _start'],
    note: 'foo saves LR because BL bar overwrites X30.',
  },
  'indexed-addressing': {
    label: 'Pre-index and post-index update order',
    nodes: ['pre-index · update then access', 'memory operation', 'post-index · access then update'],
    note: 'The punctuation tells you whether the base register changes before or after memory is accessed.',
  },
  'data-bytes': {
    label: 'String in data memory',
    nodes: ['"ARM64\\n"', '41 52 4D 36 34 0A', '00'],
    note: '.asciz appends the final NUL byte; .ascii does not.',
  },
  'code-sections': {
    label: 'Code and data occupy separate sections',
    nodes: ['.data · stored bytes', 'label · named address', '.text · instructions'],
    note: 'Directives organize the program but do not execute or consume instruction addresses.',
  },
  syscall: {
    label: 'Linux AArch64 syscall',
    nodes: ['X0–X5 arguments', 'X8 syscall number', 'SVC 0', 'kernel service'],
    note: 'These numbers are Linux AArch64 specific.',
  },
  'syscall-gate': {
    label: 'SVC crosses from the program to a Linux service',
    nodes: ['prepare X0–X5', 'select service in X8', 'SVC 0', 'Linux handles request'],
    note: 'Preparing registers does nothing visible until SVC requests the selected Linux AArch64 service.',
  },
  disassembly: {
    label: 'Function pattern',
    nodes: ['prologue', 'loads + stores', 'calculation', 'epilogue', 'RET'],
    note: 'Compiler output varies, but these structural clues repeat.',
  },
  'c-mapping': {
    label: 'Conceptual C mapping',
    nodes: ['int add(a, b)', 'W0 + W1', 'W0 return value'],
    note: 'This is illustrative; exact compiler output is not guaranteed.',
  },
  'debug-state': {
    label: 'Register triage',
    nodes: ['PC', 'LR', 'SP', 'X0–X7', 'pointer / repeated bytes'],
    note: 'Start with control flow, stack position, arguments, and unusual patterns.',
  },
  'indirect-call': {
    label: 'Direct and indirect control flow',
    nodes: ['BL function', 'BLR X8', 'BR X8'],
    note: 'BL names a target; BLR and BR take their target from a register.',
  },
};

function PointerDiagram() {
  return (
    <div className="pointer-scene" aria-hidden="true">
      <div className="pointer-register"><strong>X1</strong><code>0x00400000</code><span>pointer</span></div>
      <svg viewBox="0 0 190 72" preserveAspectRatio="none">
        <path d="M4 15 C76 15 86 58 174 58" />
        <path d="m162 49 14 9-14 9" />
      </svg>
      <div className="pointer-memory"><code>0x00400000</code><strong>.data:message</strong><span>"android"</span></div>
    </div>
  );
}

function RegisterMapDiagram() {
  return (
    <div className="register-map-scene" aria-hidden="true">
      <div className="register-bit-labels"><span>bit 63</span><span>bit 32</span><span>bit 31</span><span>bit 0</span></div>
      <div className="register-x-row">
        <strong>X0 · 64 bits</strong>
        <span>upper 32 bits</span>
        <span className="register-w-half">W0 · lower 32 bits</span>
      </div>
      <div className="register-write-row">
        <code>MOV W0, 1</code>
        <span>clears upper 32 bits</span>
        <strong>X0 = 1</strong>
      </div>
    </div>
  );
}

function StackValueDiagram() {
  const steps = [
    ['1', 'SUB', 'SP: E000 → DFF0', 'Memory unchanged'],
    ['2', 'STR', 'X0 stays 42', '[DFF0] becomes 42'],
    ['3', 'LDR', 'X1 becomes 42', '[DFF0] stays 42'],
    ['4', 'ADD', 'SP: DFF0 → E000', 'Old 42 remains, but is reusable'],
  ];
  return (
    <div className="stack-value-scene" aria-hidden="true">
      <div className="stack-value-track">
        {steps.map(([number, opcode, registerEffect, memoryEffect], index) => (
          <div className="stack-value-group" key={opcode}>
            <article className={`stack-value-step stack-value-${opcode.toLowerCase()}`}>
              <header><span>{number}</span><strong>{opcode}</strong></header>
              <code>{registerEffect}</code>
              <p>{memoryEffect}</p>
            </article>
            {index < steps.length - 1 && <span className="stack-value-arrow">→</span>}
          </div>
        ))}
      </div>
      <div className="stack-value-summary">
        <strong>42 is copied, not moved</strong>
        <span>STR puts a copy in memory. LDR puts another copy in X1. ADD does not touch either copy.</span>
      </div>
    </div>
  );
}

function StackFrameDiagram() {
  return (
    <div className="frame-concept-scene" aria-hidden="true">
      <div className="frame-registers">
        <span><strong>X29 / FP</strong><code>0x1111</code></span>
        <span><strong>X30 / LR</strong><code>0x2222</code></span>
      </div>
      <div className="frame-arrows"><span>↓ store pair</span><span>↓</span></div>
      <div className="frame-stack">
        <div><code>SP + 8</code><strong>saved X30</strong><span>0x2222</span></div>
        <div className="frame-sp-row"><code>SP</code><strong>saved X29</strong><span>0x1111</span><em>← SP</em></div>
      </div>
    </div>
  );
}

function LinkRegisterOverwriteDiagram() {
  return (
    <div className="lr-overwrite-scene" aria-hidden="true">
      <div className="lr-overwrite-call">
        <span>First call</span>
        <code>_start: BL foo</code>
        <strong>X30 = return to _start</strong>
      </div>
      <span className="lr-overwrite-arrow">BL bar overwrites X30 →</span>
      <div className="lr-overwrite-call lr-overwrite-new">
        <span>Nested call</span>
        <code>foo: BL bar</code>
        <strong>X30 = return to foo</strong>
      </div>
      <div className="lr-overwrite-warning">The older return address must be saved before the second BL.</div>
    </div>
  );
}

function IndexedAddressingDiagram() {
  return (
    <div className="indexed-addressing-scene" aria-hidden="true">
      <div className="indexed-addressing-path indexed-pre">
        <span>Pre-index · before</span>
        <code>stp x29, x30, [sp, #-16]!</code>
        <ol>
          <li><strong>1</strong> SP = SP - 16</li>
          <li><strong>2</strong> Store X29 and X30</li>
        </ol>
      </div>
      <div className="indexed-addressing-path indexed-post">
        <span>Post-index · after</span>
        <code>ldp x29, x30, [sp], #16</code>
        <ol>
          <li><strong>1</strong> Load X29 and X30</li>
          <li><strong>2</strong> SP = SP + 16</li>
        </ol>
      </div>
    </div>
  );
}

function UnconditionalBranchDiagram() {
  return (
    <div className="branch-always-scene" aria-hidden="true">
      <div className="branch-path-origin">
        <span>CURRENT INSTRUCTION</span>
        <code>b end</code>
        <strong>B always chooses its label</strong>
      </div>
      <div className="branch-path-fork">
        <div className="branch-path-taken">
          <span>TAKEN</span>
          <strong>PC → end</strong>
          <code>end: mov x1, x0</code>
        </div>
        <div className="branch-path-skipped">
          <span>SKIPPED</span>
          <code>mov x0, 99</code>
          <small>This sequential instruction never executes.</small>
        </div>
      </div>
    </div>
  );
}

function ConditionalBranchDiagram() {
  return (
    <div className="branch-condition-scene" aria-hidden="true">
      <div className="branch-condition-rule">
        <strong>B.NE asks one question</strong>
        <code>Is Z = 0?</code>
      </div>
      <div className="branch-condition-cases">
        <div className="branch-condition-case branch-condition-taken">
          <span>THIS EXAMPLE</span>
          <code>Z = 0</code>
          <strong>YES → branch to notequal</strong>
          <small>PC receives the target address.</small>
        </div>
        <div className="branch-condition-case branch-condition-fallthrough">
          <span>OTHER POSSIBILITY</span>
          <code>Z = 1</code>
          <strong>NO → continue downward</strong>
          <small>PC selects the following instruction.</small>
        </div>
      </div>
      <p>CMP created Z. B.NE reads it; neither path changes the flag.</p>
    </div>
  );
}

function FramePointerDiagram() {
  return (
    <div className="frame-pointer-scene" aria-hidden="true">
      <div className="frame-pointer-phase">
        <span>After the first SUB · before MOV</span>
        <code>SP → 0x…DFE0</code>
        <strong>X29 has its older value</strong>
      </div>
      <span className="frame-pointer-arrow">→</span>
      <div className="frame-pointer-phase frame-pointer-anchor">
        <span>After MOV</span>
        <code>mov x29, sp</code>
        <strong>SP and X29 both point to 0x…DFE0</strong>
      </div>
      <span className="frame-pointer-arrow">→</span>
      <div className="frame-pointer-phase">
        <span>After a later SUB</span>
        <code>SP → 0x…DFD0</code>
        <strong>X29 stays → 0x…DFE0</strong>
      </div>
    </div>
  );
}

function EndianDiagram() {
  const bytes = ['88', '77', '66', '55', '44', '33', '22', '11'];
  return (
    <div className="endian-scene" aria-hidden="true">
      <div className="endian-register"><span>64-bit register</span><code>0x1122334455667788</code></div>
      <span className="endian-arrow">↓ stored to memory</span>
      <div className="endian-bytes">
        {bytes.map((byte, index) => (
          <div key={byte}><small>+{index}</small><code>{byte}</code></div>
        ))}
      </div>
      <div className="endian-addresses"><span>lower address</span><span>higher address</span></div>
    </div>
  );
}

export function ConceptDiagram({ kind }: { kind: DiagramKind }) {
  const foundationKind = FOUNDATION_SCENE_BY_KIND[kind];
  if (foundationKind) return <FoundationConceptScene kind={foundationKind} />;

  const controlKind = CONTROL_SCENE_BY_KIND[kind];
  if (controlKind) return <ControlConceptScene kind={controlKind} />;

  const advancedKind = ADVANCED_SCENE_BY_KIND[kind];
  if (advancedKind) return <AdvancedConceptScene kind={advancedKind} />;

  const diagram = DIAGRAMS[kind];
  if (!diagram) throw new Error(`No concept diagram registered for: ${kind}`);
  const specialized = kind === 'register-map'
    ? <RegisterMapDiagram />
    : kind === 'pointer'
      ? <PointerDiagram />
      : kind === 'stack-value'
        ? <StackValueDiagram />
      : kind === 'lr-overwrite'
        ? <LinkRegisterOverwriteDiagram />
        : kind === 'indexed-addressing'
          ? <IndexedAddressingDiagram />
          : kind === 'unconditional-branch'
            ? <UnconditionalBranchDiagram />
            : kind === 'control-flow'
              ? <ConditionalBranchDiagram />
          : kind === 'frame-pointer'
            ? <FramePointerDiagram />
      : kind === 'stack-frame'
        ? <StackFrameDiagram />
        : kind === 'little-endian'
          ? <EndianDiagram />
          : null;
  return (
    <figure className={`concept-diagram diagram-${kind}`} aria-label={diagram.label}>
      {specialized ?? (
        <div className="diagram-flow">
          {diagram.nodes.map((node, index) => (
            <div className="diagram-step" key={`${node}-${index}`}>
              <code>{node}</code>
              {index < diagram.nodes.length - 1 && <span aria-hidden="true">↓</span>}
            </div>
          ))}
        </div>
      )}
      <figcaption>{diagram.note}</figcaption>
    </figure>
  );
}
