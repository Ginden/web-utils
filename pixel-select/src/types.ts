export type DisplayType = 'ring' | 'matrix' | 'strip';

export type RgbColor = [number, number, number];

export type HistoryEntry = {
  timestamp: string;
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
  | {
      displayType: 'strip';
      stripLeds: number;
    }
);

export type RingLayoutConfig = {
  /** Desired arc distance between diode centers in px. */
  spacingPx: number;
  /** PCB thickness ratio relative to ring size. */
  pcbRatio: number;
};

export type OutputFormat = 'buffer' | 'arduino' | 'esphome_static' | 'png' | 'png_bitmap_8x8' | 'wled_udp';
