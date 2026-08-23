import { formatHex, type RegisterState } from '../registers';
import { ARM64Memory } from '../memory';

export interface SyscallArgument {
  register: string;
  value: bigint;
  role: string;
  description: string;
}

export interface SyscallInfo {
  number: bigint;
  name: string;
  arguments: SyscallArgument[];
}

export interface SyscallEffect {
  explanation: string;
  output: string;
  halt: boolean;
  exitCode: bigint | null;
  info: SyscallInfo;
}

export function executeSyscall(registers: RegisterState, memory: ARM64Memory): SyscallEffect {
  const number = registers.x8;
  if (number === 64n) {
    const fd = registers.x0;
    const address = registers.x1;
    const requestedSize = registers.x2;
    const safeSize = Number(requestedSize > 1_000_000n ? 1_000_000n : requestedSize);
    const bytes = Uint8Array.from({ length: safeSize }, (_, index) => memory.readByte(address + BigInt(index)));
    const output = fd === 1n || fd === 2n ? new TextDecoder().decode(bytes) : '';
    return {
      explanation: `Linux write(${fd}, ${formatHex(address)}, ${requestedSize}).`,
      output,
      halt: false,
      exitCode: null,
      info: {
        number,
        name: 'write',
        arguments: [
          { register: 'x0', value: fd, role: 'file descriptor', description: fd === 1n ? 'stdout' : fd === 2n ? 'stderr' : `fd ${fd}` },
          { register: 'x1', value: address, role: 'buffer address', description: `pointer to ${formatHex(address)}` },
          { register: 'x2', value: requestedSize, role: 'number of bytes', description: `${requestedSize} bytes` },
          { register: 'x8', value: number, role: 'syscall number', description: 'write' },
        ],
      },
    };
  }

  if (number === 93n) {
    const code = registers.x0;
    return {
      explanation: `Linux exit(${code}); execution stops.`,
      output: '',
      halt: true,
      exitCode: code,
      info: {
        number,
        name: 'exit',
        arguments: [
          { register: 'x0', value: code, role: 'exit status', description: `status ${code}` },
          { register: 'x8', value: number, role: 'syscall number', description: 'exit' },
        ],
      },
    };
  }

  return {
    explanation: `Simplified simulator: syscall ${number} is not implemented.`,
    output: '',
    halt: false,
    exitCode: null,
    info: { number, name: 'unknown', arguments: [] },
  };
}
