import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { BEGINNER_EXAMPLES, DEFAULT_SOURCE } from './examples/examples';

function App() {
  const cpu = useMemo(() => {
    const instance = new ARM64CPU();
    instance.loadProgram(DEFAULT_SOURCE);
    return instance;
  }, []);

  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [sourceDirty, setSourceDirty] = useState(false);
  const [snapshot, setSnapshot] = useState(() => cpu.snapshot());
  const [changedRegisters, setChangedRegisters] = useState<ReadonlySet<RegisterName>>(new Set());
  const [changedFlags, setChangedFlags] = useState<ReadonlySet<FlagName>>(new Set());
  const [changedMemory, setChangedMemory] = useState<readonly bigint[]>([]);
  const [lastInstruction, setLastInstruction] = useState<string | null>(null);
  const [memoryNavigation, setMemoryNavigation] = useState<MemoryNavigationRequest | null>(null);
  const [numberFormat, setNumberFormat] = useState<NumberFormat>('hex');
  const [theme, setTheme] = useState<'debugger' | 'monochrome' | 'cyberpunk'>(() => {
    const saved = localStorage.getItem('arm64-simulator-theme');
    return saved === 'monochrome' || saved === 'cyberpunk' ? saved : 'debugger';
  });
  const [error, setError] = useState<string | null>(null);
  const [errorLine, setErrorLine] = useState<number | null>(null);

  const refresh = useCallback(() => setSnapshot(cpu.snapshot()), [cpu]);

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
    const result = cpu.step();
    setChangedRegisters(new Set(result.changedRegisters));
    setChangedFlags(new Set(result.changedFlags));
    setChangedMemory(result.changedMemory);
    setLastInstruction(result.executed?.sourceText ?? null);
    setError(null);
    setErrorLine(null);
    refresh();
  }, [cpu, loadSource, refresh, sourceDirty]);

  const run = useCallback(() => {
    if (sourceDirty && !loadSource()) return;
    const allChanges = new Set<RegisterName>();
    const allFlagChanges = new Set<FlagName>();
    const allMemoryChanges = new Set<bigint>();
    let finalInstruction: string | null = null;
    let steps = 0;
    while (!cpu.halted && steps < 10_000) {
      const result = cpu.step();
      result.changedRegisters.forEach((name) => allChanges.add(name));
      result.changedFlags.forEach((name) => allFlagChanges.add(name));
      result.changedMemory.forEach((address) => allMemoryChanges.add(address));
      finalInstruction = result.executed?.sourceText ?? finalInstruction;
      steps += 1;
    }
    setChangedRegisters(allChanges);
    setChangedFlags(allFlagChanges);
    setChangedMemory([...allMemoryChanges]);
    setLastInstruction(finalInstruction);
    setError(steps >= 10_000 && !cpu.halted ? 'Run paused after 10,000 steps. The program may contain a loop.' : null);
    setErrorLine(null);
    refresh();
  }, [cpu, loadSource, refresh, sourceDirty]);

  const reset = useCallback(() => {
    if (!loadSource()) return;
    setChangedRegisters(new Set());
    setChangedFlags(new Set());
    setChangedMemory([]);
    setLastInstruction(null);
    refresh();
  }, [loadSource, refresh]);

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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('arm64-simulator-theme', theme);
  }, [theme]);

  const chooseExample = (id: string) => {
    const example = BEGINNER_EXAMPLES.find((item) => item.id === id);
    if (!example) return;
    setSource(example.source);
    try {
      cpu.loadProgram(example.source);
      setSourceDirty(false);
      setError(null);
      setErrorLine(null);
      setChangedRegisters(new Set());
      setChangedFlags(new Set());
      setChangedMemory([]);
      setLastInstruction(null);
      refresh();
    } catch {
      // Built-in examples are covered by the parser tests and are always valid.
    }
  };

  const stepBack = useCallback(() => {
    if (sourceDirty) return;
    const before = cpu.snapshot();
    if (!cpu.stepBack()) return;
    const after = cpu.snapshot();
    const registerChanges = (Object.keys(after.registers) as RegisterName[])
      .filter((name) => before.registers[name] !== after.registers[name]);
    const flagChanges = (Object.keys(after.flags) as FlagName[])
      .filter((name) => before.flags[name] !== after.flags[name]);
    const addresses = new Set([...before.memory.keys(), ...after.memory.keys()]);
    const memoryChanges = [...addresses].filter((address) =>
      before.memory.get(address) !== after.memory.get(address) || before.memory.has(address) !== after.memory.has(address));
    setChangedRegisters(new Set(registerChanges));
    setChangedFlags(new Set(flagChanges));
    setChangedMemory(memoryChanges);
    setLastInstruction(null);
    setError(null);
    setErrorLine(null);
    setSnapshot(after);
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
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">A64</div>
          <div>
            <h1>A64 Lab</h1>
            <span>Learn AArch64 by watching state change</span>
          </div>
        </div>
        <label className="example-picker">
          <span>Example</span>
          <select
            value={BEGINNER_EXAMPLES.find((item) => item.source === source)?.id ?? ''}
            onChange={(event) => chooseExample(event.target.value)}
          >
            <option value="" disabled>Custom program</option>
            {BEGINNER_EXAMPLES.map((example) => (
              <option value={example.id} key={example.id}>{example.name}</option>
            ))}
          </select>
        </label>
        <label className="example-picker theme-picker">
          <span>Theme</span>
          <select
            value={theme}
            onChange={(event) => setTheme(event.target.value as typeof theme)}
          >
            <option value="debugger">Debugger</option>
            <option value="monochrome">Black / White</option>
            <option value="cyberpunk">Cyberpunk</option>
          </select>
        </label>
        <div className="build-badge"><i /> ALL PHASES</div>
      </header>

      <main className="workspace">
        <AssemblyEditor
          source={source}
          currentLine={currentLine}
          errorLine={errorLine}
          onChange={(nextSource) => {
            setSource(nextSource);
            setSourceDirty(true);
            setChangedRegisters(new Set());
            setChangedFlags(new Set());
            setChangedMemory([]);
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
            suggestedAddress={snapshot.registers.sp}
            navigationRequest={memoryNavigation}
            dataSegments={cpu.program.data}
          />
        </div>

        <aside className="learning-sidebar panel">
          <CallStackPanel frames={snapshot.callStack} />
          <SyscallPanel syscall={snapshot.lastSyscall} describeAddress={(address) => cpu.describeAddress(address)} />
          <Terminal output={snapshot.terminalOutput} exited={snapshot.exited} exitCode={snapshot.exitCode} />
          <CheatSheet />
        </aside>

        <ExplanationPanel
          instruction={lastInstruction}
          explanation={snapshot.lastExplanation}
          error={error}
          nextInstruction={sourceDirty ? null : cpu.currentInstruction?.sourceText ?? null}
        />
      </main>

      <Controls
        halted={snapshot.halted && !sourceDirty}
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
