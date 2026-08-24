import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ARM64CPU, AssemblyParseError } from './arm64/interpreter';
import type { FlagName } from './arm64/cpu';
import type { RegisterName } from './arm64/registers';
import { AssemblyEditor } from './components/AssemblyEditor';
import { Controls } from './components/Controls';
import { ExplanationPanel } from './components/ExplanationPanel';
import { RegisterPanel, type NumberFormat } from './components/RegisterPanel';
import { MemoryViewer } from './components/MemoryViewer';
import type { MemoryNavigationRequest } from './components/MemoryViewer';
import { StackViewer } from './components/StackViewer';
import { CallStackPanel } from './components/CallStackPanel';
import { SyscallPanel } from './components/SyscallPanel';
import { Terminal } from './components/Terminal';
import { CheatSheet } from './components/CheatSheet';
import { SiteHeader } from './components/SiteHeader';
import { DynamicVisualizer } from './components/visualization/DynamicVisualizer';
import { createVisualizationTransition, diffSnapshots } from './components/visualization/transitions';
import { BEGINNER_EXAMPLES, DEFAULT_SOURCE } from './examples/examples';
import type { AppTheme } from './theme';

export interface LabTransfer {
  program: string;
  returnTo: string;
  returnLabel: string;
}

interface LabPageProps {
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  transfer?: LabTransfer;
}

