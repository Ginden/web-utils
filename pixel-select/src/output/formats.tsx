import React from 'react';
import YAML from 'yaml';
import type { DisplayType, OutputFormat, RgbColor } from '../types';
import { generatePngDataUrl } from './png';

export type FormatConfig<Props extends Record<string, unknown> = Record<string, unknown>> = Props;

export type FormatConfigRenderer<TConfig extends FormatConfig> = (props: {
  config: TConfig;
  onChange: (config: TConfig) => void;
}) => React.ReactNode;

export type OutputFormatDefinition = {
  id: OutputFormat;
  label: string;
  description?: string;
  defaultConfig: FormatConfig;
  /** Auto-generate output when inputs change (writes to textarea, no downloads). */
  eager?: boolean;
  /** Limit availability to specific display types. */
  displayTypes?: DisplayType[];
  generate: (
    colors: RgbColor[],
    config: FormatConfig,
    ctx?: {
      displayType: DisplayType;
      ringLeds: number;
      matrixWidth: number;
      matrixHeight: number;
      stripLeds: number;
      rotation: number;
    },
  ) => string;
  renderConfig?: FormatConfigRenderer<FormatConfig>;
};

type BufferConfig = { order: 'rgb' | 'bgr' | 'gbr' };
type PngConfig = { resolution: number; background: string };
type EsphomeConfig = { effectName: string };
type WledConfig = { ip: string; port: number; order: 'grb' | 'rgb' | 'bgr' | 'gbr' };

const bufferFormat = (
  id: OutputFormat,
  label: string,
  order: BufferConfig['order'],
  description?: string,
): OutputFormatDefinition => ({
  id,
  label,
  description,
  defaultConfig: { order },
  generate: (colors: RgbColor[], config: FormatConfig) => {
    const cfg = config as BufferConfig;
    const indices = cfg.order === 'rgb' ? [0, 1, 2] : cfg.order === 'bgr' ? [2, 1, 0] : [1, 2, 0]; // gbr
    const output = colors.map((col) => `${col[indices[0]]}, ${col[indices[1]]}, ${col[indices[2]]}`).join(', ');
    return `[${output}]`;
  },
});

