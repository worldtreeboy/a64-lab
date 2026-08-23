import { isRegisterName, type OperandRegisterName } from './registers';

export type Opcode =
  | 'mov' | 'add' | 'sub'
  | 'ldr' | 'str' | 'ldrb' | 'strb' | 'ldp' | 'stp'
  | 'cmp' | 'tst'
  | 'b' | 'bl' | 'br' | 'blr' | 'ret'
  | 'b.eq' | 'b.ne' | 'b.gt' | 'b.lt' | 'b.ge' | 'b.le'
  | 'svc';

export type Section = 'text' | 'data';

export interface Symbol {
  name: string;
  section: Section;
  address: bigint;
  sourceLine: number;
}

export interface RegisterOperand {
  kind: 'register';
  name: OperandRegisterName;
}

export interface ImmediateOperand {
  kind: 'immediate';
  value: bigint;
}

export interface MemoryOperand {
  kind: 'memory';
  base: OperandRegisterName;
  offset: bigint;
  writeback: 'none' | 'pre' | 'post';
}

export interface LabelOperand {
  kind: 'label';
  name: string;
}

export interface LiteralLabelOperand {
  kind: 'literal-label';
  name: string;
}

export type Operand = RegisterOperand | ImmediateOperand | MemoryOperand | LabelOperand | LiteralLabelOperand;

export interface ParsedData {
  label: string | null;
  labels: string[];
  address: bigint;
  bytes: Uint8Array;
  directive: 'ascii' | 'asciz';
  sourceLine: number;
  sourceText: string;
}

export interface ParsedInstruction {
  opcode: Opcode;
  operands: Operand[];
  sourceLine: number;
  sourceText: string;
  address: bigint;
}

export interface ParsedProgram {
  source: string;
  instructions: ParsedInstruction[];
  labels: Map<string, bigint>;
  symbols: Map<string, Symbol>;
  codeLabels: Set<string>;
  data: ParsedData[];
  entryPoint: bigint;
}

export class AssemblyParseError extends Error {
  constructor(
    message: string,
    public readonly line: number,
  ) {
    super(`Line ${line}: ${message}`);
    this.name = 'AssemblyParseError';
  }
}

const SUPPORTED_OPCODES: Opcode[] = [
  'mov', 'add', 'sub', 'ldr', 'str', 'ldrb', 'strb', 'ldp', 'stp',
  'cmp', 'tst', 'b', 'bl', 'br', 'blr', 'ret',
  'b.eq', 'b.ne', 'b.gt', 'b.lt', 'b.ge', 'b.le',
  'svc',
];

const LABEL_PATTERN = /^[a-z_.$][\w.$]*$/i;
export const TEXT_BASE = 0n;
export const DATA_BASE = 0x400000n;

function stripComments(line: string): string {
  let inString = false;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\' && inString) {
      escaped = true;
      continue;
    }
    if (character === '"') inString = !inString;
    if (!inString && (character === ';' || (character === '/' && line[index + 1] === '/'))) {
      return line.slice(0, index).trim();
    }
  }
  return line.trim();
}

