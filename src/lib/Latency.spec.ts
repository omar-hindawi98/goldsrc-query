import { describe, it, expect } from 'vitest';
import { Latency } from './Latency';

describe('Latency', () => {
    it('returns 0 before start or stop are called', () => {
        expect(new Latency().difference()).toBe(0);
    });

    it('returns a non-negative elapsed time', async () => {
        const lat = new Latency();
        lat.start();
        await new Promise((r) => setTimeout(r, 10));
        lat.stop();
        expect(lat.difference()).toBeGreaterThanOrEqual(0);
    });

    it('stop without start returns 0', () => {
        const lat = new Latency();
        lat.stop();
        expect(lat.difference()).toBe(0);
    });
});
