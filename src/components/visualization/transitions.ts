import type { CPUSnapshot, FlagName } from '../../arm64/cpu';
import type { ParsedInstruction } from '../../arm64/parser';
import {
  X_REGISTER_NAMES,
  type RegisterName,
} from '../../arm64/registers';
import type { VisualizationTransition } from './DynamicVisualizer';

export interface SnapshotChanges {
  registers: RegisterName[];
  flags: FlagName[];
  memory: bigint[];
}

/** Compare two immutable CPU snapshots without introducing presentation-only CPU state. */
export function diffSnapshots(before: CPUSnapshot, after: CPUSnapshot): SnapshotChanges {
  const registerNames = [...X_REGISTER_NAMES, 'sp', 'pc'] as RegisterName[];
  const flagNames: FlagName[] = ['N', 'Z', 'C', 'V'];
  const addresses = new Set([...before.memory.keys(), ...after.memory.keys()]);

  return {
    registers: registerNames.filter((name) => before.registers[name] !== after.registers[name]),
    flags: flagNames.filter((name) => before.flags[name] !== after.flags[name]),
    memory: [...addresses].filter((address) => (
      before.memory.get(address) !== after.memory.get(address)
      || before.memory.has(address) !== after.memory.has(address)
    )),
  };
}

export function createVisualizationTransition(
  before: CPUSnapshot,
  after: CPUSnapshot,
  instruction: ParsedInstruction | null,
  direction: VisualizationTransition['direction'],
  explicitChanges?: Partial<SnapshotChanges>,
): VisualizationTransition {
  const differences = diffSnapshots(before, after);
  return {
    before,
    after,
    instruction,
    direction,
    changedRegisters: explicitChanges?.registers ?? differences.registers,
    changedFlags: explicitChanges?.flags ?? differences.flags,
    changedMemory: explicitChanges?.memory ?? differences.memory,
  };
}
