// eslint-disable-next-line n/file-extension-in-import -- Uses `export` Map
import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		setupFiles: [
			'./vitest.setup.js',
		],
	},
});
