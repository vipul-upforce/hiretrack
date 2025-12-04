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
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/build/**",
      "**/dist/**",
      "**/public/**",
      "**/*.config.js",
      "**/*.config.ts",
      "**/*.config.mjs",
      "**/next-env.d.ts",
      "**/*.js",
    ]
  },

  // 2. EXTENDS (Airbnb, Next, Prettier)
  // Removed 'plugin:security/recommended' from here to fix Circular JSON error
  ...compat.extends(
    'next/core-web-vitals',
    'next/typescript',
    'airbnb',
    'prettier'
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
    rules: {
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

      // --- STRICT SENIOR REQUIREMENTS ---
      
      // Requirement: "Any is not allowed"
      '@typescript-eslint/no-explicit-any': 'error',

      // Requirement: "No unused variable"
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Requirement: "Max loc 300 lines"
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],

      // --- NECESSARY COMPATIBILITY FIXES ---
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'react/react-in-jsx-scope': 'off',
      'import/prefer-default-export': 'off', 
      'no-underscore-dangle': ['error', { 'allow': ['_id'] }],
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
];

export default eslintConfig;