import '../../foundation-concept-scenes.css';

export type FoundationConceptKind =
  | 'cpu-state'
  | 'arithmetic-flow'
  | 'address-pointer'
  | 'memory-offset'
  | 'stack-value-five-steps';

const SCENE_META: Record<FoundationConceptKind, { title: string; caption: string }> = {
  'cpu-state': {
    title: 'One instruction, one visible state change',
    caption: 'CPU state means the values currently held by registers and memory. X0 is the main data change here; PC also advances to the next instruction position.',
  },
  'arithmetic-flow': {
    title: 'Arithmetic reads inputs and writes one destination',
    caption: 'The first operand is the destination. Register inputs and immediate inputs are both read without being cleared.',
  },
  'address-pointer': {
    title: 'A pointer connects a register value to memory',
    caption: 'X1 contains the number 0x400000. Square brackets can later tell an instruction to access memory at that address.',
  },
  'memory-offset': {
    title: 'An offset selects a nearby byte address',
    caption: 'The CPU calculates 0x400000 + 8 = 0x400008 for the access. Ordinary offset addressing leaves X1 unchanged.',
  },
  'stack-value-five-steps': {
    title: 'Follow one value through five separate instructions',
    caption: 'MOV changes X0, SUB changes SP, STR changes memory, LDR changes X1, and ADD changes SP back. ADD does not erase memory.',
  },
};

function FlowArrow({ label }: { label: string }) {
  return (
    <div className="fcs-flow-arrow" aria-label={label}>
      <span aria-hidden="true">→</span>
      <small>{label}</small>
    </div>
  );
}

function CpuStateScene() {
  return (
    <div className="fcs-state-flow" data-testid="foundation-cpu-state">
      <article className="fcs-state-card fcs-state-before">
        <span className="fcs-step-label">BEFORE</span>
        <div className="fcs-register-value">
          <code>X0</code>
          <strong>0</strong>
        </div>
        <small>This is the current state.</small>
      </article>

      <FlowArrow label="execute one instruction" />

      <article className="fcs-instruction-card">
        <span className="fcs-step-label">INSTRUCTION</span>
        <code>mov x0, 10</code>
        <p>Copy the number <strong>10</strong> into <strong>X0</strong>.</p>
      </article>

      <FlowArrow label="keep the result" />

      <article className="fcs-state-card fcs-state-after">
        <span className="fcs-step-label">AFTER</span>
        <div className="fcs-register-value">
          <code>X0</code>
          <strong>10</strong>
        </div>
        <small><b>Main data change: X0.</b> The instruction position also advances.</small>
      </article>
    </div>
  );
}

function ArithmeticFlowScene() {
  return (
    <div className="fcs-arithmetic" data-testid="foundation-arithmetic-flow">
      <article className="fcs-arithmetic-row" data-testid="foundation-add-row">
        <header>
          <span>1</span>
          <div><strong>ADD</strong><small>two register inputs</small></div>
        </header>
        <div className="fcs-arithmetic-path">
          <div className="fcs-input-group" aria-label="ADD inputs">
            <span><code>X0</code><strong>10</strong></span>
            <span><code>X1</code><strong>20</strong></span>
          </div>
          <FlowArrow label="read both" />
          <div className="fcs-operation">
            <code>add x2, x0, x1</code>
            <span>10 + 20</span>
          </div>
          <FlowArrow label="write result" />
          <div className="fcs-result">
            <small>DESTINATION</small>
            <code>X2 = 30</code>
          </div>
        </div>
        <p><strong>Changed:</strong> X2 only. X0 stays 10 and X1 stays 20.</p>
      </article>

      <article className="fcs-arithmetic-row" data-testid="foundation-sub-row">
        <header>
          <span>2</span>
          <div><strong>SUB</strong><small>one register + one immediate</small></div>
        </header>
        <div className="fcs-arithmetic-path">
          <div className="fcs-input-group" aria-label="SUB inputs">
            <span><code>X2</code><strong>30</strong></span>
            <span className="fcs-immediate"><code>#5</code><strong>literal 5</strong></span>
          </div>
          <FlowArrow label="read both" />
          <div className="fcs-operation">
            <code>sub x3, x2, #5</code>
            <span>30 − 5</span>
          </div>
          <FlowArrow label="write result" />
          <div className="fcs-result">
            <small>DESTINATION</small>
            <code>X3 = 25</code>
          </div>
        </div>
        <p><strong>#5 is an immediate:</strong> the number is written inside the instruction. X2 stays 30.</p>
      </article>
    </div>
  );
}

