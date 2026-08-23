import { useMemo, useState } from 'react';
import { ARM64CPU } from '../../arm64/interpreter';
import type { ParsedInstruction } from '../../arm64/parser';
import { formatHex } from '../../arm64/registers';
import { DynamicVisualizer } from '../visualization/DynamicVisualizer';
import { createVisualizationTransition, diffSnapshots } from '../visualization/transitions';

interface LiveLessonDemoProps {
  program: string;
  title: string;
}

export function LiveLessonDemo({ program, title }: LiveLessonDemoProps) {
  const cpu = useMemo(() => {
    const instance = new ARM64CPU();
    instance.loadProgram(program);
    return instance;
  }, [program]);
  const initialSnapshot = useMemo(() => cpu.snapshot(), [cpu]);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [transition, setTransition] = useState(() => (
    createVisualizationTransition(initialSnapshot, initialSnapshot, null, 'reset')
  ));

  const step = () => {
    const before = cpu.snapshot();
    const result = cpu.step();
    const after = cpu.snapshot();
    setSnapshot(after);
    setTransition(createVisualizationTransition(before, after, result.executed, 'forward', {
      registers: result.changedRegisters,
      flags: result.changedFlags,
      memory: result.changedMemory,
    }));
  };

  const run = () => {
    const before = cpu.snapshot();
    let finalInstruction: ParsedInstruction | null = null;
    let steps = 0;
    while (!cpu.halted && steps < 200) {
      finalInstruction = cpu.step().executed ?? finalInstruction;
      steps += 1;
    }
    const after = cpu.snapshot();
    setSnapshot(after);
    setTransition(createVisualizationTransition(before, after, finalInstruction, 'run'));
  };

  const previous = () => {
    const before = cpu.snapshot();
    if (!cpu.stepBack()) return;
    const after = cpu.snapshot();
    const changes = diffSnapshots(before, after);
    setSnapshot(after);
    setTransition(createVisualizationTransition(before, after, cpu.currentInstruction, 'back', changes));
  };

  const reset = () => {
    const before = cpu.snapshot();
    cpu.reset();
    const after = cpu.snapshot();
    setSnapshot(after);
    setTransition(createVisualizationTransition(before, after, null, 'reset'));
  };

  const currentLine = cpu.currentInstruction?.sourceLine ?? null;
  const headingId = `live-demo-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

  return (
    <section className="live-lesson-demo" aria-labelledby={headingId}>
      <header className="live-demo-heading">
        <div>
          <span className="eyebrow">WATCH THE REAL CPU STATE</span>
          <h3 id={headingId}>Step through this lesson</h3>
          <p>The diagram below is generated from the same ARM64 engine used by the full Lab.</p>
        </div>
        <div className="live-demo-status">
          <span>{snapshot.halted ? 'Complete' : 'Ready'}</span>
          <code>PC {formatHex(snapshot.registers.pc)}</code>
        </div>
      </header>

      <div className="live-demo-console">
        <pre className="live-demo-source" aria-label={`${title} interactive assembly`}>
          <code>
            {program.split('\n').map((line, index) => {
              const sourceLine = index + 1;
              const active = sourceLine === currentLine;
              return (
                <span className={`live-demo-line ${active ? 'active' : ''}`} aria-current={active ? 'step' : undefined} key={`${sourceLine}-${line}`}>
                  <span aria-hidden="true">{active ? '▶' : sourceLine}</span>
                  <span>{line || ' '}</span>
                </span>
              );
            })}
          </code>
        </pre>
        <div className="live-demo-controls" aria-label="Embedded simulator controls">
          <button className="button button-primary" type="button" onClick={step} disabled={snapshot.halted}>Step</button>
          <button className="button button-secondary" type="button" onClick={run} disabled={snapshot.halted}>Run</button>
          <button className="button" type="button" onClick={previous} disabled={snapshot.historyDepth === 0}>Previous</button>
          <button className="button button-ghost" type="button" onClick={reset}>Reset</button>
        </div>
      </div>

      <DynamicVisualizer
        transition={transition}
        describeAddress={(address) => cpu.describeAddress(address)}
      />
    </section>
  );
}