function parseImmediate(token: string, line: number): bigint {
  const immediate = token.trim().toLowerCase().replace(/^#/, '');
  if (!/^-?(?:0x[\da-f]+|\d+)$/i.test(immediate)) {
    throw new AssemblyParseError(`Invalid immediate "${token.trim()}"`, line);
  }
  if (immediate.startsWith('-0x')) return -BigInt(`0x${immediate.slice(3)}`);
  return BigInt(immediate);
}

function parseSimpleOperand(
  token: string,
  line: number,
): RegisterOperand | ImmediateOperand | LabelOperand | LiteralLabelOperand {
  const normalized = token.trim().toLowerCase();
  if (isRegisterName(normalized)) return { kind: 'register', name: normalized };
  if (normalized.startsWith('=') && LABEL_PATTERN.test(normalized.slice(1))) {
    return { kind: 'literal-label', name: normalized.slice(1) };
  }
  if (/^#?-?(?:0x[\da-f]+|\d+)$/i.test(normalized)) {
    return { kind: 'immediate', value: parseImmediate(normalized, line) };
  }
  if (LABEL_PATTERN.test(normalized)) return { kind: 'label', name: normalized };
  throw new AssemblyParseError(`Unknown operand "${token.trim()}"`, line);
}

function parseMemoryOperand(token: string, line: number): MemoryOperand {
  const match = token.trim().toLowerCase().match(
    /^\[\s*([xw](?:[0-9]|[12][0-9]|30)|sp|pc)\s*(?:,\s*(#[^\]]+))?\s*\](!)?$/,
  );
  if (!match || !isRegisterName(match[1])) {
    throw new AssemblyParseError(`Invalid memory address "${token.trim()}"`, line);
  }
  if (match[1].startsWith('w') || match[1] === 'pc') {
    throw new AssemblyParseError('Memory base must be an X register or SP', line);
  }
  return {
    kind: 'memory',
    base: match[1],
    offset: match[2] ? parseImmediate(match[2], line) : 0n,
    writeback: match[3] ? 'pre' : 'none',
  };
}

function splitOperands(source: string): string[] {
  const result: string[] = [];
  let start = 0;
  let bracketDepth = 0;
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '[') bracketDepth += 1;
    if (source[index] === ']') bracketDepth -= 1;
    if (source[index] === ',' && bracketDepth === 0) {
      result.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }
  const final = source.slice(start).trim();
  if (final) result.push(final);
  return result;
}

function parseOperands(source: string, line: number): Operand[] {
  const tokens = splitOperands(source);
  const operands: Operand[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.startsWith('[')) {
      const memory = parseMemoryOperand(token, line);
      const next = tokens[index + 1];
      if (memory.writeback === 'none' && next?.trim().startsWith('#')) {
        memory.writeback = 'post';
        memory.offset = parseImmediate(next, line);
        index += 1;
      }
      operands.push(memory);
    } else {
      operands.push(parseSimpleOperand(token, line));
    }
  }
  return operands;
}

function expectRegister(operand: Operand | undefined, message: string, line: number): void {
  if (operand?.kind !== 'register') throw new AssemblyParseError(message, line);
}

function expectMemory(operand: Operand | undefined, line: number): void {
  if (operand?.kind !== 'memory') throw new AssemblyParseError('Expected a memory operand', line);
}

function expectLabel(operand: Operand | undefined, line: number): void {
  if (operand?.kind !== 'label') throw new AssemblyParseError('Expected a code label', line);
}

function validateInstruction(opcode: Opcode, operands: Operand[], line: number): void {
  if (opcode === 'svc') {
    if (operands.length !== 1 || operands[0]?.kind !== 'immediate') {
      throw new AssemblyParseError('SVC expects one immediate operand', line);
    }
    return;
  }
  if (opcode === 'ret') {
    if (operands.length !== 0) throw new AssemblyParseError('RET does not take operands in this simulator', line);
    return;
  }
  if (opcode === 'b' || opcode === 'bl' || opcode.startsWith('b.')) {
    if (operands.length !== 1) throw new AssemblyParseError(`${opcode.toUpperCase()} expects 1 operand`, line);
    expectLabel(operands[0], line);
    return;
  }
  if (opcode === 'br' || opcode === 'blr') {
    if (operands.length !== 1) throw new AssemblyParseError(`${opcode.toUpperCase()} expects 1 operand`, line);
    expectRegister(operands[0], 'Branch target must be a register', line);
    return;
  }
  if (opcode === 'cmp' || opcode === 'tst') {
    if (operands.length !== 2) throw new AssemblyParseError(`${opcode.toUpperCase()} expects 2 operands`, line);
    expectRegister(operands[0], 'First comparison operand must be a register', line);
    if (operands[1]?.kind === 'memory' || operands[1]?.kind === 'label' || operands[1]?.kind === 'literal-label') {
      throw new AssemblyParseError('Invalid comparison operand', line);
    }
    return;
  }
  if (opcode === 'mov') {
    if (operands.length !== 2) throw new AssemblyParseError('MOV expects 2 operands', line);
    expectRegister(operands[0], 'Destination must be a register', line);
    if (operands[1]?.kind === 'memory' || operands[1]?.kind === 'label' || operands[1]?.kind === 'literal-label') {
      throw new AssemblyParseError('Invalid MOV source', line);
    }
    return;
  }
  if (opcode === 'add' || opcode === 'sub') {
    if (operands.length !== 3) throw new AssemblyParseError(`${opcode.toUpperCase()} expects 3 operands`, line);
    expectRegister(operands[0], 'Destination must be a register', line);
    expectRegister(operands[1], 'First arithmetic source must be a register', line);
    if (operands[2]?.kind === 'memory' || operands[2]?.kind === 'label' || operands[2]?.kind === 'literal-label') {
      throw new AssemblyParseError('Invalid arithmetic source', line);
    }
    return;
  }
  if (opcode === 'ldp' || opcode === 'stp') {
    if (operands.length !== 3) throw new AssemblyParseError(`${opcode.toUpperCase()} expects 3 operands`, line);
    expectRegister(operands[0], 'First operand must be a register', line);
    expectRegister(operands[1], 'Second operand must be a register', line);
    expectMemory(operands[2], line);
    return;
  }
  if (operands.length !== 2) throw new AssemblyParseError(`${opcode.toUpperCase()} expects 2 operands`, line);
  expectRegister(operands[0], 'First operand must be a register', line);
  if (opcode === 'ldr' && operands[1]?.kind === 'literal-label') return;
  expectMemory(operands[1], line);
}

interface InstructionSource {
  text: string;
  line: number;
}

function parseSectionDirective(text: string, line: number): Section | null {
  const shorthand = text.toLowerCase();
  if (shorthand === '.text') return 'text';
  if (shorthand === '.data') return 'data';

  const sectionMatch = text.match(/^\.section(?:\s+(.+))?$/i);
  if (!sectionMatch) return null;
  const requested = sectionMatch[1]?.trim().toLowerCase();
  if (requested === '.text') return 'text';
  if (requested === '.data') return 'data';
  throw new AssemblyParseError(`Unsupported section: ${requested || '(missing section name)'}`, line);
}

function isGlobalDirective(text: string, line: number): boolean {
  const match = text.match(/^\.(?:globl|global)(?:\s+(.+))?$/i);
  if (!match) return false;
  const names = match[1]?.split(',').map((name) => name.trim()).filter(Boolean) ?? [];
  if (names.length === 0 || names.some((name) => !LABEL_PATTERN.test(name))) {
    throw new AssemblyParseError('Expected a symbol name after .globl/.global', line);
  }
  return true;
}

function decodeStringLiteral(source: string, line: number): string {
  const literal = source.trim();
  if (!literal.startsWith('"')) {
    throw new AssemblyParseError('Expected a quoted string literal', line);
  }

  let decoded = '';
  for (let index = 1; index < literal.length; index += 1) {
    const character = literal[index];
    if (character === '"') {
      if (literal.slice(index + 1).trim()) {
        throw new AssemblyParseError('Unexpected text after string literal', line);
      }
      return decoded;
    }
    if (character !== '\\') {
      decoded += character;
      continue;
    }

    index += 1;
    if (index >= literal.length) {
      throw new AssemblyParseError('Unterminated string literal', line);
    }
    const escaped = literal[index];
    const escapeValues: Record<string, string> = {
      n: '\n',
      r: '\r',
      t: '\t',
      '\\': '\\',
      '"': '"',
      '0': '\0',
    };
    if (!(escaped in escapeValues)) {
      throw new AssemblyParseError(`Unsupported escape sequence "\\${escaped}"`, line);
    }
    decoded += escapeValues[escaped];
  }

  throw new AssemblyParseError('Unterminated string literal', line);
}

function parseDataDirective(
  text: string,
  line: number,
): { directive: 'ascii' | 'asciz'; bytes: Uint8Array } | null {
  const match = text.match(/^\.(asciz|ascii)\b(.*)$/i);
  if (!match) return null;
  const directive = match[1].toLowerCase() as 'ascii' | 'asciz';
  const encoded = new TextEncoder().encode(decodeStringLiteral(match[2], line));
  if (directive === 'ascii') return { directive, bytes: encoded };
  const bytes = new Uint8Array(encoded.length + 1);
  bytes.set(encoded);
  return { directive, bytes };
}

function unsupportedDirective(text: string, line: number): never {
  const name = text.match(/^(\.[^\s]+)/)?.[1] ?? text;
  throw new AssemblyParseError(`Unsupported directive: ${name}`, line);
}

export function parseProgram(source: string): ParsedProgram {
  const labels = new Map<string, bigint>();
  const symbols = new Map<string, Symbol>();
  const codeLabels = new Set<string>();
  const instructionSources: InstructionSource[] = [];
  const data: ParsedData[] = [];
  let section: Section = 'text';
  let dataAddress = DATA_BASE;
  let pendingDataLabels: string[] = [];

  source.split(/\r?\n/).forEach((rawLine, index) => {
    const sourceLine = index + 1;
    let text = stripComments(rawLine);
    if (!text) return;

    const nextSection = parseSectionDirective(text, sourceLine);
    if (nextSection) {
      section = nextSection;
      pendingDataLabels = [];
      return;
    }
    if (isGlobalDirective(text, sourceLine)) return;

    while (true) {
      const labelMatch = text.match(/^([a-z_.$][\w.$]*):\s*(.*)$/i);
      if (!labelMatch) break;
      const name = labelMatch[1].toLowerCase();
      if (labels.has(name)) throw new AssemblyParseError(`Duplicate label "${name}"`, sourceLine);
      const address = section === 'text'
        ? TEXT_BASE + BigInt(instructionSources.length) * 4n
        : dataAddress;
      labels.set(name, address);
      symbols.set(name, { name, section, address, sourceLine });
      if (section === 'text') {
        codeLabels.add(name);
      } else {
        pendingDataLabels.push(name);
      }
      text = labelMatch[2].trim();
      if (!text) return;
    }

    const dataDirective = parseDataDirective(text, sourceLine);
    if (dataDirective) {
      if (section !== 'data') {
        throw new AssemblyParseError(`.${dataDirective.directive} is only valid in a data section`, sourceLine);
      }
      data.push({
        label: pendingDataLabels.at(-1) ?? null,
        labels: [...pendingDataLabels],
        address: dataAddress,
        bytes: dataDirective.bytes,
        directive: dataDirective.directive,
        sourceLine,
        sourceText: text,
      });
      dataAddress += BigInt(dataDirective.bytes.length);
      pendingDataLabels = [];
      return;
    }
    if (text.startsWith('.')) unsupportedDirective(text, sourceLine);
    if (section === 'data') {
      throw new AssemblyParseError('Expected .ascii or .asciz data in the .data section', sourceLine);
    }
    instructionSources.push({ text, line: sourceLine });
  });

  const instructions = instructionSources.map(({ text, line }, index): ParsedInstruction => {
    const [opcodeToken, ...operandParts] = text.split(/\s+/);
    const opcode = opcodeToken.toLowerCase() as Opcode;
    if (!SUPPORTED_OPCODES.includes(opcode)) {
      throw new AssemblyParseError(`Unsupported instruction "${opcodeToken}"`, line);
    }
    const operands = parseOperands(operandParts.join(' ').trim(), line);
    validateInstruction(opcode, operands, line);
    for (const operand of operands) {
      if ((operand.kind === 'label' || operand.kind === 'literal-label') && !labels.has(operand.name)) {
        throw new AssemblyParseError(`Unknown label: ${operand.name}`, line);
      }
      if (operand.kind === 'label' && !codeLabels.has(operand.name)) {
        throw new AssemblyParseError(`"${operand.name}" is data, not a code label`, line);
      }
    }
    return {
      opcode,
      operands,
      sourceLine: line,
      sourceText: text,
      address: TEXT_BASE + BigInt(index) * 4n,
    };
  });

  const entryPoint = codeLabels.has('_start')
    ? labels.get('_start')!
    : instructions[0]?.address ?? TEXT_BASE;

  return { source, instructions, labels, symbols, codeLabels, data, entryPoint };
}
