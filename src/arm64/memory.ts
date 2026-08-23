export type MemorySnapshot = Map<bigint, number>;

/** Sparse, byte-addressable, little-endian memory used by the teaching CPU. */
export class ARM64Memory {
  private bytes = new Map<bigint, number>();

  clear(): void {
    this.bytes.clear();
  }

  readByte(address: bigint): number {
    return this.bytes.get(address) ?? 0;
  }

  writeByte(address: bigint, value: number | bigint): void {
    this.bytes.set(address, Number(BigInt(value) & 0xffn));
  }

  read(address: bigint, size: number): bigint {
    let value = 0n;
    for (let offset = 0; offset < size; offset += 1) {
      value |= BigInt(this.readByte(address + BigInt(offset))) << BigInt(offset * 8);
    }
    return value;
  }

  write(address: bigint, value: bigint, size: number): bigint[] {
    const changed: bigint[] = [];
    for (let offset = 0; offset < size; offset += 1) {
      const byteAddress = address + BigInt(offset);
      const nextByte = Number((value >> BigInt(offset * 8)) & 0xffn);
      if (this.readByte(byteAddress) !== nextByte || !this.bytes.has(byteAddress)) {
        changed.push(byteAddress);
      }
      this.bytes.set(byteAddress, nextByte);
    }
    return changed;
  }

  read64(address: bigint): bigint {
    return this.read(address, 8);
  }

  write64(address: bigint, value: bigint): bigint[] {
    return this.write(address, value, 8);
  }

  hasStoredByte(address: bigint): boolean {
    return this.bytes.has(address);
  }

  snapshot(): MemorySnapshot {
    return new Map(this.bytes);
  }

  restore(snapshot: MemorySnapshot): void {
    this.bytes = new Map(snapshot);
  }
}
