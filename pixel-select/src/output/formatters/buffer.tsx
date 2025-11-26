import type { RgbColor } from '../../types';
import type { FormatConfig, OutputFormatDefinition } from './types';

type BufferOrder = 'rgb' | 'rbg' | 'grb' | 'gbr' | 'brg' | 'bgr';
type BufferConfig = { order: BufferOrder };

export const bufferFormat: OutputFormatDefinition = {
  id: 'buffer',
  label: 'Buffer (RGB permutations)',
  description: 'Comma-separated array with selectable R/G/B ordering',
  defaultConfig: { order: 'rgb' as BufferOrder },
  eager: true,
  generate: (colors: RgbColor[], config: FormatConfig) => {
    const cfg = config as BufferConfig;
    const order = (['rgb', 'rbg', 'grb', 'gbr', 'brg', 'bgr'] as BufferOrder[]).includes(cfg?.order as BufferOrder)
      ? (cfg.order as BufferOrder)
      : 'rgb';
    const indicesMap: Record<BufferOrder, [number, number, number]> = {
      rgb: [0, 1, 2],
      rbg: [0, 2, 1],
      grb: [1, 0, 2],
      gbr: [1, 2, 0],
      brg: [2, 0, 1],
      bgr: [2, 1, 0],
    };
    const indices = indicesMap[order];
    const output = colors.map((col) => `${col[indices[0]]}, ${col[indices[1]]}, ${col[indices[2]]}`).join(', ');
    return `[${output}]`;
  },
  renderConfig: ({ config, onChange }: { config: FormatConfig; onChange: (cfg: FormatConfig) => void }) => {
    const cfg = config as BufferConfig;
    return (
      <div className="field">
        <label className="label">Channel order</label>
        <select
          className="control"
          value={cfg.order ?? 'rgb'}
          onChange={(e) => onChange({ ...config, order: e.target.value as BufferOrder })}
        >
          <option value="rgb">RGB</option>
          <option value="rbg">RBG</option>
          <option value="grb">GRB</option>
          <option value="gbr">GBR</option>
          <option value="brg">BRG</option>
          <option value="bgr">BGR</option>
        </select>
      </div>
    );
  },
};
