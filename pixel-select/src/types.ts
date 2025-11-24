export type DisplayType = 'ring' | 'matrix';

export type RgbColor = [number, number, number];

export type HistoryEntry = {
  timestamp: string;
  summary?: string;
  ledColors: RgbColor[];
  rotation: number;
  showLabels: boolean;
} & (
  | {
      displayType: 'ring';
      ringLeds: number;
    }
  | {
      displayType: 'matrix';
      matrixWidth: number;
      matrixHeight: number;
    }
);

export type RingLayoutConfig = {
  /** Desired arc distance between diode centers in px. */
  spacingPx: number;
  /** PCB thickness ratio relative to ring size. */
  pcbRatio: number;
};

export type OutputFormat =
  | 'rgb'
  | 'bgr'
  | 'gbr'
  | 'arduino'
  | 'esphome_static'
  | 'png'
  | 'png_bitmap_8x8'
  | 'wled_udp';
