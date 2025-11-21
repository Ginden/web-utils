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
