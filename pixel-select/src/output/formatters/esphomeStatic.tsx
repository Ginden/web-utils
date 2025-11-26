import YAML from 'yaml';
import type { RgbColor } from '../../types';
import type { FormatConfig, OutputFormatDefinition } from './types';

type EsphomeConfig = { effectName: string };

export const esphomeStaticFormat: OutputFormatDefinition = {
  id: 'esphome_static',
  label: 'ESPHome static effect',
  description: 'addressable_lambda with fixed pixels',
  defaultConfig: {
    effectName: 'StaticGenerated',
  },
  eager: true,
  generate: (colors: RgbColor[], config: FormatConfig) => {
    const cfg = config as EsphomeConfig;
    const name = typeof cfg?.effectName === 'string' && cfg.effectName.trim() ? cfg.effectName.trim() : 'StaticGenerated';
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
};
