export const X_REGISTER_NAMES = [
  'x0', 'x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7',
  'x8', 'x9', 'x10', 'x11', 'x12', 'x13', 'x14', 'x15',
  'x16', 'x17', 'x18', 'x19', 'x20', 'x21', 'x22', 'x23',
  'x24', 'x25', 'x26', 'x27', 'x28', 'x29', 'x30',
] as const;

export const W_REGISTER_NAMES = [
  'w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7',
  'w8', 'w9', 'w10', 'w11', 'w12', 'w13', 'w14', 'w15',
  'w16', 'w17', 'w18', 'w19', 'w20', 'w21', 'w22', 'w23',
  'w24', 'w25', 'w26', 'w27', 'w28', 'w29', 'w30',
] as const;

export type XRegisterName = (typeof X_REGISTER_NAMES)[number];
export type WRegisterName = (typeof W_REGISTER_NAMES)[number];
export type SpecialRegisterName = 'sp' | 'pc';
export type OperandRegisterName = XRegisterName | WRegisterName | SpecialRegisterName;
export type RegisterName = XRegisterName | SpecialRegisterName;
export type RegisterState = Record<RegisterName, bigint>;

export const MASK_64 = (1n << 64n) - 1n;
export const MASK_32 = (1n << 32n) - 1n;
export const STACK_TOP = 0x7fff_ffff_e000n;

export function createRegisterState(): RegisterState {
  const registers = Object.fromEntries(
    [...X_REGISTER_NAMES, 'sp', 'pc'].map((name) => [name, 0n]),
  ) as RegisterState;

  return registers;
}

export function isRegisterName(value: string): value is OperandRegisterName {
  return value === 'sp' || value === 'pc' || /^[xw](?:[0-9]|[12][0-9]|30)$/.test(value);
}

export function canonicalRegisterName(name: OperandRegisterName): RegisterName {
  return name.startsWith('w') ? (`x${name.slice(1)}` as XRegisterName) : name as RegisterName;
}

export function readRegister(registers: RegisterState, name: OperandRegisterName): bigint {
  const value = registers[canonicalRegisterName(name)];
  return name.startsWith('w') ? value & MASK_32 : value;
}

/** Writing a W register zero-extends its value into the corresponding X register. */
export function writeRegister(
  registers: RegisterState,
  name: OperandRegisterName,
  value: bigint,
): RegisterName {
  const canonical = canonicalRegisterName(name);
  registers[canonical] = value & (name.startsWith('w') ? MASK_32 : MASK_64);
  return canonical;
}

export function cloneRegisters(registers: RegisterState): RegisterState {
  return { ...registers };
}

export function formatHex(value: bigint, bits = 64): string {
  const width = bits / 4;
  const mask = bits === 64 ? MASK_64 : (1n << BigInt(bits)) - 1n;
  return `0x${(value & mask).toString(16).toUpperCase().padStart(width, '0')}`;
}
