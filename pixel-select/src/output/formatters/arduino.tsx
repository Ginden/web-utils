import type { RgbColor } from '../../types';
import type { OutputFormatDefinition } from './types';

export const arduinoFormat: OutputFormatDefinition = {
  id: 'arduino',
  label: 'Arduino (FastLED)',
  description: 'C array of CRGB objects',
  group: 'Code',
  defaultConfig: {},
  eager: true,
  generate: (colors: RgbColor[]) =>
    `CRGB leds[] = {\n${colors.map(([r, g, b]) => `  CRGB(${r}, ${g}, ${b})`).join(',\n')}\n};`,
};
