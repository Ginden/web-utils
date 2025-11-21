import type { RgbColor } from '../types';

export type OutputFormat = 'rgb' | 'bgr' | 'arduino';

export const generateOutput = (colors: RgbColor[], format: OutputFormat): string => {
  switch (format) {
    case 'rgb': {
      const output = colors.map(([r, g, b]) => `${r}, ${g}, ${b}`).join(', ');
      return `[${output}]`;
    }
    case 'bgr': {
      const output = colors.map(([r, g, b]) => `${b}, ${g}, ${r}`).join(', ');
      return `[${output}]`;
    }
    case 'arduino': {
      return `CRGB leds[] = {\n${colors
        .map(([r, g, b]) => `  CRGB(${r}, ${g}, ${b})`)
        .join(',\n')}\n};`;
    }
    default:
      return 'Unsupported format';
  }
};
