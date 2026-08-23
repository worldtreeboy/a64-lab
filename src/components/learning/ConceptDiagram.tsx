import type { DiagramKind } from '../../learning/types';

const DIAGRAMS: Record<DiagramKind, { label: string; nodes: string[]; note: string }> = {
  'mental-model': {
    label: 'Instruction execution flow',
    nodes: ['PC', 'instruction', 'registers + memory', 'next PC'],
    note: 'The PC selects an instruction; execution changes state and advances or branches.',
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
  pointer: {
    label: 'Pointer to data memory',
    nodes: ['X1 = 0x400000', '.data:message', '"android"'],
    note: 'The register holds an address, not the string itself.',
  },
  'load-store': {
    label: 'Load and store directions',
    nodes: ['X0 = 42', 'STR → [SP]', 'LDR → X1 = 42'],
    note: 'STR moves data to memory. LDR moves data from memory.',
  },
  'little-endian': {
    label: 'Little-endian byte order',
    nodes: ['0x1122334455667788', '88 77 66 55 44 33 22 11', 'low → high address'],
    note: 'The least-significant byte is stored at the lowest address.',
  },
  'stack-growth': {
    label: 'Stack growth',
    nodes: ['SP = …E000', 'SUB SP, SP, #16', 'SP = …DFF0'],
    note: 'Allocating stack space moves SP toward lower addresses.',
  },
  'stack-frame': {
    label: 'Saved frame pointer and link register',
    nodes: ['higher addresses', 'saved X30 / LR', 'saved X29 / FP ← SP', 'lower addresses'],
    note: 'A paired store preserves FP and LR in one 16-byte frame.',
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
  'function-call': {
    label: 'Direct function call',
    nodes: ['caller', 'BL foo · LR = return', 'foo', 'RET · PC = LR', 'caller'],
    note: 'BL records where RET should continue.',
  },
  'nested-calls': {
    label: 'Nested function calls',
    nodes: ['_start → foo', 'save foo LR', 'foo → bar', 'restore foo LR', 'foo → _start'],
    note: 'foo saves LR because BL bar overwrites X30.',
  },
  'data-bytes': {
    label: 'String in data memory',
    nodes: ['"ARM64\\n"', '41 52 4D 36 34 0A', '00'],
    note: '.asciz appends the final NULL byte; .ascii does not.',
  },
  syscall: {
    label: 'Linux AArch64 syscall',
    nodes: ['X0–X5 arguments', 'X8 syscall number', 'SVC 0', 'kernel service'],
    note: 'These numbers are Linux AArch64 specific.',
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

function StackGrowthDiagram() {
  const rows = [
    ['0x…E010', 'empty', ''],
    ['0x…E008', 'empty', ''],
    ['0x…E000', 'old top', 'old SP'],
    ['0x…DFF8', 'empty', ''],
    ['0x…DFF0', 'new top', 'SP'],
  ];
  return (
    <div className="stack-concept-scene" aria-hidden="true">
      <div className="stack-address-direction"><span>Higher addresses</span><strong>↑</strong></div>
      <div className="stack-concept-rows">
        {rows.map(([address, value, marker]) => (
          <div className={`stack-concept-row ${marker === 'SP' ? 'stack-new-sp' : ''}`} key={address}>
            <code>{address}</code><span>{value}</span><strong>{marker}</strong>
          </div>
        ))}
      </div>
      <div className="stack-move-label"><code>SUB SP, SP, #16</code><span>SP moves down 16 bytes ↓</span></div>
      <div className="stack-address-direction"><strong>↓</strong><span>Lower addresses</span></div>
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
  const diagram = DIAGRAMS[kind];
  const specialized = kind === 'pointer'
    ? <PointerDiagram />
    : kind === 'stack-growth'
      ? <StackGrowthDiagram />
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
