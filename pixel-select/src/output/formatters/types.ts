import type React from 'react';
import type { DisplayType, OutputFormat, RgbColor } from '../../types';

export type FormatContext = {
  displayType: DisplayType;
  ringLeds: number;
  matrixWidth: number;
  matrixHeight: number;
  stripLeds: number;
  rotation: number;
};

export type FormatConfig<Props extends Record<string, unknown> = Record<string, unknown>> = Props;

export type FormatConfigRenderer<TConfig extends FormatConfig> = (props: {
  config: TConfig;
  onChange: (config: TConfig) => void;
}) => React.ReactNode;

export type OutputFormatDefinition = {
  id: OutputFormat;
  label: string;
  description?: string;
  /** Optional grouping label for the picker. */
  group?: string;
  defaultConfig: FormatConfig;
  /** Auto-generate output when inputs change (writes to textarea, no downloads). */
  eager?: boolean;
  /** Limit availability to specific display types. */
  displayTypes?: DisplayType[];
  generate: (colors: RgbColor[], config: FormatConfig, ctx?: FormatContext) => string;
  renderConfig?: FormatConfigRenderer<FormatConfig>;
};
