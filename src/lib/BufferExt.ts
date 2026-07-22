export class BufferExt {
	private buffer: Buffer;

	constructor(buffer: Buffer) {
		this.buffer = buffer;
	}

	readByte(char?: false): number;
	readByte(char: true): string;
	readByte(char = false): number | string {
		if (this.buffer.length < 1)
			throw new Error("BufferExt: unexpected end of data reading byte");
		const data = this.buffer[0];
		this.buffer = this.buffer.slice(1);
		return char ? String.fromCharCode(data) : data;
	}

	readString(): string {
		const bytes: number[] = [];
		for (const value of this.buffer.values()) {
			if (value === 0x00) break;
			bytes.push(value);
		}
		if (bytes.length === this.buffer.length)
			throw new Error("BufferExt: unterminated string");
		this.buffer = this.buffer.slice(bytes.length + 1); // +1 to skip null terminator
		return Buffer.from(bytes).toString("utf8");
	}

	readShort(raw?: false): number;
	readShort(raw: true): Buffer;
	readShort(raw = false): number | Buffer {
		if (this.buffer.length < 2)
			throw new Error("BufferExt: unexpected end of data reading short");
		const data = this.buffer.slice(0, 2);
		this.buffer = this.buffer.slice(2);
		return raw ? data : data.readInt16LE(0);
	}

	readLong(raw?: false): number;
	readLong(raw: true): Buffer;
	readLong(raw = false): number | Buffer {
		if (this.buffer.length < 4)
			throw new Error("BufferExt: unexpected end of data reading long");
		const data = this.buffer.slice(0, 4);
		this.buffer = this.buffer.slice(4);
		return raw ? data : data.readInt32LE(0);
	}

	readFloat(raw?: false): number;
	readFloat(raw: true): Buffer;
	readFloat(raw = false): number | Buffer {
		if (this.buffer.length < 4)
			throw new Error("BufferExt: unexpected end of data reading float");
		const data = this.buffer.slice(0, 4);
		this.buffer = this.buffer.slice(4);
		return raw ? data : data.readFloatLE(0);
	}

	readBigUInt64LE(): bigint {
		if (this.buffer.length < 8)
			throw new Error("BufferExt: unexpected end of data reading uint64");
		const data = this.buffer.slice(0, 8);
		this.buffer = this.buffer.slice(8);
		return data.readBigUInt64LE(0);
	}

	remaining(): number {
		return this.buffer.length;
	}

	removeOffset(offset: number): void {
		this.buffer = this.buffer.slice(offset);
	}

	toString(): string {
		return this.buffer.toString();
	}
}
