import React from 'react';
import type { OutputFormat, RgbColor } from '../types';

export type FormatConfig<Props extends Record<string, any> = Record<string, any>> = Props;

export type FormatConfigRenderer<TConfig extends FormatConfig> = (props: {
  config: TConfig;
  onChange: (config: TConfig) => void;
}) => React.ReactNode;

export type OutputFormatDefinition<TConfig extends FormatConfig = FormatConfig> = {
  id: OutputFormat;
  label: string;
  description?: string;
  defaultConfig: TConfig;
  generate: (colors: RgbColor[], config: TConfig) => string;
  renderConfig?: FormatConfigRenderer<TConfig>;
};

const bufferFormat = (
  id: OutputFormat,
  label: string,
  order: 'rgb' | 'bgr' | 'gbr',
  description?: string,
): OutputFormatDefinition => ({
  id,
  label,
  description,
  defaultConfig: { order },
  generate: (colors, config: any) => {
    const indices =
      config.order === 'rgb'
        ? [0, 1, 2]
        : config.order === 'bgr'
          ? [2, 1, 0]
          : [1, 2, 0]; // gbr
    const output = colors.map((col) => `${col[indices[0]]}, ${col[indices[1]]}, ${col[indices[2]]}`).join(', ');
    return `[${output}]`;
  },
});

export const formatDefinitions: OutputFormatDefinition<any>[] = [
  bufferFormat('rgb', 'RGB Buffer', 'rgb', 'Comma-separated RGB values in array form'),
  bufferFormat('bgr', 'BGR Buffer', 'bgr', 'Comma-separated BGR values in array form'),
  bufferFormat('gbr', 'GBR Buffer', 'gbr', 'Comma-separated GBR values in array form'),
  {
    id: 'arduino',
    label: 'Arduino (FastLED)',
    description: 'C array of CRGB objects',
    defaultConfig: {},
    generate: (colors) =>
      `CRGB leds[] = {\n${colors.map(([r, g, b]) => `  CRGB(${r}, ${g}, ${b})`).join(',\n')}\n};`,
  },
  {
    id: 'esphome_static',
    label: 'ESPHome static effect',
    description: 'addressable_lambda with fixed pixels',
    defaultConfig: {
      effectName: 'StaticGenerated',
    },
    generate: (colors, config: any) => {
      const name = typeof config?.effectName === 'string' && config.effectName.trim() ? config.effectName.trim() : 'StaticGenerated';
      const pixelRows = colors
        .map(([r, g, b]) => `          {${r}, ${g}, ${b}},`)
        .join('\n');
      return `effects:\n  - addressable_lambda:\n      name: ${name}\n      update_interval: never\n      lambda: |-\n        const uint8_t pixels[][3] = {\n${pixelRows}\n        };\n\n        for (int i = 0; i < it.size(); i++) {\n          it[i] = Color(\n            pixels[i][0],\n            pixels[i][1],\n            pixels[i][2]\n          );\n        }\n`;
    },
    renderConfig: ({ config, onChange }) => (
      <div className="field">
        <label className="label">Effect name</label>
        <input
          className="control"
          type="text"
          value={(config as any).effectName ?? 'StaticGenerated'}
          onChange={(e) => onChange({ ...config, effectName: e.target.value })}
          placeholder="StaticGenerated"
        />
      </div>
    ),
  },
];

export const getFormatDefinition = (id: OutputFormat) =>
  formatDefinitions.find((def) => def.id === id);

export const buildDefaultFormatConfig = () => {
  const result: Record<OutputFormat, FormatConfig> = {} as Record<OutputFormat, FormatConfig>;
  formatDefinitions.forEach((def) => {
    result[def.id] = def.defaultConfig;
  });
  return result;
};

export const generateOutputForFormat = (
  colors: RgbColor[],
  id: OutputFormat,
  configs?: Partial<Record<OutputFormat, FormatConfig>>,
) => {
  const def = getFormatDefinition(id);
  if (!def) {
    return 'Unsupported format';
  }
  const config = (configs?.[id] ?? def.defaultConfig) as FormatConfig;
  return def.generate(colors, config as any);
};
