import type { ReactNode } from 'react';
import '../../advanced-concept-scenes.css';

export type AdvancedConceptKind =
  | 'code-data-sections'
  | 'string-bytes'
  | 'label-address'
  | 'syscall-boundary'
  | 'write-bytes'
  | 'disassembly-anatomy'
  | 'c-mapping'
  | 'debug-snapshot'
  | 'indirect-control'
  | 'native-workflow';

interface SceneFrameProps {
  kind: AdvancedConceptKind;
  eyebrow: string;
  title: string;
  caption: string;
  children: ReactNode;
}

interface ByteCell {
  hex: string;
  character: string;
  offset: string;
  excluded?: boolean;
  sent?: boolean;
}

function SceneFrame({ kind, eyebrow, title, caption, children }: SceneFrameProps) {
  return (
    <figure className={`advanced-concept-scene acs-${kind}`} aria-label={`${title} visual diagram`}>
      <header className="acs-heading">
        <span>{eyebrow}</span>
        <strong>{title}</strong>
      </header>
      <div className="acs-canvas">{children}</div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function FlowArrow({ label }: { label?: string }) {
  return (
    <div className="acs-flow-arrow" aria-hidden="true">
      {label && <small>{label}</small>}
      <span>→</span>
    </div>
  );
}

function ByteStrip({ cells, label }: { cells: readonly ByteCell[]; label: string }) {
  return (
    <div className="acs-byte-strip" aria-label={label}>
      {cells.map((cell, index) => (
        <div
          className={`acs-byte-cell${cell.sent ? ' acs-byte-sent' : ''}${cell.excluded ? ' acs-byte-excluded' : ''}`}
          key={`${cell.offset}-${cell.hex}-${index}`}
        >
          <small>{cell.offset}</small>
          <code>{cell.hex}</code>
          <span>{cell.character}</span>
        </div>
      ))}
    </div>
  );
}

const RAW_ARM64_BYTES: readonly ByteCell[] = [
  { offset: '+0', hex: '41', character: 'A' },
  { offset: '+1', hex: '52', character: 'R' },
  { offset: '+2', hex: '4D', character: 'M' },
  { offset: '+3', hex: '36', character: '6' },
  { offset: '+4', hex: '34', character: '4' },
];

const HELLO_BYTES: readonly ByteCell[] = [
  { offset: '+0', hex: '68', character: 'h', sent: true },
  { offset: '+1', hex: '65', character: 'e', sent: true },
  { offset: '+2', hex: '6C', character: 'l', sent: true },
  { offset: '+3', hex: '6C', character: 'l', sent: true },
  { offset: '+4', hex: '6F', character: 'o', sent: true },
  { offset: '+5', hex: '0A', character: '\\n', sent: true },
  { offset: '+6', hex: '00', character: '\\0', excluded: true },
];

function CodeDataSectionsScene() {
  return (
    <SceneFrame
      kind="code-data-sections"
      eyebrow="PROGRAM MEMORY"
      title="Instructions and stored data have different jobs"
      caption="This is the exact Lesson 27 Lab layout: its .data region is empty and its one .text instruction begins at simulated address 0. Directives organize the source but never execute."
    >
      <div className="acs-section-source">
        <span>Source layout</span>
        <code>.section .data</code>
        <code>.section .text</code>
        <small>Directives guide assembly. They are not CPU instructions.</small>
      </div>
      <FlowArrow label="assembler places bytes" />
      <div className="acs-memory-regions">
        <section className="acs-memory-region acs-data-region">
          <header><strong>.data</strong><span>stored bytes</span></header>
          <div><code>0x00400000</code><span>—</span><em>empty in this example</em></div>
          <p>The next lesson adds actual character bytes here.</p>
        </section>
        <section className="acs-memory-region acs-text-region">
          <header><strong>.text</strong><span>instructions</span></header>
          <div className="acs-pc-instruction acs-pc-active"><b>PC →</b><code>0x00000000</code><span>mov x0, 1</span></div>
          <p>The Lab contains exactly one executable instruction here.</p>
        </section>
      </div>
    </SceneFrame>
  );
}

function StringBytesScene() {
  return (
    <SceneFrame
      kind="string-bytes"
      eyebrow="CHARACTER ENCODING"
      title="Text becomes an ordered sequence of bytes"
      caption="Each character occupies one byte in this example. .asciz adds one final zero byte; .ascii does not. Little-endian storage does not reverse a byte string."
    >
      <div className="acs-string-row">
        <header>
          <div><strong>raw</strong><code>.ascii "ARM64"</code></div>
          <span>0x00400000</span>
        </header>
        <ByteStrip cells={RAW_ARM64_BYTES} label="raw contains ASCII bytes 41 52 4D 36 34" />
        <p>Only the five character bytes are stored.</p>
      </div>
      <div className="acs-string-row acs-string-row-terminated">
        <header>
          <div><strong>message</strong><code>{'.asciz "hello\\n"'}</code></div>
          <span>0x00400005</span>
        </header>
        <ByteStrip cells={HELLO_BYTES} label="message contains hello, newline, and a final zero byte" />
        <p>The separate <code>00</code> cell is the NUL terminator added by <code>.asciz</code>.</p>
      </div>
    </SceneFrame>
  );
}

function LabelAddressScene() {
  return (
    <SceneFrame
      kind="label-address"
      eyebrow="ADDRESS OR CONTENTS?"
      title="A label names where bytes begin"
      caption="The =label form obtains an address. Square brackets dereference a pointer and read the memory located at that address."
    >
      <div className="acs-label-memory">
        <span>data label</span>
        <strong>message</strong>
        <code>0x00400000</code>
        <div className="acs-inline-bytes"><span>68</span><span>65</span><span>6C</span><span>6C</span><span>6F</span><span>00</span></div>
        <small>"hello\0"</small>
      </div>
      <div className="acs-address-operations">
        <article className="acs-operation-card acs-address-copy">
          <span>1 · COPY THE ADDRESS</span>
          <code>ldr x1, =message</code>
          <div><strong>X1</strong><code>0x00400000</code></div>
          <p>X1 now points to message. The bytes stored at message were not read.</p>
        </article>
        <article className="acs-operation-card acs-address-read">
          <span>2 · FOLLOW THE POINTER</span>
          <code>ldrb w2, [x1]</code>
          <div><strong>W2 / X2</strong><code>0x68 · first byte at X1</code></div>
          <p>The brackets use X1 as an address. LDRB reads one byte there.</p>
        </article>
      </div>
      <svg className="acs-pointer-line" viewBox="0 0 420 90" preserveAspectRatio="none" aria-hidden="true">
        <path d="M338 12 C270 78 122 78 76 34" />
        <path d="m83 43-9-10 13-3" />
      </svg>
    </SceneFrame>
  );
}

function SyscallBoundaryScene() {
  return (
    <SceneFrame
      kind="syscall-boundary"
      eyebrow="SIMULATED PRIVILEGE BOUNDARY"
      title="Prepare a request, then cross the SVC gate"
      caption="MOV instructions only prepare register values. SVC 0 triggers the simplified service in A64 Lab; it does not invoke a real host kernel."
    >
      <section className="acs-boundary-side acs-application-side">
        <header><span>APPLICATION</span><strong>Unprivileged program</strong></header>
        <div className="acs-request-registers">
          <div><code>X8 = 93</code><span>service: exit</span></div>
          <div><code>X0 = 0</code><span>argument: status</span></div>
        </div>
        <p>Request prepared. Nothing has happened yet.</p>
      </section>
      <div className="acs-svc-gate">
        <span>closed before instruction</span>
        <code>SVC 0</code>
        <strong>request crosses →</strong>
      </div>
      <section className="acs-boundary-side acs-kernel-side">
        <header><span>LINUX SERVICE</span><strong>Privileged side</strong></header>
        <div className="acs-kernel-service"><span>93</span><strong>exit(status = 0)</strong></div>
        <p>A64 Lab marks the simulated process as exited.</p>
      </section>
      <div className="acs-simulation-badge">EDUCATIONAL SIMULATION · write(64) and exit(93) only</div>
    </SceneFrame>
  );
}

function WriteBytesScene() {
  return (
    <SceneFrame
      kind="write-bytes"
      eyebrow="LINUX AARCH64 WRITE"
      title="Destination + start address + requested byte count"
      caption="X2 requests up to six bytes. A64 Lab models a successful write of all six, so the NUL byte remains outside the selected range."
    >
      <div className="acs-write-registers">
        <div><code>X0 = 1</code><span>stdout descriptor</span></div>
        <div><code>X1 = 0x00400000</code><span>buffer address</span></div>
        <div><code>X2 = 6</code><span>bytes to copy</span></div>
        <div><code>X8 = 64</code><span>write service</span></div>
      </div>
      <div className="acs-write-memory">
        <header><strong>message in memory</strong><span>begin at X1</span></header>
        <ByteStrip cells={HELLO_BYTES} label="six selected message bytes followed by one excluded zero byte" />
        <div className="acs-byte-bracket"><span>these six bytes are sent</span><em>00 is outside the count</em></div>
      </div>
      <div className="acs-write-route" aria-hidden="true"><span>SVC 0</span><strong>↓ A64 Lab: 6 bytes</strong></div>
      <div className="acs-mini-terminal">
        <header><i /><i /><i /><span>stdout</span></header>
        <pre>hello↵</pre>
      </div>
    </SceneFrame>
  );
}

function DisassemblyAnatomyScene() {
  return (
    <SceneFrame
      kind="disassembly-anatomy"
      eyebrow="FROM BYTES BACK TO INSTRUCTIONS"
      title="Disassembly is a readable view of machine code"
      caption="Given code addresses and the correct alignment, a disassembler decodes bytes into instruction boundaries, mnemonics, and operands. It cannot reliably restore original names, comments, types, or exact source."
    >
      <div className="acs-disassembly-pipeline">
        <div><span>1</span><strong>Assembly source</strong><code>stp x29, x30, [sp, #-32]!</code></div>
        <FlowArrow label="assembler" />
        <div><span>2</span><strong>Machine bytes</strong><code>FD 7B BE A9</code></div>
        <FlowArrow label="disassembler" />
        <div><span>3</span><strong>Instruction listing</strong><code>stp x29, x30, [sp, #-32]!</code></div>
      </div>
      <div className="acs-row-anatomy">
        <header>One disassembly row</header>
        <div className="acs-annotated-row">
          <div><small>address</small><code>000000000000000C</code></div>
          <div><small>encoded bytes</small><code>FD 7B BE A9</code></div>
          <div><small>mnemonic</small><code>STP</code></div>
          <div><small>operands</small><code>X29, X30, [SP, #-32]!</code></div>
        </div>
      </div>
      <div className="acs-disassembly-groups">
        <span className="acs-group-setup">setup · save FP/LR</span>
        <span className="acs-group-body">body · useful work</span>
        <span className="acs-group-cleanup">cleanup · restore and RET</span>
      </div>
    </SceneFrame>
  );
}

function CMappingScene() {
  return (
    <SceneFrame
      kind="c-mapping"
      eyebrow="CONCEPTUAL SOURCE MAPPING"
      title="Follow values across the function boundary"
      caption="The calling convention suggests where values enter and leave. This mapping explains the behavior, but it does not prove the exact original C source."
    >
      <pre className="acs-c-source"><code>{'int addints(int a, int b) {\n    return a + b;\n}'}</code></pre>
      <FlowArrow label="common 32-bit value mapping" />
      <div className="acs-c-register-flow">
        <div className="acs-c-input"><span>parameter a</span><strong>W0 = 10</strong></div>
        <div className="acs-c-input"><span>parameter b</span><strong>W1 = 20</strong></div>
        <div className="acs-c-add"><code>ADD W0, W0, W1</code><span>10 + 20</span></div>
        <div className="acs-c-result"><span>return value</span><strong>W0 = 30</strong></div>
      </div>
      <div className="acs-inference-note"><strong>Evidence, not proof</strong><span>W operations show 32-bit data flow; source names and types are not stored here.</span></div>
    </SceneFrame>
  );
}

function DebugSnapshotScene() {
  const checklist = [
    ['1', 'PC', 'Which instruction is current, or has execution finished?'],
    ['2', 'LR / X30', 'Is this a plausible return address?'],
    ['3', 'SP', 'Where is the current stack boundary?'],
    ['4', 'X0–X7', 'Could these be arguments or results?'],
    ['5', 'Patterns', 'Which unusual values need tracing?'],
  ] as const;

  return (
    <SceneFrame
      kind="debug-snapshot"
      eyebrow="PAUSED CPU STATE"
      title="Inspect state in the same order every time"
      caption="This is the exact A64 Lab state after Step 4. PC is the next instruction position at program end; repeated 41 bytes are an investigation clue, not proof of a vulnerability or a valid code address."
    >
      <div className="acs-debug-registers">
        <div className="acs-debug-current"><span>next position · program complete</span><strong>PC</strong><code>0x0000000000000010</code></div>
        <div className="acs-debug-warning"><span>return candidate · unusual</span><strong>X30 / LR</strong><code>0x4141414141414141</code></div>
        <div><span>stack boundary</span><strong>SP</strong><code>0x00007FFFFFFFDFE0</code></div>
        <div><span>recognizable data value</span><strong>X1</strong><code>0x4141414141414141</code></div>
      </div>
      <ol className="acs-debug-checklist">
        {checklist.map(([number, name, question]) => (
          <li key={name}><span>{number}</span><strong>{name}</strong><p>{question}</p></li>
        ))}
      </ol>
      <div className="acs-pattern-decoder"><code>41 41 41 41 41 41 41 41</code><span>ASCII</span><strong>A A A A A A A A</strong></div>
    </SceneFrame>
  );
}

function IndirectControlScene() {
  const paths = [
    { opcode: 'B label', kind: 'direct jump', target: 'assembler encodes a PC-relative offset', lr: 'X30 unchanged' },
    { opcode: 'BL label', kind: 'direct call', target: 'assembler encodes a PC-relative offset', lr: 'X30 = next PC' },
    { opcode: 'BR X9', kind: 'indirect jump', target: 'address currently inside X9', lr: 'X30 unchanged' },
    { opcode: 'BLR X8', kind: 'indirect call', target: 'address currently inside X8', lr: 'X30 = next PC' },
  ] as const;

  return (
    <SceneFrame
      kind="indirect-control"
      eyebrow="CONTROL-FLOW TARGETS"
      title="Two target sources × jump or call"
      caption="Source assembly gives B/BL a label, which the assembler resolves to a signed PC-relative offset in machine code. BR/BLR instead read the destination from a register. Only BL and BLR create a new return address."
    >
      <div className="acs-control-axis">
        <span>DIRECT · PC-relative offset encoded in instruction</span>
        <span>INDIRECT · target read from register</span>
      </div>
      <div className="acs-control-grid">
        {paths.map((path) => (
          <article className={`acs-control-card ${path.kind.includes('call') ? 'acs-control-call' : 'acs-control-jump'}`} key={path.opcode}>
            <span>{path.kind}</span>
            <code>{path.opcode}</code>
            <p><strong>PC target</strong>{path.target}</p>
            <p><strong>Link effect</strong>{path.lr}</p>
          </article>
        ))}
      </div>
      <div className="acs-control-security">
        <strong>Why reverse engineers care</strong>
        <span>Callbacks, function pointers, virtual methods, and jump tables legitimately use indirect targets.</span>
        <span>If corruption changes a code pointer, trace where that value came from before drawing a security conclusion.</span>
      </div>
    </SceneFrame>
  );
}

function NativeWorkflowScene() {
  const steps = [
    ['1', 'Mark control flow', 'Find function boundaries, calls, returns, and every branch target.'],
    ['2', 'Identify values', 'Record likely arguments, return values, and important constants.'],
    ['3', 'Track state changes', 'For each instruction, write down which register or memory bytes change.'],
    ['4', 'Resolve memory access', 'Calculate each address and note the access width before interpreting data.'],
    ['5', 'Follow every path', 'Evaluate comparison flags and trace both taken and not-taken branches.'],
    ['6', 'Verify the return', 'Check that SP, saved registers, FP, and LR are restored as expected.'],
    ['7', 'Ask security questions', 'Which inputs can influence a length, address, memory write, or indirect target?'],
  ] as const;

  return (
    <SceneFrame
      kind="native-workflow"
      eyebrow="REPEATABLE NATIVE-CODE WORKFLOW"
      title="Move from structure to evidence"
      caption="Finish with a one-sentence behavior summary. Treat suspicious state as a lead to verify, never as automatic proof of a vulnerability."
    >
      <ol className="acs-native-steps">
        {steps.map(([number, title, detail]) => (
          <li className={number === '7' ? 'acs-security-step' : undefined} key={number}>
            <span>{number}</span>
            <div><strong>{title}</strong><p>{detail}</p></div>
          </li>
        ))}
      </ol>
      <div className="acs-native-summary">
        <span>final output</span>
        <strong>One behavior summary + a list of claims supported by traced state</strong>
      </div>
    </SceneFrame>
  );
}

export function AdvancedConceptScene({ kind }: { kind: AdvancedConceptKind }) {
  switch (kind) {
    case 'code-data-sections': return <CodeDataSectionsScene />;
    case 'string-bytes': return <StringBytesScene />;
    case 'label-address': return <LabelAddressScene />;
    case 'syscall-boundary': return <SyscallBoundaryScene />;
    case 'write-bytes': return <WriteBytesScene />;
    case 'disassembly-anatomy': return <DisassemblyAnatomyScene />;
    case 'c-mapping': return <CMappingScene />;
    case 'debug-snapshot': return <DebugSnapshotScene />;
    case 'indirect-control': return <IndirectControlScene />;
    case 'native-workflow': return <NativeWorkflowScene />;
    default: {
      const unreachable: never = kind;
      throw new Error(`Unknown advanced concept scene: ${String(unreachable)}`);
    }
  }
}
