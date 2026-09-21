import { defineConfig } from 'tsdown'

/** 单 entry host-only ESM bundle：inline 内部模块，外部 workspace deps 保持 import。 */
export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: true,
  clean: true,
  sourcemap: true,
})
