import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dist-ssr']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    plugins: { react },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: { ecmaVersion: 'latest', ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    rules: {
      // Plain no-undef does not resolve a JSX element name, so a component that
      // is referenced but never imported builds clean and throws in the browser.
      // These two teach the linter to read JSX as the references it compiles to.
      'react/jsx-no-undef': 'error',
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'off',
      // jsx-uses-vars above is what marks a binding used once JSX renders it.
      // The capitalized patterns are broader than that rule: they exempt every
      // binding named like a component, including ones nothing renders.
      'no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^[A-Z_]',
          argsIgnorePattern: '^[A-Z_]|^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // A context module exports its provider beside the hook that reads it, which
      // is how all three contexts here are written. Naming the hooks keeps fast
      // refresh's warning pointed at accidental exports rather than at the pattern.
      'react-refresh/only-export-components': [
        'error',
        {
          allowConstantExport: true,
          allowExportNames: ['useAuth', 'useJournal', 'useSignals', 'useTheme', 'usePointerGlow'],
        },
      ],
    },
  },
  {
    files: ['*.config.js', 'api/**/*.js', 'scripts/**/*.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: { globals: globals.node },
  },
])
