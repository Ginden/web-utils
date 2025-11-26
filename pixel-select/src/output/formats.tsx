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
type WledMode = 'drgb' | 'dnrgb' | 'hyperion';
type WledConfig = {
  ip: string;
  port: number;
  sender: 'node' | 'netcat' | 'debug';
  mode: WledMode;
  startIndex: number;
  timeoutSeconds: number;
};

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
              update_interval: '50ms',
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
    label: 'WLED UDP realtime (WARLS / Hyperion)',
    description: 'Shell command to send WARLS (DRGB/DNRGB) or Hyperion-like UDP packets',
    defaultConfig: {
      ip: '192.168.1.100',
      port: 21324,
      sender: 'node' as WledConfig['sender'],
      mode: 'drgb' as WledMode,
      startIndex: 0,
      timeoutSeconds: 1,
    },
    eager: true,
    generate: (colors: RgbColor[], config: FormatConfig) => {
      const cfg = config as WledConfig;
      const ip = typeof cfg?.ip === 'string' && cfg.ip.trim() ? cfg.ip.trim() : '192.168.1.100';
      const mode: WledMode = cfg?.mode === 'dnrgb' || cfg?.mode === 'hyperion' ? cfg.mode : 'drgb';
      const defaultPort = mode === 'hyperion' ? 19446 : 21324;
      const port = Number.isFinite(cfg?.port) ? Number(cfg.port) : defaultPort;
      const indices = [0, 1, 2]; // WARLS is always RGB order
      const timeoutSeconds = Math.max(
        0,
        Math.min(255, Number.isFinite(cfg?.timeoutSeconds) ? Math.floor(Number(cfg.timeoutSeconds)) : 1),
      );
      const headerByte = mode === 'dnrgb' ? 4 : 2;
      const startIndex = Math.max(
        0,
        Math.min(65535, Number.isFinite(cfg?.startIndex) ? Math.floor(Number(cfg.startIndex)) : 0),
      );
      const maxPerPacket = mode === 'dnrgb' ? 489 : 490;
      const scopedColors =
        mode === 'dnrgb'
          ? colors.slice(startIndex, startIndex + maxPerPacket)
          : mode === 'drgb'
            ? colors.slice(0, maxPerPacket)
            : colors; // hyperion sends full frame
      const rgbPayload = scopedColors.map((c) => indices.map((idx) => c[idx] ?? 0)).flat();
      const byteValues =
        mode === 'hyperion'
          ? rgbPayload
          : [
              headerByte,
              timeoutSeconds,
              ...(mode === 'dnrgb' ? [(startIndex >> 8) & 0xff, startIndex & 0xff] : []),
              ...rgbPayload,
            ];

      byteValues.forEach((_, idx) => {
        byteValues[idx] = Math.max(0, Math.min(255, byteValues[idx]));
      });

      let base64: string;
      if (typeof btoa === 'function') {
        let binary = '';
        for (let i = 0; i < byteValues.length; i += 1) {
          binary += String.fromCharCode(byteValues[i]);
        }
        base64 = btoa(binary);
      } else {
        base64 = '';
      }

      const sender = ['netcat', 'debug'].includes(cfg?.sender as string)
        ? (cfg.sender as 'netcat' | 'debug')
        : 'node';
      if (sender === 'netcat') {
        return `printf '%s' '${base64}' | base64 -d | nc -u -w1 -q0 ${ip} ${port}`;
      }
      if (sender === 'debug') {
        return `node -p 'Buffer.from(process.argv[1], \"base64\").toString(\"hex\")' '${base64}'`;
      }

      return `node -p 'dgram.createSocket("udp4").send(Buffer.from(process.argv[1],"base64"), Number(process.argv[2]), process.argv[3], ()=>process.exit())' '${base64}' '${port}' '${ip}'`;
    },
    renderConfig: ({ config, onChange }: { config: FormatConfig; onChange: (cfg: FormatConfig) => void }) => {
      const cfg = config as WledConfig;
      return (
        <div className="grid two">
          <div className="field span-two">
            <label className="label">Mode</label>
            <select
              className="control"
              value={cfg.mode ?? 'drgb'}
              onChange={(e) => {
                const nextMode = e.target.value as WledMode;
                const nextDefaultPort = nextMode === 'hyperion' ? 19446 : 21324;
                onChange({ ...config, mode: nextMode, port: nextDefaultPort });
              }}
            >
              <option value="drgb">WARLS / DRGB (full frame)</option>
              <option value="dnrgb">WARLS / DNRGB (offset, 489 LEDs)</option>
              <option value="hyperion">Hyperion-like (RGB only, no header)</option>
            </select>
          </div>
          {cfg.mode !== 'hyperion' && (
            <div className="field span-two">
              <label className="label">Timeout seconds (Byte 1)</label>
              <input
                className="control"
                type="number"
                min={0}
                max={255}
                value={cfg.timeoutSeconds ?? 1}
                onChange={(e) =>
                  onChange({
                    ...config,
                    timeoutSeconds: Math.max(0, Math.min(255, parseInt(e.target.value, 10) || 0)),
                  })
                }
              />
              <p className="muted small">Seconds until WLED exits realtime; 255 disables timeout.</p>
            </div>
          )}
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
              value={cfg.port ?? (cfg.mode === 'hyperion' ? 19446 : 21324)}
              onChange={(e) =>
                onChange({
                  ...config,
                  port: parseInt(e.target.value, 10) || (cfg.mode === 'hyperion' ? 19446 : 21324),
                })
              }
            />
          </div>
          <div className="field span-two">
            <label className="label">Sender</label>
            <select
              className="control"
              value={cfg.sender ?? 'node'}
              onChange={(e) => onChange({ ...config, sender: e.target.value as WledConfig['sender'] })}
            >
              <option value="node">Node (default, base64)</option>
              <option value="netcat">Netcat (base64 → nc)</option>
              <option value="debug">Debug (print hex payload)</option>
            </select>
          </div>
          {cfg.mode === 'dnrgb' && (
            <div className="field span-two">
              <label className="label">Start index (0-based)</label>
              <input
                className="control"
                type="number"
                min={0}
                value={cfg.startIndex ?? 0}
                onChange={(e) =>
                  onChange({
                    ...config,
                    startIndex: Math.max(0, parseInt(e.target.value, 10) || 0),
                  })
                }
              />
            </div>
          )}
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
