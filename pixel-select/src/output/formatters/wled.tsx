import type { RgbColor } from '../../types';
import Icon from '../../components/Icon';
import Tooltip from '../../components/Tooltip';
import { mdiInformationOutline } from '@mdi/js';
import type { FormatConfig, OutputFormatDefinition } from './types';

type WledMode = 'drgb' | 'dnrgb' | 'hyperion';
type WledConfig = {
  ip: string;
  port: number;
  sender: 'node' | 'netcat' | 'debug';
  mode: WledMode;
  startIndex: number;
  timeoutSeconds: number;
};

export const wledFormat: OutputFormatDefinition = {
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

    const sender = ['netcat', 'debug'].includes(cfg?.sender as string) ? (cfg.sender as 'netcat' | 'debug') : 'node';
    if (sender === 'netcat') {
      return `printf '%s' '${base64}' | base64 -d | nc -u -w1 -q0 ${ip} ${port}`;
    }
    if (sender === 'debug') {
      return `node -p 'Buffer.from(process.argv[1], \"base64\").toString(\"hex\")' '${base64}'`;
    }

    return `node -p 'dgram.createSocket(\"udp4\").send(Buffer.from(process.argv[1],\"base64\"), Number(process.argv[2]), process.argv[3], ()=>process.exit())' '${base64}' '${port}' '${ip}'`;
  },
  renderConfig: ({ config, onChange }: { config: FormatConfig; onChange: (cfg: FormatConfig) => void }) => {
    const cfg = config as WledConfig;
    const Info = ({ text }: { text: string }) => (
      <Tooltip content={text}>
        <span className="inline-help">
          <Icon path={mdiInformationOutline} size={16} />
        </span>
      </Tooltip>
    );

    return (
      <div className="grid two">
        <div className="field span-two">
          <label className="label">
            Mode{' '}
            <Info
              text={`DRGB: header 0x02 + timeout + full frame (RGB).\nDNRGB: header 0x04 + timeout + start index (2B big-endian) + up to 489 RGB LEDs.\nHyperion: raw RGB bytes, no header. Default port 19446.`}
            />
          </label>
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
            <label className="label">
              Timeout seconds (Byte 1){' '}
              <Info
                text={`WARLS byte 1: timeout seconds before leaving realtime.\nUse 255 to disable timeout (stay in realtime).`}
              />
            </label>
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
          <label className="label">
            Sender{' '}
            <Info
              text={`Node: dgram UDP with base64 payload.\nNetcat: printf base64 | base64 -d | nc -u -w1 -q0.\nDebug: prints hex payload only (no network send).`}
            />
          </label>
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
            <label className="label">
              Start index (0-based){' '}
              <Info
                text={`DNRGB prefix includes 2-byte big-endian start index after timeout.\nPacket fits up to 489 LEDs; indices clamp 0-65535.`}
              />
            </label>
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
};
