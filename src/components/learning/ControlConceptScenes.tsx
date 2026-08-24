import '../../control-concept-scenes.css';

export type ControlConceptSceneKind =
  | 'cmp-zero'
  | 'signed-flags'
  | 'ordered-branch'
  | 'bl-only'
  | 'return-flow'
  | 'function-arguments'
  | 'function-result'
  | 'save-lr-cycle'
  | 'pair-transfer'
  | 'stack-frame-flow'
  | 'nested-return-addresses';

interface ControlConceptSceneProps {
  kind: ControlConceptSceneKind;
}

const SCENE_DETAILS: Record<ControlConceptSceneKind, { label: string; caption: string }> = {
  'cmp-zero': {
    label: 'CMP equality and zero flag comparison',
    caption: 'CMP keeps the operands and updates the flags. Z is 1 exactly when the compared values are equal.',
  },
  'signed-flags': {
    label: 'Signed and unsigned comparison flag meanings',
    caption: 'CMP computes a fixed-width result only to derive flags, then discards it. N and Z describe that computation, C answers the unsigned borrow question, and V reports signed overflow.',
  },
  'ordered-branch': {
    label: 'Signed less-than branch decision',
    caption: 'CMP creates the flags first. B.LT then reads N and V and changes only the path of execution.',
  },
  'bl-only': {
    label: 'BL function call and link register effects',
    caption: 'BL performs two writes: LR receives the next instruction address, and PC receives the function address.',
  },
  'return-flow': {
    label: 'Return instruction control flow',
    caption: 'The simplified return is PC = X30. It does not automatically read memory, move SP, or restore registers.',
  },
  'function-arguments': {
    label: 'Function arguments crossing a call boundary',
    caption: 'The caller and callee use the same registers. BL does not copy the argument values.',
  },
  'function-result': {
    label: 'Function result returned in X0',
    caption: 'The callee writes the answer into X0. Returning changes control flow but leaves that answer in X0.',
  },
  'save-lr-cycle': {
    label: 'Save and restore link register around a nested call',
    caption: 'Save the older link before another BL overwrites X30, then restore it before the outer function returns.',
  },
  'pair-transfer': {
    label: 'STP and LDP register pair memory layout',
    caption: 'The first register uses the base slot and the second uses the adjacent eight-byte slot. Plain brackets leave SP unchanged.',
  },
  'stack-frame-flow': {
    label: 'Stack frame prologue body and epilogue',
    caption: 'A conventional frame has three phases: prepare saved state, do the function work, then restore state before returning.',
  },
  'nested-return-addresses': {
    label: 'Nested calls with live and saved return addresses',
    caption: 'At the deepest call, the newest return address is live in X30 while the older one is preserved in foo’s stack frame.',
  },
};

function FlowArrow({ label }: { label?: string }) {
  return (
    <div className="ccs-flow-arrow" aria-hidden="true">
      {label && <small>{label}</small>}
      <span>→</span>
    </div>
  );
}

function SignedFlagsScene() {
  const flags = [
    ['N = 1', 'top result bit is 1', 'signed result looks negative'],
    ['Z = 0', 'result is not zero', '5 and 7 are not equal'],
    ['C = 0', 'unsigned borrow needed', 'unsigned 5 is below 7'],
    ['V = 0', 'signed answer fits', '−2 fits in 64 bits'],
  ];
  return (
    <div className="ccs-signed-flags" data-testid="control-signed-flags">
      <div className="ccs-definition-strip ccs-definition-two">
        <span><strong>Unsigned view</strong><small>bits represent zero or a positive value</small></span>
        <span><strong>Signed view</strong><small>the same bits may represent a negative value</small></span>
      </div>
      <div className="ccs-signed-calculation">
        <span><small>CMP computes a 64-bit result</small><code>5 − 7 = 0xFFFFFFFFFFFFFFFE</code></span>
        <strong>same result pattern</strong>
        <span><small>signed interpretation</small><code>−2</code></span>
      </div>
      <div className="ccs-flag-question-grid">
        {flags.map(([flag, question, answer]) => (
          <article key={flag}>
            <strong>{flag}</strong>
            <span>{question}</span>
            <small>{answer}</small>
          </article>
        ))}
      </div>
      <div className="ccs-unchanged-strip"><strong>Unchanged</strong><code>X0 = 5</code><code>X1 = 7</code></div>
    </div>
  );
}

