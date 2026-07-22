import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['tests/e2e/**/*.e2e.spec.ts'],
        testTimeout: 30000,
        hookTimeout: 60000,
        reporters: ['verbose'],
        pool: 'forks',
    },
});
