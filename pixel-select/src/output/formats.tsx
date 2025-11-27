import type { OutputFormat, RgbColor } from '../types';
import { arduinoFormat } from './formatters/arduino';
import { bufferFormat } from './formatters/buffer';
import { esphomeStaticFormat } from './formatters/esphomeStatic';
import { pngFormat } from './formatters/png';
import type { FormatConfig, FormatContext, OutputFormatDefinition } from './formatters/types';
import { uploadablePngFormat } from './formatters/uploadablePng';
import { wledJsonFormat } from './formatters/wledJson';
import { wledFormat } from './formatters/wled';

export type { FormatConfig, FormatConfigRenderer, FormatContext, OutputFormatDefinition } from './formatters/types';

export const formatDefinitions: OutputFormatDefinition[] = [
  bufferFormat,
  arduinoFormat,
  esphomeStaticFormat,
  pngFormat,
  uploadablePngFormat,
  wledJsonFormat,
  wledFormat,
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
  ctx?: FormatContext,
) => {
  const def = getFormatDefinition(id);
  if (!def) {
    return 'Unsupported format';
  }
  const config = (configs?.[id] ?? def.defaultConfig) as FormatConfig;
  return def.generate(colors, config, ctx);
};