function StateBox({
  eyebrow,
  title,
  values,
  tone = 'plain',
}: {
  eyebrow: string;
  title: string;
  values: readonly string[];
  tone?: 'plain' | 'active' | 'success' | 'warning' | 'dim';
}) {
  return (
    <div className={`ccs-state-box ccs-tone-${tone}`}>
      <span className="ccs-eyebrow">{eyebrow}</span>
      <strong>{title}</strong>
      <div className="ccs-value-list">
        {values.map((value) => <code key={value}>{value}</code>)}
      </div>
    </div>
  );
}

function CmpZeroScene() {
  return (
    <div className="ccs-compare-grid">
      <section className="ccs-compare-case ccs-case-equal">
        <header><span>CASE 1</span><strong>Equal values</strong></header>
        <div className="ccs-register-pair">
          <code>X0 = 5</code><span>versus</span><code>X1 = 5</code>
        </div>
        <code className="ccs-instruction">cmp x0, x1</code>
        <div className="ccs-equation">5 − 5 = 0</div>
        <div className="ccs-flag-result"><span>Z</span><strong>1</strong><em>equal</em></div>
        <small>X0 and X1 stay unchanged</small>
      </section>
      <section className="ccs-compare-case ccs-case-unequal">
        <header><span>CASE 2</span><strong>Different values</strong></header>
        <div className="ccs-register-pair">
          <code>X0 = 5</code><span>versus</span><code>X1 = 7</code>
        </div>
        <code className="ccs-instruction">cmp x0, x1</code>
        <div className="ccs-equation">5 − 7 ≠ 0</div>
        <div className="ccs-flag-result"><span>Z</span><strong>0</strong><em>not equal</em></div>
        <small>X0 and X1 stay unchanged</small>
      </section>
    </div>
  );
}

function OrderedBranchScene() {
  return (
    <div className="ccs-ordered-scene">
      <div className="ccs-linear-flow">
        <StateBox eyebrow="1 · COMPARE" title="Set flags for X0 − X1" values={['X0 = 5', 'X1 = 7', '5 − 7 = −2']} />
        <FlowArrow />
        <StateBox eyebrow="2 · FLAGS" title="Read the saved facts" values={['N = 1', 'Z = 0', 'V = 0']} tone="active" />
        <FlowArrow />
        <StateBox eyebrow="3 · SIGNED TEST" title="Is 5 less than 7?" values={['B.LT tests N ≠ V', '1 ≠ 0 → TRUE']} tone="success" />
      </div>
      <div className="ccs-branch-fork">
        <div className="ccs-fork-stem"><code>b.lt less</code></div>
        <div className="ccs-path ccs-path-taken"><span>✓ TAKEN</span><code>PC → less:</code></div>
        <div className="ccs-path ccs-path-dim"><span>NOT USED</span><code>mov x2, 0</code><small>fallthrough instruction</small></div>
      </div>
    </div>
  );
}

function BlOnlyScene() {
  return (
    <div className="ccs-bl-scene">
      <div className="ccs-definition-strip">
        <span><strong>Function</strong><small>a named block of reusable code</small></span>
        <span><strong>Caller · _start</strong><small>the code making the call</small></span>
        <span><strong>Callee · foo</strong><small>the function receiving control</small></span>
      </div>
      <div className="ccs-call-flow">
        <StateBox eyebrow="BEFORE" title="Caller is at the call" values={['PC = 0x0000', 'X30 / LR = 0x0000', '0x0000: bl foo']} />
        <FlowArrow label="execute BL" />
        <div className="ccs-two-effects">
          <StateBox eyebrow="WRITE 1" title="Remember where to continue" values={['X30 / LR = 0x0004', '0x0004: b end']} tone="active" />
          <StateBox eyebrow="WRITE 2" title="Enter the callee" values={['PC = 0x0008', '0x0008: foo']} tone="success" />
        </div>
      </div>
      <div className="ccs-unchanged-strip"><strong>Not changed by BL</strong><span>SP</span><span>memory</span><span>argument values</span></div>
    </div>
  );
}

function ReturnFlowScene() {
  return (
    <div className="ccs-return-scene">
      <div className="ccs-linear-flow">
        <StateBox eyebrow="BEFORE" title="Function has finished its work" values={['PC = 0x000C · ret', 'X30 / LR = 0x0004', 'SP = 0x…E000']} />
        <FlowArrow label="PC = X30" />
        <StateBox eyebrow="AFTER" title="Caller resumes" values={['PC = 0x0004 · b end', 'X30 / LR = 0x0004 · unchanged', 'SP = 0x…E000 · unchanged']} tone="success" />
      </div>
      <div className="ccs-no-magic">
        <strong>No automatic stack magic</strong>
        <span>no memory read</span><span>no SP movement</span><span>no register restoration</span>
      </div>
    </div>
  );
}

