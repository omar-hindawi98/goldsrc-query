import { describe, it, expect } from 'vitest';
import { BufferExt } from '../lib/BufferExt';
import { parsePlayers } from './players';
import { buildPacket, writeByte, writeLong, writeFloat, writeString } from '../tests/packetHelpers';

describe('parsePlayers', () => {
    it('returns an empty array when player count is 0', () => {
        expect(parsePlayers(new BufferExt(Buffer.from([0x00])))).toEqual([]);
    });

    it('parses a single player correctly', () => {
        const name = 'Gabe';
        const data = buildPacket(
            (buf, off) => {
                writeByte(buf, off, 1);
                writeByte(buf, off, 0);
                writeString(buf, off, name);
                writeLong(buf, off, 42);
                writeFloat(buf, off, 120.5);
            },
            1 + 1 + (name.length + 1) + 4 + 4,
        );

        const players = parsePlayers(data);
        expect(players).toHaveLength(1);
        expect(players[0].index).toBe(0);
        expect(players[0].name).toBe('Gabe');
        expect(players[0].score).toBe(42);
        expect(players[0].duration).toBeCloseTo(120.5);
    });

    it('parses multiple players in order', () => {
        const names = ['Alice', 'Bob'];
        const data = buildPacket(
            (buf, off) => {
                writeByte(buf, off, 2);
                names.forEach((name, i) => {
                    writeByte(buf, off, i);
                    writeString(buf, off, name);
                    writeLong(buf, off, i * 10);
                    writeFloat(buf, off, i * 60);
                });
            },
            1 + names.reduce((s, n) => s + 1 + (n.length + 1) + 4 + 4, 0),
        );

        const players = parsePlayers(data);
        expect(players).toHaveLength(2);
        expect(players[0].name).toBe('Alice');
        expect(players[1].name).toBe('Bob');
        expect(players[1].score).toBe(10);
    });
});
