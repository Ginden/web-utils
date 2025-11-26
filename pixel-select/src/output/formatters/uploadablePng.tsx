import type { OutputFormatDefinition } from './types';

export const uploadablePngFormat: OutputFormatDefinition = {
  id: 'png_bitmap_8x8',
  label: 'PNG bitmap (matrix size)',
  description: 'Pixel-perfect PNG matching current matrix dimensions (for uploads)',
  defaultConfig: {},
  eager: false,
  displayTypes: ['matrix'],
  generate: (_colors, _config, ctx) => {
    if (!ctx || ctx.displayType !== 'matrix') return 'Uploadable PNG works only in matrix mode';
    return 'Use Generate to download PNG';
  },
};