function FunctionArgumentsScene() {
  return (
    <div className="ccs-argument-scene">
      <div className="ccs-definition-strip ccs-definition-two">
        <span><strong>Argument</strong><small>an input value given to a function</small></span>
        <span><strong>Calling convention</strong><small>an agreement about where inputs are placed</small></span>
      </div>
      <div className="ccs-boundary-flow">
        <section className="ccs-function-side">
          <span>CALLER · _start</span>
          <div className="ccs-argument-register"><strong>X0</strong><code>10</code><small>argument 1</small></div>
          <div className="ccs-argument-register"><strong>X1</strong><code>20</code><small>argument 2</small></div>
        </section>
        <div className="ccs-call-boundary"><code>bl inspect</code><span>call boundary →</span><small>values stay in the same registers</small></div>
        <section className="ccs-function-side ccs-callee-side">
          <span>CALLEE · inspect</span>
          <div className="ccs-argument-register"><strong>X0</strong><code>10</code><small>reads argument 1</small></div>
          <div className="ccs-argument-register"><strong>X1</strong><code>20</code><small>reads argument 2</small></div>
        </section>
      </div>
    </div>
  );
}

function FunctionResultScene() {
  return (
    <div className="ccs-result-scene">
      <div className="ccs-result-track">
        <StateBox eyebrow="CALLEE INPUT" title="addnumbers begins" values={['X0 = 10', 'X1 = 20']} />
        <FlowArrow label="add x0, x0, x1" />
        <StateBox eyebrow="CALLEE RESULT" title="The answer replaces X0" values={['X0 = 30', 'X1 = 20 · unchanged']} tone="active" />
        <FlowArrow label="return control" />
        <StateBox eyebrow="CALLER" title="The answer is still available" values={['X0 = 30 · return value', 'PC is back in caller']} tone="success" />
      </div>
      <div className="ccs-role-contrast"><span><strong>X0</strong> carries the result</span><span><strong>X30 / LR</strong> carries the address back</span></div>
    </div>
  );
}

function SaveLrCycleScene() {
  const steps = [
    { number: '1', title: '_start calls foo', code: 'X30 holds foo → _start return', note: 'older link is live', tone: 'plain' },
    { number: '2', title: 'foo saves its link', code: '[0x…DFF0] = old X30', note: 'copy is safe in memory', tone: 'active' },
    { number: '3', title: 'foo calls bar', code: 'X30 holds bar → foo return', note: 'nested BL overwrites live LR', tone: 'warning' },
    { number: '4', title: 'bar returns to foo', code: 'PC = live X30', note: 'saved older link is untouched', tone: 'plain' },
    { number: '5', title: 'foo restores its link', code: 'X30 ← [0x…DFF0] · foo → _start', note: 'foo can now return to _start', tone: 'success' },
  ] as const;
  return (
    <div className="ccs-save-lr-scene">
      <div className="ccs-cycle-track">
        {steps.map((step, index) => (
          <div className="ccs-cycle-group" key={step.number}>
            <article className={`ccs-cycle-step ccs-tone-${step.tone}`}>
              <header><span>{step.number}</span><strong>{step.title}</strong></header>
              <code>{step.code}</code><small>{step.note}</small>
            </article>
            {index < steps.length - 1 && <FlowArrow />}
          </div>
        ))}
      </div>
      <div className="ccs-memory-safety"><strong>Why memory?</strong><span>A later BL changes X30, but it does not change the saved eight bytes at [SP].</span></div>
    </div>
  );
}

function PairTransferScene() {
  return (
    <div className="ccs-pair-scene">
      <div className="ccs-pair-registers">
        <div><span>first operand</span><strong>X29</strong><code>0x1111</code></div>
        <div><span>second operand</span><strong>X30</strong><code>0x2222</code></div>
      </div>
      <div className="ccs-pair-operation">
        <code>stp x29, x30, [sp]</code><span>store ↓</span><span>load ↑</span><code>ldp x29, x30, [sp]</code>
      </div>
      <div className="ccs-pair-memory">
        <div><code>SP + 8 … SP + 15</code><strong>saved X30</strong><span>0x2222</span></div>
        <div className="ccs-memory-base"><code>SP + 0 … SP + 7</code><strong>saved X29</strong><span>0x1111</span><em>← SP</em></div>
      </div>
      <div className="ccs-unchanged-strip"><strong>Plain [sp]</strong><span>SP does not move</span><span>two separate 8-byte transfers</span></div>
    </div>
  );
}

