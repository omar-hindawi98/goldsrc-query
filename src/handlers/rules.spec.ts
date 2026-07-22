import { describe, it, expect } from 'vitest';
import { BufferExt } from '../lib/BufferExt';
import { parseRules } from './rules';
import { buildPacket, writeShort, writeString } from '../../tests/packetHelpers';

describe('parseRules', () => {
    it('returns zero rules when total is 0', () => {
        const buf = Buffer.alloc(2);
        buf.writeInt16LE(0, 0);
        const result = parseRules(new BufferExt(buf));
        expect(result.total).toBe(0);
        expect(result.list).toEqual([]);
    });

    it('parses a single rule correctly', () => {
        const name = 'sv_cheats',
            value = '0';
        const data = buildPacket(
            (buf, off) => {
                writeShort(buf, off, 1);
                writeString(buf, off, name);
                writeString(buf, off, value);
            },
            2 + (name.length + 1) + (value.length + 1),
        );

        const result = parseRules(data);
        expect(result.total).toBe(1);
        expect(result.list[0]).toEqual({ name: 'sv_cheats', value: '0' });
    });

    it('parses multiple rules in order', () => {
        const rules: [string, string][] = [
            ['mp_friendlyfire', '1'],
            ['mp_timelimit', '30'],
        ];
        const data = buildPacket(
            (buf, off) => {
                writeShort(buf, off, rules.length);
                rules.forEach(([n, v]) => {
                    writeString(buf, off, n);
                    writeString(buf, off, v);
                });
            },
            2 + rules.reduce((s, [n, v]) => s + n.length + 1 + v.length + 1, 0),
        );

        const result = parseRules(data);
        expect(result.total).toBe(2);
        expect(result.list[1]).toEqual({ name: 'mp_timelimit', value: '30' });
    });
});
