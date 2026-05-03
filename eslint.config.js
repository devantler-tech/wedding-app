import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';

export default tseslint.config(
	...tseslint.configs.strict,
	...svelte.configs.recommended,
	{
		ignores: ['build/', '.svelte-kit/', 'node_modules/', 'dist/']
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				parser: tseslint.parser
			}
		}
	}
);