function AddressPointerScene() {
  const memoryRows = [
    ['0x3FFFF8', 'nearby memory'],
    ['0x400000', 'the addressed location'],
    ['0x400008', 'nearby memory'],
  ];

  return (
    <div className="fcs-pointer" data-testid="foundation-address-pointer">
      <article className="fcs-data-register">
        <span className="fcs-step-label">ORDINARY DATA</span>
        <strong>X0</strong>
        <code>42</code>
        <small>Code intends to use this as a number.</small>
      </article>

      <article className="fcs-pointer-register">
        <span className="fcs-step-label">REGISTER</span>
        <strong>X1</strong>
        <code>0x400000</code>
        <small>X1 holds a number.</small>
      </article>

      <div className="fcs-pointer-arrow" aria-label="interpret this number as an address">
        <span>use as an address</span>
        <svg viewBox="0 0 180 54" role="img" aria-label="Arrow from X1 to memory address 0x400000">
          <path d="M4 27 H164" />
          <path d="m151 14 14 13-14 13" />
        </svg>
        <small>pointer</small>
      </div>

      <article className="fcs-memory-map">
        <span className="fcs-step-label">MEMORY · NUMBERED BYTE LOCATIONS</span>
        <div className="fcs-memory-rows">
          {memoryRows.map(([address, meaning]) => (
            <div className={address === '0x400000' ? 'fcs-memory-target' : ''} key={address}>
              <code>{address}</code>
              <span>{meaning}</span>
              {address === '0x400000' && <strong>← X1 points here</strong>}
            </div>
          ))}
        </div>
      </article>

      <div className="fcs-pointer-rule">
        <strong>Important</strong>
        <span>Putting 0x400000 into X1 does not read or change memory. It only prepares a possible pointer.</span>
      </div>
    </div>
  );
}

