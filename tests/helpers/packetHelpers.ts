import { BufferExt } from "../../src/lib/BufferExt";

type Offset = { v: number };

export function buildPacket(
	fn: (buf: Buffer, off: Offset) => void,
	size: number,
): BufferExt {
	const buf = Buffer.alloc(size);
	const off: Offset = { v: 0 };
	fn(buf, off);
	return new BufferExt(buf);
}

export function writeString(buf: Buffer, off: Offset, str: string): void {
	buf.write(str, off.v, "utf8");
	off.v += str.length;
	buf.writeUInt8(0x00, off.v++);
}

export function writeByte(buf: Buffer, off: Offset, val: number): void {
	buf.writeUInt8(val, off.v++);
}

export function writeShort(buf: Buffer, off: Offset, val: number): void {
	buf.writeInt16LE(val, off.v);
	off.v += 2;
}

export function writeLong(buf: Buffer, off: Offset, val: number): void {
	buf.writeInt32LE(val, off.v);
	off.v += 4;
}

export function writeFloat(buf: Buffer, off: Offset, val: number): void {
	buf.writeFloatLE(val, off.v);
	off.v += 4;
}

export function writeBigUInt64LE(buf: Buffer, off: Offset, val: bigint): void {
	buf.writeBigUInt64LE(val, off.v);
	off.v += 8;
}
