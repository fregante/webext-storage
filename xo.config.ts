import type {FlatXoConfig} from 'xo';

export default [
	{
		languageOptions: {
			globals: {
				chrome: 'readonly',
			},
		},
	},
	{
		files: ['source/*.test.ts'],
		rules: {
			// Storage keys intentionally use non-camelCase format (e.g. 'height:::rico')
			'@typescript-eslint/naming-convention': 'off',
		},
	},
] satisfies FlatXoConfig;