export const formatDefinitions: OutputFormatDefinition[] = [
  { ...bufferFormat('rgb', 'RGB Buffer', 'rgb', 'Comma-separated RGB values in array form'), eager: true },
  { ...bufferFormat('bgr', 'BGR Buffer', 'bgr', 'Comma-separated BGR values in array form'), eager: true },
  { ...bufferFormat('gbr', 'GBR Buffer', 'gbr', 'Comma-separated GBR values in array form'), eager: true },
  {
    id: 'arduino',
    label: 'Arduino (FastLED)',
    description: 'C array of CRGB objects',
    defaultConfig: {},
    eager: true,
    generate: (colors: RgbColor[]) =>
      `CRGB leds[] = {\n${colors.map(([r, g, b]) => `  CRGB(${r}, ${g}, ${b})`).join(',\n')}\n};`,
  },
  {
    id: 'esphome_static',
    label: 'ESPHome static effect',
    description: 'addressable_lambda with fixed pixels',
    defaultConfig: {
      effectName: 'StaticGenerated',
    },
    eager: true,
    generate: (colors: RgbColor[], config: FormatConfig) => {
      const cfg = config as EsphomeConfig;
      const name =
        typeof cfg?.effectName === 'string' && cfg.effectName.trim() ? cfg.effectName.trim() : 'StaticGenerated';
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
    renderConfig: ({ config, onChange }: { config: FormatConfig; onChange: (cfg: FormatConfig) => void }) => {
      const cfg = config as EsphomeConfig;
      return (
        <div className="field">
          <label className="label">Effect name</label>
          <input
            className="control"
            type="text"
            value={cfg.effectName ?? 'StaticGenerated'}
            onChange={(e) => onChange({ ...config, effectName: e.target.value })}
            placeholder="StaticGenerated"
          />
        </div>
      );
    },
  },
  {
    id: 'png',
    label: 'PNG image',
    description: 'Download a PNG of the current layout',
    defaultConfig: {
      resolution: 1024,
      background: '#0f162c',
    },
    generate: (
      colors: RgbColor[],
      config: FormatConfig,
      ctx?: {
        displayType: DisplayType;
        ringLeds: number;
        matrixWidth: number;
        matrixHeight: number;
        stripLeds: number;
        rotation: number;
      },
    ) => {
      const cfg = config as PngConfig;
      if (!ctx) return 'PNG generation needs display context';
      const url = generatePngDataUrl(colors, {
        resolution: Number.isFinite(cfg?.resolution) ? Math.max(64, Math.min(4096, Number(cfg.resolution))) : 1024,
        background: typeof cfg?.background === 'string' ? cfg.background : '#0f162c',
        displayType: ctx.displayType,
        ringLeds: ctx.ringLeds,
        matrixWidth: ctx.matrixWidth,
        matrixHeight: ctx.matrixHeight,
        stripLeds: ctx.stripLeds,
        rotation: ctx.rotation,
      });
      if (!url) return 'Failed to generate PNG';
      const link = document.createElement('a');
      link.href = url;
      link.download = `pixel-select-${Date.now()}.png`;
      link.click();
      return 'PNG downloaded';
    },
    renderConfig: ({ config, onChange }: { config: FormatConfig; onChange: (cfg: FormatConfig) => void }) => {
      const cfg = config as PngConfig;
      return (
        <div className="grid two">
          <div className="field">
            <label className="label">Resolution (px)</label>
            <input
              className="control"
              type="number"
              min={128}
              max={4096}
              step={64}
              value={cfg.resolution ?? 1024}
              onChange={(e) => onChange({ ...config, resolution: parseInt(e.target.value, 10) })}
            />
          </div>
          <div className="field">
            <label className="label">Background</label>
            <input
              className="control"
              type="color"
              value={cfg.background ?? '#0f162c'}
              onChange={(e) => onChange({ ...config, background: e.target.value })}
            />
          </div>
        </div>
      );
    },
  },
  {
    id: 'png_bitmap_8x8',
    label: 'PNG bitmap (matrix size)',
    description: 'Pixel-perfect PNG matching current matrix dimensions (for uploads)',
    defaultConfig: {},
    eager: false,
    displayTypes: ['matrix'],
    generate: (
      _colors: RgbColor[],
      _config: FormatConfig,
      ctx?: {
        displayType: DisplayType;
        ringLeds: number;
        matrixWidth: number;
        matrixHeight: number;
        stripLeds: number;
        rotation: number;
      },
    ) => {
      if (!ctx || ctx.displayType !== 'matrix') return 'Uploadable PNG works only in matrix mode';
      return 'Use Generate to download PNG';
    },
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
    eager: true,
    generate: (colors: RgbColor[], config: FormatConfig) => {
      const cfg = config as WledConfig;
      const ip = typeof cfg?.ip === 'string' && cfg.ip.trim() ? cfg.ip.trim() : '192.168.1.100';
      const port = Number.isFinite(cfg?.port) ? Number(cfg.port) : 19446;
      const order = ['rgb', 'bgr', 'gbr', 'grb'].includes(cfg?.order)
        ? (cfg.order as 'rgb' | 'bgr' | 'gbr' | 'grb')
        : 'grb';
      const indices =
        order === 'rgb' ? [0, 1, 2] : order === 'bgr' ? [2, 1, 0] : order === 'gbr' ? [1, 2, 0] : [1, 0, 2]; // grb default for WLED
      const hexBytes = colors
        .map((c) => indices.map((idx) => c[idx] ?? 0))
        .flat()
        .map((v: number) => `\\x${(v & 0xff).toString(16).padStart(2, '0')}`)
        .join('');
      const cmd = `printf '%b' '${hexBytes}' | nc -u -w1 -q0 ${ip} ${port}`;
      return cmd;
    },
    renderConfig: ({ config, onChange }: { config: FormatConfig; onChange: (cfg: FormatConfig) => void }) => {
      const cfg = config as WledConfig;
      return (
        <div className="grid two">
          <div className="field">
            <label className="label">IP address</label>
            <input
              className="control"
              type="text"
              value={cfg.ip ?? '192.168.1.100'}
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
              value={cfg.port ?? 19446}
              onChange={(e) => onChange({ ...config, port: parseInt(e.target.value, 10) || 19446 })}
            />
          </div>
          <div className="field">
            <label className="label">Color order</label>
            <select
              className="control"
              value={cfg.order ?? 'grb'}
              onChange={(e) => onChange({ ...config, order: e.target.value as WledConfig['order'] })}
            >
              <option value="grb">GRB (WLED default)</option>
              <option value="rgb">RGB</option>
              <option value="bgr">BGR</option>
              <option value="gbr">GBR</option>
            </select>
          </div>
        </div>
      );
    },
  },
];

export const getFormatDefinition = (id: OutputFormat) => formatDefinitions.find((def) => def.id === id);

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
  ctx?: {
    displayType: DisplayType;
    ringLeds: number;
    matrixWidth: number;
    matrixHeight: number;
    stripLeds: number;
    rotation: number;
  },
) => {
  const def = getFormatDefinition(id);
  if (!def) {
    return 'Unsupported format';
  }
  const config = (configs?.[id] ?? def.defaultConfig) as FormatConfig;
  return def.generate(colors, config, ctx);
};