function App({ theme, onThemeChange, transfer }: LabPageProps) {
  const initialSource = transfer?.program ?? DEFAULT_SOURCE;
  const cpu = useMemo(() => {
    const instance = new ARM64CPU();
    instance.loadProgram(initialSource);
    return instance;
  }, [initialSource]);
  const initialSnapshot = useMemo(() => cpu.snapshot(), [cpu]);

  const [source, setSource] = useState(initialSource);
  const [sourceDirty, setSourceDirty] = useState(false);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [visualTransition, setVisualTransition] = useState(() => (
    createVisualizationTransition(initialSnapshot, initialSnapshot, null, 'reset')
  ));
  const [changedRegisters, setChangedRegisters] = useState<ReadonlySet<RegisterName>>(new Set());
  const [changedFlags, setChangedFlags] = useState<ReadonlySet<FlagName>>(new Set());
  const [changedMemory, setChangedMemory] = useState<readonly bigint[]>([]);
  const [lastInstruction, setLastInstruction] = useState<string | null>(null);
  const [memoryNavigation, setMemoryNavigation] = useState<MemoryNavigationRequest | null>(null);
  const [numberFormat, setNumberFormat] = useState<NumberFormat>('hex');
  const [error, setError] = useState<string | null>(null);
  const [errorLine, setErrorLine] = useState<number | null>(null);

  const loadSource = useCallback((): boolean => {
    try {
      cpu.loadProgram(source);
      setSourceDirty(false);
      setError(null);
      setErrorLine(null);
      return true;
    } catch (caught) {
      const parseError = caught as Error;
      setError(parseError.message);
      setErrorLine(caught instanceof AssemblyParseError ? caught.line : null);
      return false;
    }
  }, [cpu, source]);

  const step = useCallback(() => {
    if (sourceDirty && !loadSource()) return;
    const before = cpu.snapshot();
    const result = cpu.step();
    const after = cpu.snapshot();
    setChangedRegisters(new Set(result.changedRegisters));
    setChangedFlags(new Set(result.changedFlags));
    setChangedMemory(result.changedMemory);
    setLastInstruction(result.executed?.sourceText ?? null);
    setError(null);
    setErrorLine(null);
    setSnapshot(after);
    setVisualTransition(createVisualizationTransition(before, after, result.executed, 'forward', {
      registers: result.changedRegisters,
      flags: result.changedFlags,
      memory: result.changedMemory,
    }));
  }, [cpu, loadSource, sourceDirty]);

  const run = useCallback(() => {
    if (sourceDirty && !loadSource()) return;
    const before = cpu.snapshot();
    let finalInstruction: string | null = null;
    let finalParsedInstruction = null as ReturnType<typeof cpu.step>['executed'];
    let steps = 0;
    while (!cpu.halted && steps < 10_000) {
      const result = cpu.step();
      finalInstruction = result.executed?.sourceText ?? finalInstruction;
      finalParsedInstruction = result.executed ?? finalParsedInstruction;
      steps += 1;
    }
    setLastInstruction(finalInstruction);
    setError(steps >= 10_000 && !cpu.halted ? 'Run paused after 10,000 steps. The program may contain a loop.' : null);
    setErrorLine(null);
    const after = cpu.snapshot();
    // Run visualizations compare the complete before/after snapshots. This
    // intentionally shows the Run's net memory result instead of pretending
    // the endpoint snapshots surround only the final instruction.
    const netChanges = diffSnapshots(before, after);
    setChangedRegisters(new Set(netChanges.registers));
    setChangedFlags(new Set(netChanges.flags));
    setChangedMemory(netChanges.memory);
    setSnapshot(after);
    setVisualTransition(createVisualizationTransition(before, after, finalParsedInstruction, 'run'));
  }, [cpu, loadSource, sourceDirty]);

  const reset = useCallback(() => {
    const before = cpu.snapshot();
    if (!loadSource()) return;
    setChangedRegisters(new Set());
    setChangedFlags(new Set());
    setChangedMemory([]);
    setLastInstruction(null);
    const after = cpu.snapshot();
    setSnapshot(after);
    setVisualTransition(createVisualizationTransition(before, after, null, 'reset'));
  }, [cpu, loadSource]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F10') {
        event.preventDefault();
        step();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step]);

  const chooseExample = (id: string) => {
    const example = BEGINNER_EXAMPLES.find((item) => item.id === id);
    if (!example) return;
    setSource(example.source);
    try {
      const before = cpu.snapshot();
      cpu.loadProgram(example.source);
      setSourceDirty(false);
      setError(null);
      setErrorLine(null);
      setChangedRegisters(new Set());
      setChangedFlags(new Set());
      setChangedMemory([]);
      setLastInstruction(null);
      const after = cpu.snapshot();
      setSnapshot(after);
      setVisualTransition(createVisualizationTransition(before, after, null, 'reset'));
    } catch {
      // Built-in examples are covered by the parser tests and are always valid.
    }
  };

  const stepBack = useCallback(() => {
    if (sourceDirty) return;
    const before = cpu.snapshot();
    if (!cpu.stepBack()) return;
    const after = cpu.snapshot();
    const changes = diffSnapshots(before, after);
    const restoredInstruction = cpu.currentInstruction;
    setChangedRegisters(new Set(changes.registers));
    setChangedFlags(new Set(changes.flags));
    setChangedMemory(changes.memory);
    setLastInstruction(null);
    setError(null);
    setErrorLine(null);
    setSnapshot(after);
    setVisualTransition(createVisualizationTransition(before, after, restoredInstruction, 'back', changes));
  }, [cpu, sourceDirty]);

  const currentLine = sourceDirty ? null : cpu.currentInstruction?.sourceLine ?? null;
  const canStep = sourceDirty || !snapshot.halted;
  const describePointer = (value: bigint, name: RegisterName): string | null =>
    name === 'sp' ? 'stack memory' : cpu.describeAddress(value);
  const navigateToPointer = (address: bigint) => {
    setMemoryNavigation((current) => ({
      address,
      sequence: (current?.sequence ?? 0) + 1,
    }));
  };

  return (
    <div className={`app-shell ${transfer ? 'with-return-link' : ''}`}>
      <SiteHeader
        theme={theme}
        onThemeChange={onThemeChange}
        actions={(
          <>
            <label className="example-picker">
              <span>Example</span>
              <select
                value={BEGINNER_EXAMPLES.find((item) => item.source === source)?.id ?? ''}
                onChange={(event) => chooseExample(event.target.value)}
                aria-label="Simulator example"
              >
                <option value="" disabled>Custom program</option>
                {BEGINNER_EXAMPLES.map((example) => (
                  <option value={example.id} key={example.id}>{example.name}</option>
                ))}
              </select>
            </label>
            <div className="build-badge"><i /> LEARNING LAB</div>
          </>
        )}
      />

      {transfer && (
        <div className="lab-return-bar">
          <Link to={transfer.returnTo}>← Return to {transfer.returnLabel}</Link>
          <span>Lesson program loaded. Press Step when you are ready.</span>
        </div>
      )}

      <main className="workspace">
        <AssemblyEditor
          source={source}
          currentLine={currentLine}
          errorLine={errorLine}
          sourceDirty={sourceDirty}
          onChange={(nextSource) => {
            setSource(nextSource);
            setSourceDirty(true);
            setChangedRegisters(new Set());
            setChangedFlags(new Set());
            setChangedMemory([]);
            setLastInstruction(null);
            setError(null);
            setErrorLine(null);
          }}
        />
        <RegisterPanel
          registers={snapshot.registers}
          changedRegisters={changedRegisters}
          numberFormat={numberFormat}
          onNumberFormatChange={setNumberFormat}
          describePointer={describePointer}
          onPointerNavigate={navigateToPointer}
          flags={snapshot.flags}
          changedFlags={changedFlags}
        />

        <div className="memory-deck panel">
          <StackViewer
            sp={snapshot.registers.sp}
            memory={snapshot.memory}
            changedMemory={changedMemory}
          />
          <MemoryViewer
            memory={snapshot.memory}
            changedMemory={changedMemory}
            changeDirection={visualTransition.direction}
            instructionOpcode={visualTransition.instruction?.opcode}
            suggestedAddress={snapshot.registers.sp}
            navigationRequest={memoryNavigation}
            dataSegments={cpu.program.data}
          />
        </div>

        <aside className="learning-sidebar panel">
          {sourceDirty && (
            <p className="source-state-warning" role="status">
              <strong>Source changed.</strong> The state below belongs to the previously loaded program.
              Step, Run, or Reset starts the edited source from a fresh state.
            </p>
          )}
          <DynamicVisualizer
            compact
            transition={visualTransition}
            describeAddress={(address, name) => describePointer(address, name ?? 'x0')}
          />
          <CallStackPanel frames={snapshot.callStack} />
          <SyscallPanel syscall={snapshot.lastSyscall} describeAddress={(address) => cpu.describeAddress(address)} />
          <Terminal
            output={snapshot.terminalOutput}
            exited={snapshot.exited}
            exitCode={snapshot.exitCode}
            halted={snapshot.halted}
          />
          <CheatSheet />
        </aside>

        <ExplanationPanel
          instruction={lastInstruction}
          explanation={sourceDirty
            ? 'Source changed. Step, Run, or Reset reloads the edited program from the beginning.'
            : snapshot.lastExplanation}
          error={error}
          nextInstruction={sourceDirty ? null : cpu.currentInstruction?.sourceText ?? null}
        />
      </main>

      <Controls
        halted={snapshot.halted && !sourceDirty}
        sourceDirty={sourceDirty}
        canStep={canStep}
        canStepBack={!sourceDirty && snapshot.historyDepth > 0}
        onStep={step}
        onStepBack={stepBack}
        onRun={run}
        onReset={reset}
      />
    </div>
  );
}

export default App;
