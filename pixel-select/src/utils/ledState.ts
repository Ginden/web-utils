import type { DisplayType, HistoryEntry, RgbColor } from '../types';

export const DEFAULT_RING_LED_COUNT = 24;
export const DEFAULT_MATRIX_WIDTH = 8;
export const DEFAULT_MATRIX_HEIGHT = 8;
export const DEFAULT_STRIP_LED_COUNT = 60;
export const MAX_STRIP_ROW_LENGTH = 16;

export const createBlankColors = (count: number): RgbColor[] => Array.from({ length: count }, () => [0, 0, 0]);

export const clampChannel = (value: unknown) => {
  const numeric = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(255, Math.round(numeric)));
};

export const sanitizeLedColors = (colors: unknown, expectedLength: number): RgbColor[] => {
  if (!Array.isArray(colors)) {
    return createBlankColors(expectedLength);
  }

  const sanitized = colors.map((color) => {
    if (Array.isArray(color) && color.length === 3) {
      return [clampChannel(color[0]), clampChannel(color[1]), clampChannel(color[2])] as RgbColor;
    }
    return [0, 0, 0] as RgbColor;
  });

  if (sanitized.length < expectedLength) {
    return [...sanitized, ...createBlankColors(expectedLength - sanitized.length)];
  }

  return sanitized.slice(0, expectedLength);
};

export const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const parseNumber = (value: unknown, fallback: number) => {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const withBaseMetadata = (entry: unknown) => {
  const typed = entry as Partial<HistoryEntry> | undefined;
  return {
    timestamp: typeof typed?.timestamp === 'string' ? typed.timestamp : new Date().toISOString(),
    summary: typeof typed?.summary === 'string' ? typed.summary : undefined,
    rotation: parseNumber((typed as { rotation?: unknown } | undefined)?.rotation, 0),
    showLabels: typed?.showLabels === undefined ? true : Boolean(typed.showLabels),
    ledColors: Array.isArray(typed?.ledColors) ? typed.ledColors : [],
  };
};

export const sanitizeHistoryEntry = (entry: unknown): HistoryEntry | null => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const typedEntry = entry as Record<string, unknown>;
  const base = withBaseMetadata(typedEntry);

  if (typedEntry.displayType === 'ring') {
    const ringLeds = parsePositiveInt(typedEntry.ringLeds, DEFAULT_RING_LED_COUNT);
    return {
      displayType: 'ring',
      ringLeds,
      ledColors: sanitizeLedColors(base.ledColors, ringLeds),
      timestamp: base.timestamp,
      summary: base.summary,
      rotation: base.rotation,
      showLabels: base.showLabels,
    };
  }

  if (typedEntry.displayType === 'matrix') {
    const matrixWidth = parsePositiveInt(typedEntry.matrixWidth, DEFAULT_MATRIX_WIDTH);
    const matrixHeight = parsePositiveInt(typedEntry.matrixHeight, DEFAULT_MATRIX_HEIGHT);
    const ledCount = matrixWidth * matrixHeight || DEFAULT_MATRIX_WIDTH * DEFAULT_MATRIX_HEIGHT;

    return {
      displayType: 'matrix',
      matrixWidth,
      matrixHeight,
      ledColors: sanitizeLedColors(base.ledColors, ledCount),
      timestamp: base.timestamp,
      summary: base.summary,
      rotation: base.rotation,
      showLabels: base.showLabels,
    };
  }

  if (typedEntry.displayType === 'strip') {
    const stripLeds = parsePositiveInt(typedEntry.stripLeds, DEFAULT_STRIP_LED_COUNT);
    return {
      displayType: 'strip',
      stripLeds,
      ledColors: sanitizeLedColors(base.ledColors, stripLeds),
      timestamp: base.timestamp,
      summary: base.summary,
      rotation: base.rotation,
      showLabels: base.showLabels,
    };
  }

  return null;
};

export const parseStoredHistory = (raw: string | null): HistoryEntry[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((entry) => sanitizeHistoryEntry(entry)).filter((entry): entry is HistoryEntry => Boolean(entry));
  } catch (e) {
    console.error('Failed to parse history from localStorage', e);
    return [];
  }
};

export const getLedCount = (
  displayType: DisplayType,
  ringLeds: number,
  matrixWidth: number,
  matrixHeight: number,
  stripLeds?: number,
) => {
  if (displayType === 'ring') return ringLeds;
  if (displayType === 'strip') return stripLeds ?? DEFAULT_STRIP_LED_COUNT;
  return matrixWidth * matrixHeight;
};

export const describeConfiguration = (entry: HistoryEntry) =>
  entry.displayType === 'ring'
    ? `Ring • ${entry.ringLeds} LEDs`
    : entry.displayType === 'matrix'
      ? `Matrix • ${entry.matrixWidth} x ${entry.matrixHeight}`
      : `Strip • ${entry.stripLeds} LEDs`;
