import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  plugins: [{
    name: 'resolve-ts-js',
    enforce: 'pre',
    resolveId(source: string, importer: string | undefined) {
      if (!importer) return null;
      if (!source.endsWith('.js')) return null;
      
      // Only transform .js imports that point to local files (not node_modules)
      if (source.startsWith('.') || source.startsWith('/')) {
        const base = source.replace(/\.js$/, '.ts');
        const resolved = path.resolve(path.dirname(importer), base);
        if (fs.existsSync(resolved)) {
          return resolved;
        }
      }
      return null;
    },
  }],
});