function MemoryOffsetScene() {
  const byteOffsets = Array.from({ length: 9 }, (_, index) => index);

  return (
    <div className="fcs-offset" data-testid="foundation-memory-offset">
      <div className="fcs-address-equation" aria-label="Address calculation">
        <div><small>BASE IN X1</small><code>0x400000</code></div>
        <span className="fcs-equation-symbol">+</span>
        <div><small>BYTE OFFSET</small><code>#8</code></div>
        <span className="fcs-equation-symbol">=</span>
        <div className="fcs-equation-result"><small>ACCESSED ADDRESS</small><code>0x400008</code></div>
      </div>

      <div className="fcs-byte-walk" aria-label="Nine byte addresses from offset zero through offset eight">
        {byteOffsets.map((offset) => (
          <div
            className={offset === 0 ? 'fcs-byte-base' : offset === 8 ? 'fcs-byte-target' : ''}
            key={offset}
          >
            <small>+{offset}</small>
            <span>{offset === 0 ? 'base' : offset === 8 ? 'target' : 'byte'}</span>
          </div>
        ))}
      </div>

      <div className="fcs-offset-addresses">
        <code>0x400000</code>
        <span>move 8 byte addresses higher →</span>
        <code>0x400008</code>
      </div>

      <div className="fcs-offset-rule">
        <code>[x1, #8]</code>
        <span>accesses the calculated address</span>
        <strong>X1 still equals 0x400000</strong>
      </div>
    </div>
  );
}

const STACK_STEPS = [
  {
    number: '1',
    opcode: 'MOV',
    instruction: 'mov x0, 42',
    changed: 'X0: 0 → 42',
    unchanged: 'SP = E000 · memory unchanged',
  },
  {
    number: '2',
    opcode: 'SUB',
    instruction: 'sub sp, sp, #16',
    changed: 'SP: E000 → DFF0',
    unchanged: 'DFF0–DFFF becomes usable · no bytes written',
  },
  {
    number: '3',
    opcode: 'STR',
    instruction: 'str x0, [sp]',
    changed: '[DFF0] becomes 42',
    unchanged: 'X0 = 42 · SP = DFF0',
  },
  {
    number: '4',
    opcode: 'LDR',
    instruction: 'ldr x1, [sp]',
    changed: 'X1: 0 → 42',
    unchanged: '[DFF0] still contains 42 · SP = DFF0',
  },
  {
    number: '5',
    opcode: 'ADD',
    instruction: 'add sp, sp, #16',
    changed: 'SP: DFF0 → E000',
    unchanged: '[DFF0] still contains 42 · it may now be reused',
  },
] as const;

function StackValueFiveStepsScene() {
  return (
    <div className="fcs-stack" data-testid="foundation-stack-value-five-steps">
      <div className="fcs-stack-primer">
        <strong>SP is an address marker.</strong>
        <span>Changing SP changes which stack bytes the code may use. It does not move or erase those bytes. Each card below names the main non-PC effect; PC also advances.</span>
      </div>

      <div className="fcs-stack-steps">
        {STACK_STEPS.map((step) => (
          <article className={`fcs-stack-step fcs-stack-${step.opcode.toLowerCase()}`} key={step.number}>
            <header><span>{step.number}</span><strong>{step.opcode}</strong></header>
            <code>{step.instruction}</code>
            <div className="fcs-stack-change"><small>CHANGED</small><strong>{step.changed}</strong></div>
            <p>{step.unchanged}</p>
          </article>
        ))}
      </div>

      <div className="fcs-stack-final">
        <div className="fcs-stack-address-map">
          <div className="fcs-address-direction"><span>higher address</span><span>lower address ↓</span></div>
          <div className="fcs-stack-address fcs-stack-boundary">
            <code>0x7FFFFFFFE000</code>
            <span>current boundary after ADD</span>
            <strong>← SP now</strong>
          </div>
          <div className="fcs-stack-address fcs-stack-reusable">
            <code>0x7FFFFFFFDFF8</code>
            <span>old second 8-byte slot</span>
            <em>may be reused</em>
          </div>
          <div className="fcs-stack-address fcs-stack-has-value">
            <code>0x7FFFFFFFDFF0</code>
            <span>old first 8-byte slot</span>
            <strong>42 remains here</strong>
          </div>
        </div>

        <div className="fcs-stack-summary">
          <span className="fcs-step-label">FINAL STATE</span>
          <dl>
            <div><dt>X0</dt><dd>42</dd></div>
            <div><dt>X1</dt><dd>42</dd></div>
            <div><dt>SP</dt><dd>0x…E000</dd></div>
            <div><dt>memory at DFF0</dt><dd>still 42</dd></div>
          </dl>
          <p><strong>“Finished with the space”</strong> means later stack work may overwrite it—not that ADD deleted it.</p>
        </div>
      </div>
    </div>
  );
}

function SceneContent({ kind }: { kind: FoundationConceptKind }) {
  switch (kind) {
    case 'cpu-state':
      return <CpuStateScene />;
    case 'arithmetic-flow':
      return <ArithmeticFlowScene />;
    case 'address-pointer':
      return <AddressPointerScene />;
    case 'memory-offset':
      return <MemoryOffsetScene />;
    case 'stack-value-five-steps':
      return <StackValueFiveStepsScene />;
  }
}

export function FoundationConceptScene({ kind }: { kind: FoundationConceptKind }) {
  const meta = SCENE_META[kind];

  return (
    <figure
      aria-label={meta.title}
      className={`foundation-concept-scene foundation-concept-${kind}`}
      data-kind={kind}
    >
      <header className="fcs-heading">
        <span>CONCEPT FIRST</span>
        <strong>{meta.title}</strong>
      </header>
      <div className="fcs-canvas">
        <SceneContent kind={kind} />
      </div>
      <figcaption>{meta.caption}</figcaption>
    </figure>
  );
}