function StackFrameFlowScene() {
  return (
    <div className="ccs-frame-flow">
      <section className="ccs-frame-stage ccs-frame-prologue">
        <header><span>1</span><strong>Prologue · prepare</strong></header>
        <ol>
          <li><code>stp x29, x30, [sp, #-16]!</code><small>SP: E000 → DFF0</small></li>
          <li><code>[DFF0] = incoming X29</code><small>[DFF8] = return-to-caller address</small></li>
          <li><code>mov x29, sp</code><small>FP = DFF0</small></li>
        </ol>
      </section>
      <FlowArrow />
      <section className="ccs-frame-stage ccs-frame-body">
        <header><span>2</span><strong>Body · work</strong></header>
        <ol><li><code>mov x0, 42</code><small>X0 = result</small></li></ol>
        <div className="ccs-mini-frame">
          <span>DFF8 · saved return-to-caller address</span><span>DFF0 · saved incoming FP ← SP, live FP</span>
        </div>
      </section>
      <FlowArrow />
      <section className="ccs-frame-stage ccs-frame-epilogue">
        <header><span>3</span><strong>Epilogue · restore</strong></header>
        <ol>
          <li><code>ldp x29, x30, [sp], #16</code><small>restore FP and LR</small></li>
          <li><code>SP: DFF0 → E000</code><small>X0 stays 42</small></li>
          <li><code>ret</code><small>PC = restored X30</small></li>
        </ol>
      </section>
    </div>
  );
}

function NestedReturnAddressesScene() {
  return (
    <div className="ccs-nested-scene">
      <div className="ccs-nested-deepest">
        <section className="ccs-active-chain">
          <header><span>DEEPEST POINT</span><strong>Current active-call chain</strong></header>
          <ol><li>_start</li><li>foo</li><li>bar <em>running now</em></li></ol>
        </section>
        <section className="ccs-return-locations">
          <header><span>TWO ROUTES BACK</span><strong>Kept in different places</strong></header>
          <div className="ccs-live-return"><span>LIVE · newest</span><strong>X30 / LR</strong><code>bar → foo</code></div>
          <div className="ccs-saved-return"><span>SAVED · older</span><strong>memory[SP + 8]</strong><code>foo → _start</code></div>
        </section>
      </div>
      <div className="ccs-unwind-track">
        <StateBox eyebrow="1 · BAR FINISHES" title="Use the live link" values={['PC = X30', 'bar → foo']} />
        <FlowArrow />
        <StateBox eyebrow="2 · FOO RESTORES" title="Recover the older link" values={['LDP loads saved X30', 'SP moves back']} tone="active" />
        <FlowArrow />
        <StateBox eyebrow="3 · FOO FINISHES" title="Use the restored link" values={['PC = restored X30', 'foo → _start']} tone="success" />
      </div>
    </div>
  );
}

function SceneContent({ kind }: { kind: ControlConceptSceneKind }) {
  switch (kind) {
    case 'cmp-zero': return <CmpZeroScene />;
    case 'signed-flags': return <SignedFlagsScene />;
    case 'ordered-branch': return <OrderedBranchScene />;
    case 'bl-only': return <BlOnlyScene />;
    case 'return-flow': return <ReturnFlowScene />;
    case 'function-arguments': return <FunctionArgumentsScene />;
    case 'function-result': return <FunctionResultScene />;
    case 'save-lr-cycle': return <SaveLrCycleScene />;
    case 'pair-transfer': return <PairTransferScene />;
    case 'stack-frame-flow': return <StackFrameFlowScene />;
    case 'nested-return-addresses': return <NestedReturnAddressesScene />;
  }
}

export function ControlConceptScene({ kind }: ControlConceptSceneProps) {
  const details = SCENE_DETAILS[kind];
  return (
    <figure className={`control-concept-scene ccs-${kind}`} aria-label={details.label} data-kind={kind}>
      <SceneContent kind={kind} />
      <figcaption><strong>What to remember</strong><span>{details.caption}</span></figcaption>
    </figure>
  );
}
