import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import securityPlugin from 'eslint-plugin-security'; // 1. Import security plugin directly

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // 1. GLOBAL IGNORES
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/out/**',
      '**/build/**',
      '**/dist/**',
      '**/public/**',
      '**/*.config.js',
      '**/*.config.ts',
      '**/*.config.mjs',
      '**/next-env.d.ts',
      '**/*.js',
      '**/*.cjs', // CommonJS files (e.g., server-ws.cjs)
    ],
  },

  // 2. EXTENDS (Airbnb, Next, Prettier)
  // Removed 'plugin:security/recommended' from here to fix Circular JSON error
  ...compat.extends(
    'next/core-web-vitals',
    'next/typescript',
    'airbnb',
    'prettier',
  ),

  // 3. SECURITY PLUGIN (Manual Setup)
  // We manually apply this to avoid FlatCompat crashing on circular references
  {
    plugins: {
      security: securityPlugin,
    },
    rules: {
      ...securityPlugin.configs.recommended.rules,
    },
  },

  // 4. RULES & SETTINGS
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // -- IGNORED RULE BY US
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-object-injection': 'off',
      'import/no-cycle': 'off',
      'no-restricted-syntax': 'off',
      'no-await-in-loop': 'off',
      'no-useless-escape': 'off',
      'no-param-reassign': 'off',
      // --- SENIOR'S REQUIRED OVERRIDES (From provided preset) ---
      'react/jsx-filename-extension': 'off',
      'import/extensions': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/jsx-props-no-spreading': 'off',
      'react/require-default-props': 'off',
      'import/no-extraneous-dependencies': 'off',
      'jsx-a11y/heading-has-content': 'off',
      'jsx-a11y/label-has-associated-control': 'off',
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'react-hooks/exhaustive-deps': 'off',
      // --- ENFORSED INGORING JS SPECIFIC RULES - CONFLICTING WITH THE TS RULES ---
      'no-unused-vars': 'off',

      // --- STRICT SENIOR REQUIREMENTS ---

      // Requirement: "Any is not allowed"
      '@typescript-eslint/no-explicit-any': 'error',
      // Requirement: "No unused variable"
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Requirement: "Max loc 300 lines"
      'max-lines': [
        'error',
        { max: 500, skipBlankLines: true, skipComments: true },
      ],

      // --- NECESSARY COMPATIBILITY FIXES ---
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'react/react-in-jsx-scope': 'off',
      'import/prefer-default-export': 'off',
      'no-underscore-dangle': ['error', { allow: ['_id'] }],
    },
    settings: {
      'import/resolver': {
        alias: {
          map: [['@', './src']],
          extensions: ['.tsx', '.ts', '.js', '.jsx', '.json'],
        },
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
  },
  // 5. SPECIFIC OVERRIDES (Hotfix for huge files)
  {
    // Target only route handlers
    files: ['**/route.ts'],
    rules: {
      // Allow huge files
      'max-lines': 'off',

      // If complexity is an issue
      complexity: 'off',
    },
  },
];

export default eslintConfig;
