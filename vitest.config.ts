import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'skeleton/**/*.test.ts', 'apps/**/*.test.ts'],
    exclude: [...configDefaults.exclude, '**/.scratch/**'],
  },
});
