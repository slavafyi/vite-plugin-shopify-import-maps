import stylistic from '@stylistic/eslint-plugin'
import { defineConfig } from 'eslint/config'
import love from 'eslint-config-love'

export default defineConfig([
  { ignores: ['dist/**'] },
  {
    ...love,
    files: ['**/*.ts'],
    rules: {
      ...love.rules,
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
    },
  },
  { ...stylistic.configs.recommended, files: ['**/*.ts'] },
])
