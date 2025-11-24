import React from 'react';
import YAML from 'yaml';
import type { DisplayType, OutputFormat, RgbColor } from '../types';
import { generatePngDataUrl } from './png';

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
  generate: (
    colors: RgbColor[],
    config: TConfig,
    ctx?: { displayType: DisplayType; ringLeds: number; matrixWidth: number; matrixHeight: number; rotation: number },
  ) => string;
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
      const lambdaLines = [
        'const uint8_t pixels[][3] = {',
        ...colors.map(([r, g, b]) => `  {${r}, ${g}, ${b}},`),
        '};',
        '',
        'for (int i = 0; i < it.size(); i++) {',
        '  it[i] = Color(',
        '    pixels[i][0],',
        '    pixels[i][1],',
        '    pixels[i][2]',
        '  );',
        '}',
      ].join('\n');

      const tree = {
        effects: [
          {
            addressable_lambda: {
              name,
              update_interval: 'never',
              lambda: lambdaLines,
            },
          },
        ],
      };

      return YAML.stringify(tree, { blockQuote: 'folded' });
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
  {
    id: 'png',
    label: 'PNG image',
    description: 'Download a PNG of the current layout',
    defaultConfig: {
      resolution: 1024,
      background: '#0f162c',
    },
    generate: (colors, config: any, ctx?: { displayType: DisplayType; ringLeds: number; matrixWidth: number; matrixHeight: number; rotation: number }) => {
      if (!ctx) return 'PNG generation needs display context';
      const url = generatePngDataUrl(colors, {
        resolution: Number.isFinite(config?.resolution) ? Math.max(64, Math.min(4096, Number(config.resolution))) : 1024,
        background: typeof config?.background === 'string' ? config.background : '#0f162c',
        displayType: ctx.displayType,
        ringLeds: ctx.ringLeds,
        matrixWidth: ctx.matrixWidth,
        matrixHeight: ctx.matrixHeight,
        rotation: ctx.rotation,
      });
      if (!url) return 'Failed to generate PNG';
      const link = document.createElement('a');
      link.href = url;
      link.download = `pixel-select-${Date.now()}.png`;
      link.click();
      return 'PNG downloaded';
    },
    renderConfig: ({ config, onChange }) => (
      <div className="grid two">
        <div className="field">
          <label className="label">Resolution (px)</label>
          <input
            className="control"
            type="number"
            min={128}
            max={4096}
            step={64}
            value={(config as any).resolution ?? 1024}
            onChange={(e) => onChange({ ...config, resolution: parseInt(e.target.value, 10) })}
          />
        </div>
        <div className="field">
          <label className="label">Background</label>
          <input
            className="control"
            type="color"
            value={(config as any).background ?? '#0f162c'}
            onChange={(e) => onChange({ ...config, background: e.target.value })}
          />
        </div>
      </div>
    ),
  },
  {
    id: 'wled_udp',
    label: 'WLED UDP packet',
    description: 'Shell command to send raw bytes over UDP',
    defaultConfig: {
      ip: '192.168.1.100',
      port: 19446,
      order: 'grb' as 'grb' | 'rgb' | 'bgr' | 'gbr',
    },
    generate: (colors, config: any) => {
      const ip = typeof config?.ip === 'string' && config.ip.trim() ? config.ip.trim() : '192.168.1.100';
      const port = Number.isFinite(config?.port) ? Number(config.port) : 19446;
      const order = ['rgb', 'bgr', 'gbr', 'grb'].includes(config?.order)
        ? (config.order as 'rgb' | 'bgr' | 'gbr' | 'grb')
        : 'grb';
      const indices =
        order === 'rgb'
          ? [0, 1, 2]
          : order === 'bgr'
            ? [2, 1, 0]
            : order === 'gbr'
              ? [1, 2, 0]
              : [1, 0, 2]; // grb default for WLED
      const hexBytes = colors
        .map((c) => indices.map((idx) => c[idx] ?? 0))
        .flat()
        .map((v) => `\\x${(v & 0xff).toString(16).padStart(2, '0')}`)
        .join('');
      const cmd = `printf '%b' '${hexBytes}' | nc -u -w1 -q0 ${ip} ${port}`;
      return cmd;
    },
    renderConfig: ({ config, onChange }) => (
      <div className="grid two">
        <div className="field">
          <label className="label">IP address</label>
          <input
            className="control"
            type="text"
            value={(config as any).ip ?? '192.168.1.100'}
            onChange={(e) => onChange({ ...config, ip: e.target.value })}
            placeholder="192.168.1.100"
          />
        </div>
        <div className="field">
          <label className="label">Port</label>
          <input
            className="control"
            type="number"
            min={1}
            max={65535}
            value={(config as any).port ?? 19446}
            onChange={(e) => onChange({ ...config, port: parseInt(e.target.value, 10) || 19446 })}
          />
        </div>
        <div className="field">
          <label className="label">Color order</label>
          <select
            className="control"
            value={(config as any).order ?? 'grb'}
            onChange={(e) => onChange({ ...config, order: e.target.value })}
          >
            <option value="grb">GRB (WLED default)</option>
            <option value="rgb">RGB</option>
            <option value="bgr">BGR</option>
            <option value="gbr">GBR</option>
          </select>
        </div>
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
  ctx?: { displayType: DisplayType; ringLeds: number; matrixWidth: number; matrixHeight: number; rotation: number },
) => {
  const def = getFormatDefinition(id);
  if (!def) {
    return 'Unsupported format';
  }
  const config = (configs?.[id] ?? def.defaultConfig) as FormatConfig;
  return def.generate(colors, config as any, ctx as any);
};
