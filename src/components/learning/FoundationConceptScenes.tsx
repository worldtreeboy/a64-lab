import { useEffect, useState } from 'react';
import '../../foundation-concept-scenes.css';

export type FoundationConceptKind =
  | 'cpu-state'
  | 'arithmetic-flow'
  | 'address-pointer'
  | 'memory-offset'
  | 'stack-growth-four-stages'
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
  'stack-growth-four-stages': {
    title: 'Understanding the Stack (ARM64)',
    caption: 'The stack is ordinary memory and SP is one address register. Reserve space, use it with STR and LDR, then restore SP; restoring SP does not erase the old bytes.',
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

type StackGrowthStage = 'before' | 'reserve' | 'use' | 'restore';
type StackValueStage = 'value-mov' | 'value-sub' | 'value-str' | 'value-ldr' | 'value-add';
type StackTowerStage = StackGrowthStage | StackValueStage;

const STACK_GROWTH_STAGES: ReadonlyArray<{ id: StackGrowthStage; label: string }> = [
  { id: 'before', label: 'Before' },
  { id: 'reserve', label: 'Allocate 16 bytes' },
  { id: 'use', label: 'Use the stack' },
  { id: 'restore', label: 'Restore' },
];

const STACK_TOWER_ROWS = [
  { id: 'e010', address: '0xE010' },
  { id: 'e008', address: '0xE008' },
  { id: 'e000', address: '0xE000' },
  { id: 'reserved-upper', address: '0xDFF8' },
  { id: 'dff0', address: '0xDFF0' },
] as const;

function StackTower({ stage }: { stage: StackTowerStage }) {
  const spAtOriginalAddress = ['before', 'restore', 'value-mov', 'value-add'].includes(stage);
  const hasReservedSpace = ['reserve', 'use', 'value-sub', 'value-str', 'value-ldr'].includes(stage);
  const hasReleasedSpace = stage === 'restore' || stage === 'value-add';
  const hasValue = ['use', 'restore', 'value-str', 'value-ldr', 'value-add'].includes(stage);
  const spRow = spAtOriginalAddress ? 'e000' : 'dff0';
  const accessibleStateByStage: Record<StackTowerStage, string> = {
    before: 'SP is at 0xE000. No temporary stack space is reserved.',
    reserve: 'SP is at 0xDFF0. Sixteen bytes are reserved and memory is unchanged.',
    use: 'SP is at 0xDFF0. The reserved memory contains 42.',
    restore: 'SP is back at 0xE000. The old 42 may remain in memory, but the temporary space is finished.',
    'value-mov': 'X0 contains 42. SP remains at 0xE000 and stack memory is unchanged.',
    'value-sub': 'SP moved to 0xDFF0. Sixteen bytes are reserved and memory is unchanged.',
    'value-str': 'SP is at 0xDFF0. The value 42 from X0 is stored in reserved stack memory.',
    'value-ldr': 'SP is at 0xDFF0. Stack memory still contains 42, and X1 has loaded that value.',
    'value-add': 'SP is back at 0xE000. The old 42 remains visible but the temporary stack space may be reused.',
  };

  return (
    <div className={`fcs-stack-tower fcs-stack-tower-${stage}`} role="img" aria-label={accessibleStateByStage[stage]}>
      <div className="fcs-stack-address-direction" aria-hidden="true">
        <span>Higher addresses</span><strong>↑</strong>
      </div>
      <div className="fcs-stack-tower-rows" aria-hidden="true">
        {STACK_TOWER_ROWS.map((row, index) => {
          const temporaryRow = index >= 3;
          const classes = [
            'fcs-stack-tower-row',
            hasReservedSpace && temporaryRow ? 'fcs-stack-row-reserved' : '',
            hasReleasedSpace && temporaryRow ? 'fcs-stack-row-released' : '',
            hasValue && row.id === 'dff0' ? 'fcs-stack-row-value' : '',
          ].filter(Boolean).join(' ');
          return (
            <div className={classes} key={row.id}>
              <code>{row.address || ' '}</code>
              <span className="fcs-stack-memory-cell">
                {hasValue && row.id === 'dff0' ? <strong>42</strong> : null}
              </span>
              <span className="fcs-stack-row-marker">
                {row.id === spRow ? <b>← SP</b> : null}
                {row.id === 'reserved-upper' && stage !== 'before' && stage !== 'value-mov' ? (
                  <em>{hasReleasedSpace ? 'space finished' : '16 bytes reserved'}</em>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
      <div className="fcs-stack-address-direction fcs-stack-address-direction-lower" aria-hidden="true">
        <strong>↓</strong><span>Lower addresses</span>
      </div>
    </div>
  );
}

function StackGrowthFourStagesScene() {
  const [activeStage, setActiveStage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return undefined;
    const updatePreference = () => {
      setPrefersReducedMotion(media.matches);
      if (media.matches) setIsPlaying(false);
    };
    updatePreference();
    media.addEventListener?.('change', updatePreference);
    return () => media.removeEventListener?.('change', updatePreference);
  }, []);

  useEffect(() => {
    if (!isPlaying) return undefined;
    if (activeStage >= STACK_GROWTH_STAGES.length - 1) {
      setIsPlaying(false);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      if (document.hidden) {
        setIsPlaying(false);
        return;
      }
      setActiveStage((stage) => Math.min(stage + 1, STACK_GROWTH_STAGES.length - 1));
    }, 1900);
    return () => window.clearTimeout(timer);
  }, [activeStage, isPlaying]);

  const chooseStage = (nextStage: number) => {
    setIsPlaying(false);
    setActiveStage(Math.max(0, Math.min(nextStage, STACK_GROWTH_STAGES.length - 1)));
  };

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (activeStage === STACK_GROWTH_STAGES.length - 1) setActiveStage(0);
    setIsPlaying(true);
  };

  const restart = () => {
    setActiveStage(0);
    setIsPlaying(!prefersReducedMotion);
  };

  return (
    <div
      className={`fcs-stack-growth ${isPlaying ? 'is-playing' : 'is-paused'}`}
      data-active-stage={activeStage + 1}
      data-testid="foundation-stack-growth-four-stages"
    >
      <div className="fcs-stack-growth-intro">
        <strong>The stack is ordinary memory.</strong>
        <span>SP is just one register containing the address where the current temporary stack space begins.</span>
      </div>

      <div className="fcs-stack-animation-bar">
        <div className="fcs-stack-animation-status" aria-live="polite" aria-atomic="true">
          <span>STAGE {activeStage + 1} OF {STACK_GROWTH_STAGES.length}</span>
          <strong>{STACK_GROWTH_STAGES[activeStage]?.label}</strong>
        </div>
        <div className="fcs-stack-stage-dots" aria-hidden="true">
          {STACK_GROWTH_STAGES.map((stage, index) => (
            <span className={index === activeStage ? 'is-current' : index < activeStage ? 'is-complete' : ''} key={stage.id} />
          ))}
        </div>
        <div className="fcs-stack-animation-controls" role="group" aria-label="Stack diagram animation controls">
          <button aria-label="Previous diagram stage" type="button" onClick={() => chooseStage(activeStage - 1)} disabled={activeStage === 0}>Previous</button>
          <button className="fcs-stack-play-control" type="button" onClick={togglePlayback}>
            {isPlaying ? 'Pause' : activeStage === STACK_GROWTH_STAGES.length - 1 ? 'Replay' : 'Play'}
          </button>
          <button aria-label="Next diagram stage" type="button" onClick={() => chooseStage(activeStage + 1)} disabled={activeStage === STACK_GROWTH_STAGES.length - 1}>Next</button>
          <button aria-label="Restart stack animation" type="button" onClick={restart}>Restart</button>
        </div>
      </div>

      <div className="fcs-stack-growth-panels">
        <article
          aria-current={activeStage === 0 ? 'step' : undefined}
          className={`fcs-stack-growth-panel ${activeStage === 0 ? 'is-active' : activeStage > 0 ? 'is-complete' : 'is-upcoming'}`}
        >
          <header><span>1</span><strong>Before</strong></header>
          <p className="fcs-stack-panel-lead">SP marks the current top.</p>
          <StackTower stage="before" />
          <div className="fcs-stack-panel-result"><strong>SP = 0xE000</strong></div>
        </article>

        <article
          aria-current={activeStage === 1 ? 'step' : undefined}
          className={`fcs-stack-growth-panel ${activeStage === 1 ? 'is-active' : activeStage > 1 ? 'is-complete' : 'is-upcoming'}`}
        >
          <header><span>2</span><strong>Allocate 16 bytes</strong></header>
          <code className="fcs-stack-panel-instruction"><b>sub</b> sp, sp, #16</code>
          <div className="fcs-stack-equation">0xE000 − 0x10 = 0xDFF0</div>
          <StackTower stage="reserve" />
          <div className="fcs-stack-panel-note"><strong>Only SP changed.</strong><span>Memory bytes did not change.</span></div>
        </article>

        <article
          aria-current={activeStage === 2 ? 'step' : undefined}
          className={`fcs-stack-growth-panel fcs-stack-growth-use ${activeStage === 2 ? 'is-active' : activeStage > 2 ? 'is-complete' : 'is-upcoming'}`}
        >
          <header><span>3</span><strong>Use the stack</strong></header>
          <div className="fcs-stack-use-instructions">
            <code><b>str</b> x0, [sp]</code>
            <code><b>ldr</b> x1, [sp]</code>
          </div>
          <div className="fcs-stack-register-chip"><span>X0</span><strong>42</strong></div>
          <div className="fcs-stack-data-arrow fcs-stack-data-arrow-store"><strong>STR</strong><span>↓</span></div>
          <StackTower stage="use" />
          <div className="fcs-stack-data-arrow fcs-stack-data-arrow-load"><span>↓</span><strong>LDR</strong></div>
          <div className="fcs-stack-register-chip"><span>X1</span><strong>42</strong></div>
          <div className="fcs-stack-panel-note"><span><b>STR</b> register → memory</span><span><b>LDR</b> memory → register</span></div>
        </article>

        <article
          aria-current={activeStage === 3 ? 'step' : undefined}
          className={`fcs-stack-growth-panel ${activeStage === 3 ? 'is-active' : 'is-upcoming'}`}
        >
          <header><span>4</span><strong>Restore</strong></header>
          <code className="fcs-stack-panel-instruction"><b>add</b> sp, sp, #16</code>
          <div className="fcs-stack-equation">0xDFF0 + 0x10 = 0xE000</div>
          <StackTower stage="restore" />
          <div className="fcs-stack-panel-note"><strong>The old 42 may remain.</strong><span>The program has finished using that temporary space.</span></div>
        </article>
      </div>

      <div className="fcs-stack-mental-model">
        <strong>MENTAL MODEL</strong>
        <div><span>Stack = memory</span><p>SP = an address</p></div>
        <b aria-hidden="true">→</b>
        <div><span>SUB reserves</span><p>STR / LDR use that space</p></div>
        <b aria-hidden="true">→</b>
        <div><span>ADD restores SP</span><p>old bytes are not erased</p></div>
      </div>
    </div>
  );
}

const STACK_STEPS = [
  {
    number: '1',
    id: 'value-mov',
    opcode: 'MOV',
    instruction: 'mov x0, 42',
    changed: 'X0: 0 → 42',
    unchanged: 'SP = E000 · memory unchanged',
  },
  {
    number: '2',
    id: 'value-sub',
    opcode: 'SUB',
    instruction: 'sub sp, sp, #16',
    changed: 'SP: E000 → DFF0',
    unchanged: '16 byte addresses DFF0–DFFF become usable · no bytes written',
  },
  {
    number: '3',
    id: 'value-str',
    opcode: 'STR',
    instruction: 'str x0, [sp]',
    changed: 'DFF0–DFF7 now hold the 8-byte value 42',
    unchanged: 'X0 = 42 · SP = DFF0',
  },
  {
    number: '4',
    id: 'value-ldr',
    opcode: 'LDR',
    instruction: 'ldr x1, [sp]',
    changed: 'X1: 0 → 42',
    unchanged: 'DFF0–DFF7 still hold 42 · SP = DFF0',
  },
  {
    number: '5',
    id: 'value-add',
    opcode: 'ADD',
    instruction: 'add sp, sp, #16',
    changed: 'SP: DFF0 → E000',
    unchanged: 'DFF0–DFF7 still hold 42 · they may now be reused',
  },
] as const;

function StackValueFiveStepsScene() {
  const [activeStage, setActiveStage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return undefined;
    const updatePreference = () => {
      setPrefersReducedMotion(media.matches);
      if (media.matches) setIsPlaying(false);
    };
    updatePreference();
    media.addEventListener?.('change', updatePreference);
    return () => media.removeEventListener?.('change', updatePreference);
  }, []);

  useEffect(() => {
    if (!isPlaying) return undefined;
    if (activeStage >= STACK_STEPS.length - 1) {
      setIsPlaying(false);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      if (document.hidden) {
        setIsPlaying(false);
        return;
      }
      setActiveStage((stage) => Math.min(stage + 1, STACK_STEPS.length - 1));
    }, 1900);
    return () => window.clearTimeout(timer);
  }, [activeStage, isPlaying]);

  const chooseStage = (nextStage: number) => {
    setIsPlaying(false);
    setActiveStage(Math.max(0, Math.min(nextStage, STACK_STEPS.length - 1)));
  };

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (activeStage === STACK_STEPS.length - 1) setActiveStage(0);
    setIsPlaying(true);
  };

  const restart = () => {
    setActiveStage(0);
    setIsPlaying(!prefersReducedMotion);
  };

  return (
    <div
      className={`fcs-stack fcs-stack-value ${isPlaying ? 'is-playing' : 'is-paused'}`}
      data-active-stage={activeStage + 1}
      data-testid="foundation-stack-value-five-steps"
    >
      <div className="fcs-stack-primer">
        <strong>Watch the value 42 move.</strong>
        <span>Each panel runs one instruction and names its main non-PC effect. The separate address, memory-cell, and marker columns keep every part of the stack easy to follow.</span>
      </div>

      <div className="fcs-stack-animation-bar fcs-stack-value-animation-bar">
        <div className="fcs-stack-animation-status" aria-live="polite" aria-atomic="true">
          <span>STEP {activeStage + 1} OF {STACK_STEPS.length}</span>
          <strong>{STACK_STEPS[activeStage]?.opcode}</strong>
        </div>
        <div className="fcs-stack-stage-dots" aria-hidden="true">
          {STACK_STEPS.map((step, index) => (
            <span className={index === activeStage ? 'is-current' : index < activeStage ? 'is-complete' : ''} key={step.id} />
          ))}
        </div>
        <div className="fcs-stack-animation-controls" role="group" aria-label="Stack values diagram animation controls">
          <button aria-label="Previous diagram stage" type="button" onClick={() => chooseStage(activeStage - 1)} disabled={activeStage === 0}>Previous</button>
          <button className="fcs-stack-play-control" type="button" onClick={togglePlayback}>
            {isPlaying ? 'Pause' : activeStage === STACK_STEPS.length - 1 ? 'Replay' : 'Play'}
          </button>
          <button aria-label="Next diagram stage" type="button" onClick={() => chooseStage(activeStage + 1)} disabled={activeStage === STACK_STEPS.length - 1}>Next</button>
          <button aria-label="Restart stack values animation" type="button" onClick={restart}>Restart</button>
        </div>
      </div>

      <div className="fcs-stack-steps">
        {STACK_STEPS.map((step, index) => (
          <article
            aria-current={activeStage === index ? 'step' : undefined}
            className={`fcs-stack-step fcs-stack-${step.opcode.toLowerCase()} ${activeStage === index ? 'is-active' : activeStage > index ? 'is-complete' : 'is-upcoming'}`}
            key={step.number}
          >
            <header><span>{step.number}</span><strong>{step.opcode}</strong></header>
            <code className="fcs-stack-panel-instruction"><b>{step.opcode.toLowerCase()}</b>{step.instruction.slice(step.opcode.length)}</code>

            {step.id === 'value-mov' && (
              <div className="fcs-stack-value-register-state"><span>X0</span><strong>0 → 42</strong></div>
            )}
            {step.id === 'value-sub' && <div className="fcs-stack-equation">0xE000 − 0x10 = 0xDFF0</div>}
            {step.id === 'value-str' && (
              <>
                <div className="fcs-stack-register-chip"><span>X0</span><strong>42</strong></div>
                <div className="fcs-stack-data-arrow"><strong>STR</strong><span>↓</span></div>
              </>
            )}

            <StackTower stage={step.id} />

            {step.id === 'value-ldr' && (
              <>
                <div className="fcs-stack-data-arrow fcs-stack-data-arrow-load"><span>↓</span><strong>LDR</strong></div>
                <div className="fcs-stack-register-chip"><span>X1</span><strong>42</strong></div>
              </>
            )}
            {step.id === 'value-add' && <div className="fcs-stack-equation">0xDFF0 + 0x10 = 0xE000</div>}

            <div className="fcs-stack-change"><small>MAIN CHANGE</small><strong>{step.changed}</strong></div>
            <p>{step.unchanged}</p>
          </article>
        ))}
      </div>

      <div className="fcs-stack-mental-model fcs-stack-value-summary">
        <strong>FINAL STATE</strong>
        <div><span>X0 = 42 · X1 = 42</span><p>Both registers contain the value.</p></div>
        <b aria-hidden="true">→</b>
        <div><span>SP = 0x7FFFFFFFE000</span><p>The short diagrams show its ending as 0xE000.</p></div>
        <b aria-hidden="true">→</b>
        <div><span>42 remains here</span><p>0x…DFF0–DFF7 still holds 42; 0x…DFF8–DFFF may be reused too.</p></div>
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
    case 'stack-growth-four-stages':
      return <StackGrowthFourStagesScene />;
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
