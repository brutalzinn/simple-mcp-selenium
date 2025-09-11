const globals = require("globals");
const tseslint = require("typescript-eslint");

module.exports = [
  { 
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], 
    languageOptions: { 
      globals: { ...globals.node, ...globals.es2022, ...globals.jest } 
    } 
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      // General ESLint rules
      'indent': ['error', 2],
      'linebreak-style': ['error', 'unix'],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'no-console': 'warn',
      'no-unused-vars': 'off', // Handled by @typescript-eslint/no-unused-vars
      'max-len': ['warn', { 'code': 120, 'ignoreUrls': true, 'ignoreStrings': true, 'ignoreTemplateLiterals': true }],
      'comma-dangle': ['error', 'always-multiline'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'space-in-parens': ['error', 'never'],
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',

      // TypeScript-specific rules
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'off',
    }
  }
];
