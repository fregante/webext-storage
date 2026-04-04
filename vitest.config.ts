import {defineConfig} from 'vitest/config';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call -- vitest.config.ts is outside tsconfig, type info unavailable
export default defineConfig({
	test: {
		globals: true,
		include: ['source/**/*.test.ts'],
		setupFiles: [
			'./vitest.setup.ts',
		],
	},
});
