import stylistic from '@stylistic/eslint-plugin'
import { defineConfig } from 'eslint/config'
import love from 'eslint-config-love'
import type { Linter } from 'eslint'

export default defineConfig([
  { ignores: ['dist/**'] },
  {
    ...(love as Linter.Config),
    files: ['**/*.ts'],
    rules: {
      ...love.rules,
      'no-console': 'warn',
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/no-unsafe-type-assertion': 'off',
    },
  },
  { ...stylistic.configs.recommended, files: ['**/*.ts'] },
])
