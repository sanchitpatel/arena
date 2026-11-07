import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.agents/**', 'src/previous/**']),
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['src/components/icons.js'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@phosphor-icons/react', '@phosphor-icons/react/*'],
              message: 'Import icons from src/components/icons (or ./icons / ../icons) instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/icons.js'],
    extends: [js.configs.recommended],
  },
])
