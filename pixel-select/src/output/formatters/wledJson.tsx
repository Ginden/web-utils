import type { RgbColor } from '../../types';
import type { FormatConfig, OutputFormatDefinition } from './types';

type WledJsonConfig = {
  presetId: number;
  presetName: string;
  brightness: number;
  includePower: boolean;
  saveToPreset: boolean;
  transition: number;
};

const clampByte = (value: unknown, fallback: number) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(255, Math.round(num)));
};

const clampPresetId = (value: unknown, fallback: number) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(1, Math.min(250, Math.round(num)));
};

const clampUint16 = (value: unknown, fallback: number) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(65535, Math.round(num)));
};

export const wledJsonFormat: OutputFormatDefinition = {
  id: 'wled_json',
  label: '⚗️ WLED JSON preset',
  description: 'JSON payload for /json/state (psave + i array for per-LED colors)',
  group: 'WLED',
  defaultConfig: {
    presetId: 1,
    presetName: 'Pixel Select',
    brightness: 255,
    includePower: true,
    saveToPreset: true,
    transition: 0,
  },
  eager: true,
  generate: (colors: RgbColor[], config: FormatConfig) => {
    const cfg = config as WledJsonConfig;
    const brightness = clampByte(cfg?.brightness, 255);
    const presetId = clampPresetId(cfg?.presetId, 1);
    const name = typeof cfg?.presetName === 'string' && cfg.presetName.trim() ? cfg.presetName.trim() : 'Pixel Select';
    const transition = clampUint16(cfg?.transition, 0);
    const includePower = cfg?.includePower !== false;
    const saveToPreset = cfg?.saveToPreset !== false;

    const leds = colors.map(([r, g, b]) => [clampByte(r, 0), clampByte(g, 0), clampByte(b, 0)]);
    const primary = leds[0] ?? [0, 0, 0];
    const ledCount = leds.length;

    const segment: Record<string, unknown> = {
      id: 0,
      start: 0,
      stop: ledCount,
      len: ledCount,
      sel: true,
      fx: 0,
      pal: 0,
      col: [primary, [0, 0, 0], [0, 0, 0]],
      i: leds,
    };

    const payload: Record<string, unknown> = {
      bri: brightness,
      mainseg: 0,
      seg: [segment],
      n: name,
    };

    if (includePower) {
      payload.on = true;
    }
    if (transition > 0) {
      payload.transition = transition;
    }
    if (saveToPreset) {
      payload.psave = presetId;
    }

    return JSON.stringify(payload, null, 2);
  },
  renderConfig: ({ config, onChange }: { config: FormatConfig; onChange: (cfg: FormatConfig) => void }) => {
    const cfg = config as WledJsonConfig;
    return (
      <div className="grid two">
        <div className="field">
          <label className="label">Preset slot (psave)</label>
          <input
            className="control"
            type="number"
            min={1}
            max={250}
            value={cfg.presetId ?? 1}
            onChange={(e) =>
              onChange({
                ...config,
                presetId: clampPresetId(e.target.value, 1),
              })
            }
          />
          <p className="muted small">Slot 1-250; used when saving on POST.</p>
        </div>
        <div className="field">
          <label className="label">Preset name (n)</label>
          <input
            className="control"
            type="text"
            value={cfg.presetName ?? 'Pixel Select'}
            onChange={(e) => onChange({ ...config, presetName: e.target.value })}
            placeholder="Pixel Select"
          />
        </div>
        <div className="field">
          <label className="label">Brightness (bri)</label>
          <input
            className="control"
            type="number"
            min={1}
            max={255}
            value={cfg.brightness ?? 255}
            onChange={(e) =>
              onChange({
                ...config,
                brightness: clampByte(e.target.value, 255),
              })
            }
          />
          <p className="muted small">1-255; send 0 only if you want the preset stored off.</p>
        </div>
        <div className="field">
          <label className="label">Transition (transition)</label>
          <input
            className="control"
            type="number"
            min={0}
            max={65535}
            value={cfg.transition ?? 0}
            onChange={(e) =>
              onChange({
                ...config,
                transition: clampUint16(e.target.value, 0),
              })
            }
          />
          <p className="muted small">Tenths of a second (0 disables fade).</p>
        </div>
        <label className="field checkbox">
          <input
            type="checkbox"
            checked={cfg.includePower ?? true}
            onChange={(e) => onChange({ ...config, includePower: e.target.checked })}
          />
          <span>Set power on (on: true)</span>
        </label>
        <label className="field checkbox">
          <input
            type="checkbox"
            checked={cfg.saveToPreset ?? true}
            onChange={(e) => onChange({ ...config, saveToPreset: e.target.checked })}
          />
          <span>Include psave to write preset</span>
        </label>
      </div>
    );
  },
};
