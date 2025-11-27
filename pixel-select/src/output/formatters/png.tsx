import type { RgbColor } from '../../types';
import { generatePngDataUrl } from '../png';
import type { FormatConfig, OutputFormatDefinition } from './types';

type PngConfig = { resolution: number; background: string };

export const pngFormat: OutputFormatDefinition = {
  id: 'png',
  label: 'PNG image',
  description: 'Download a PNG of the current layout',
  group: 'Images',
  defaultConfig: {
    resolution: 1024,
    background: '#0f162c',
  },
  generate: (colors: RgbColor[], config: FormatConfig, ctx) => {
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
};
