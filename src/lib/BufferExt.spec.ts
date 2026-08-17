import { BufferExt } from "./BufferExt";

describe("BufferExt", () => {
	describe("readByte", () => {
		it("returns the first byte as a number", () => {
			const buf = new BufferExt(Buffer.from([0x41, 0x42]));
			expect(buf.readByte()).toBe(0x41);
		});

		it("advances the internal cursor", () => {
			const buf = new BufferExt(Buffer.from([0x01, 0x02]));
			buf.readByte();
			expect(buf.readByte()).toBe(0x02);
		});

		it("returns a character when char=true", () => {
			const buf = new BufferExt(Buffer.from([0x41]));
			expect(buf.readByte(true)).toBe("A");
		});
	});

	describe("readString", () => {
		it("reads a null-terminated string", () => {
			const buf = new BufferExt(Buffer.from([0x68, 0x69, 0x00]));
			expect(buf.readString()).toBe("hi");
		});

		it("does not include the null terminator in the result", () => {
			const buf = new BufferExt(Buffer.from([0x41, 0x00, 0x42, 0x00]));
			expect(buf.readString()).toBe("A");
		});

		it("advances past the null terminator so the next read is correct", () => {
			const buf = new BufferExt(Buffer.from([0x41, 0x00, 0x42, 0x00]));
			buf.readString();
			expect(buf.readString()).toBe("B");
		});

		it("returns an empty string for a bare null byte", () => {
			const buf = new BufferExt(Buffer.from([0x00]));
			expect(buf.readString()).toBe("");
		});
	});

	describe("readShort", () => {
		it("reads a signed 16-bit little-endian integer", () => {
			const b = Buffer.allocUnsafe(2);
			b.writeInt16LE(1234);
			expect(new BufferExt(b).readShort()).toBe(1234);
		});

		it("reads negative values correctly", () => {
			const b = Buffer.allocUnsafe(2);
			b.writeInt16LE(-1);
			expect(new BufferExt(b).readShort()).toBe(-1);
		});

		it("returns a raw Buffer when raw=true", () => {
			const b = Buffer.from([0x01, 0x02]);
			const result = new BufferExt(b).readShort(true);
			expect(Buffer.isBuffer(result)).toBe(true);
			expect((result as Buffer)[0]).toBe(0x01);
		});
	});

	describe("readLong", () => {
		it("reads a signed 32-bit little-endian integer", () => {
			const b = Buffer.allocUnsafe(4);
			b.writeInt32LE(70000);
			expect(new BufferExt(b).readLong()).toBe(70000);
		});

		it("reads negative values correctly", () => {
			const b = Buffer.allocUnsafe(4);
			b.writeInt32LE(-1);
			expect(new BufferExt(b).readLong()).toBe(-1);
		});

		it("returns a raw Buffer when raw=true", () => {
			const b = Buffer.from([0xaa, 0xbb, 0xcc, 0xdd]);
			const result = new BufferExt(b).readLong(true);
			expect(Buffer.isBuffer(result)).toBe(true);
		});
	});

	describe("readFloat", () => {
		it("reads a 32-bit little-endian float", () => {
			const b = Buffer.allocUnsafe(4);
			b.writeFloatLE(1.5);
			expect(new BufferExt(b).readFloat()).toBeCloseTo(1.5);
		});
	});

	describe("readBigUInt64LE", () => {
		it("reads a 64-bit unsigned little-endian integer as bigint", () => {
			const b = Buffer.allocUnsafe(8);
			b.writeBigUInt64LE(76561198012345678n);
			expect(new BufferExt(b).readBigUInt64LE()).toBe(76561198012345678n);
		});

		it("advances the cursor by 8 bytes", () => {
			const b = Buffer.allocUnsafe(9);
			b.writeBigUInt64LE(1n, 0);
			b.writeUInt8(0x42, 8);
			const buf = new BufferExt(b);
			buf.readBigUInt64LE();
			expect(buf.readByte()).toBe(0x42);
		});
	});

	describe("remaining", () => {
		it("returns the number of unread bytes", () => {
			const buf = new BufferExt(Buffer.from([0x01, 0x02, 0x03]));
			expect(buf.remaining()).toBe(3);
			buf.readByte();
			expect(buf.remaining()).toBe(2);
		});
	});

	describe("removeOffset", () => {
		it("skips the given number of bytes", () => {
			const buf = new BufferExt(Buffer.from([0xff, 0xff, 0xff, 0xff, 0x41]));
			buf.removeOffset(4);
			expect(buf.readByte()).toBe(0x41);
		});
	});

	describe("sequential reads", () => {
		it("reads mixed types in sequence correctly", () => {
			const b = Buffer.allocUnsafe(7);
			b.writeUInt8(0x01, 0);
			b.writeInt16LE(500, 1);
			b.writeInt32LE(100000, 3);
			const buf = new BufferExt(b);
			expect(buf.readByte()).toBe(1);
			expect(buf.readShort()).toBe(500);
			expect(buf.readLong()).toBe(100000);
		});
	});
});
