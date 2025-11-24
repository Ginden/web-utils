import { useCallback, useEffect, useState } from 'react';
import { getSummary } from '../api/SummarizerAPI';
import { hexToRgb, rgbToHex } from '../utils/colorUtils';
import {
  DEFAULT_MATRIX_HEIGHT,
  DEFAULT_MATRIX_WIDTH,
  DEFAULT_RING_LED_COUNT,
  getLedCount,
  parseNumber,
  parsePositiveInt,
  parseStoredHistory,
  sanitizeLedColors,
} from '../utils/ledState';
import type { DisplayType, HistoryEntry, OutputFormat, RingLayoutConfig, RgbColor } from '../types';
import { buildDefaultFormatConfig, generateOutputForFormat } from '../output/formats';

const generateArduinoOutput = (colors: RgbColor[]) => {
  let output = `CRGB leds[] = {\n`;
  output += colors.map(([r, g, b]) => `  CRGB(${r}, ${g}, ${b})`).join(',\n');
  output += `\n};`;
  return output;
};

export const useLedApp = () => {
  const [displayType, setDisplayType] = useState<DisplayType>('ring');
  const [ringLeds, setRingLeds] = useState<number>(DEFAULT_RING_LED_COUNT);
  const [matrixWidth, setMatrixWidth] = useState<number>(DEFAULT_MATRIX_WIDTH);
  const [matrixHeight, setMatrixHeight] = useState<number>(DEFAULT_MATRIX_HEIGHT);
  const [ledColors, setLedColors] = useState<RgbColor[]>(() =>
    sanitizeLedColors([], DEFAULT_RING_LED_COUNT),
  );
  const [currentColor, setCurrentColor] = useState<string>('#FF0000');
  const [outputValue, setOutputValue] = useState<string>('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [rotation, setRotation] = useState<number>(0);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [ringLayoutConfig] = useState<RingLayoutConfig>({
    spacingPx: 22,
    pcbRatio: 0.035,
  });
  const [selectedFormat, setSelectedFormat] = useState<OutputFormat>('rgb');
  const [formatConfigs, setFormatConfigs] = useState<Record<OutputFormat, Record<string, unknown>>>(
    () => buildDefaultFormatConfig(),
  );
  const WLED_ENDPOINT_STORAGE_KEY = 'wled_udp_endpoint';

  // Load from URL hash and localStorage on mount
  useEffect(() => {
    const savedHistory = parseStoredHistory(localStorage.getItem('led_history'));

    if (savedHistory.length) {
      // Defer state update to avoid synchronous setState in effect
      setTimeout(() => setHistory(savedHistory), 0);
    }

    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const type = (params.get('type') as DisplayType) || 'ring';
    const rotationFromHash = parseNumber(params.get('rotation'), 0);
    const showLabelsFromHash = params.get('labels') === 'true';

    // Defer all state updates that depend on URL parameters
    setTimeout(() => {
      if (type === 'ring' || type === 'matrix') {
        setDisplayType(type);

        let initialLedColors: RgbColor[] = [];

        if (type === 'ring') {
          const ringLedCount = parsePositiveInt(params.get('leds'), DEFAULT_RING_LED_COUNT);

          setRingLeds(ringLedCount);

          const colorsParam = params.get('colors');
          const parsedColors = colorsParam ? colorsParam.split(',').map(hexToRgb) : undefined;

          initialLedColors = sanitizeLedColors(parsedColors, ringLedCount);
        } else {
          const parsedWidth = parsePositiveInt(params.get('width'), DEFAULT_MATRIX_WIDTH);
          const parsedHeight = parsePositiveInt(params.get('height'), DEFAULT_MATRIX_HEIGHT);

          setMatrixWidth(parsedWidth);
          setMatrixHeight(parsedHeight);

          const colorsParam = params.get('colors');
          const parsedColors = colorsParam ? colorsParam.split(',').map(hexToRgb) : undefined;

          initialLedColors = sanitizeLedColors(parsedColors, parsedWidth * parsedHeight);
        }

        setLedColors(initialLedColors); // Set once after determining size
        setRotation(rotationFromHash);
        setShowLabels(showLabelsFromHash);
      }
    }, 0);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(WLED_ENDPOINT_STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      const ip = typeof parsed?.ip === 'string' && parsed.ip.trim() ? parsed.ip.trim() : undefined;
      const port = Number.isFinite(parsed?.port) ? Number(parsed.port) : undefined;
      if (!ip && port === undefined) return;
      setFormatConfigs((prev) => ({
        ...prev,
        wled_udp: {
          ...prev.wled_udp,
          ...(ip ? { ip } : {}),
          ...(port !== undefined ? { port } : {}),
        },
      }));
    } catch (error) {
      console.warn('Failed to parse stored WLED endpoint', error);
    }
  }, [setFormatConfigs, WLED_ENDPOINT_STORAGE_KEY]);

  // Update URL hash on state change
  useEffect(() => {
    const ledCount = getLedCount(displayType, ringLeds, matrixWidth, matrixHeight);
    const colorsForHash = sanitizeLedColors(ledColors, ledCount);
    const params = new URLSearchParams();

    params.set('type', displayType);

    if (displayType === 'ring') {
      params.set('leds', ringLeds.toString());
    } else {
      params.set('width', matrixWidth.toString());
      params.set('height', matrixHeight.toString());
    }

    params.set('rotation', rotation.toString());
    params.set('labels', String(showLabels));
    params.set('colors', colorsForHash.map(rgbToHex).join(','));

    const hash = params.toString();
    if (window.location.hash !== `#${hash}`) {
      window.location.hash = hash;
    }
  }, [displayType, ringLeds, matrixWidth, matrixHeight, rotation, showLabels, ledColors]);

  useEffect(() => {
    const cfg = formatConfigs.wled_udp as { ip?: unknown; port?: unknown } | undefined;
    if (!cfg) return;
    const ip = typeof cfg.ip === 'string' && cfg.ip.trim() ? cfg.ip.trim() : undefined;
    const port = Number.isFinite(cfg.port) ? Number(cfg.port) : undefined;

    if (ip || port !== undefined) {
      localStorage.setItem(
        WLED_ENDPOINT_STORAGE_KEY,
        JSON.stringify({ ip, port }),
      );
    } else {
      localStorage.removeItem(WLED_ENDPOINT_STORAGE_KEY);
    }
  }, [formatConfigs.wled_udp, WLED_ENDPOINT_STORAGE_KEY]);

  const handleLedClick = useCallback(
    (index: number) => {
      const ledCount = getLedCount(displayType, ringLeds, matrixWidth, matrixHeight);
      setLedColors((previous) => {
        const safeColors = sanitizeLedColors(previous, ledCount);
        const newColors = [...safeColors];
        newColors[index] = hexToRgb(currentColor);
        return newColors;
      });
    },
    [currentColor, displayType, matrixHeight, matrixWidth, ringLeds],
  );

  const handleSaveToHistory = useCallback(async () => {
    setIsSummarizing(true);

    const ledCount = getLedCount(displayType, ringLeds, matrixWidth, matrixHeight);
    const safeColors = sanitizeLedColors(ledColors, ledCount);
    const arduinoOutput = generateArduinoOutput(safeColors);
    const summary = await getSummary(arduinoOutput);

    const newHistoryEntry: HistoryEntry = {
      ...(displayType === 'ring'
        ? {
            displayType,
            ringLeds,
          }
        : {
            displayType,
            matrixWidth,
            matrixHeight,
          }),
      ledColors: safeColors,
      rotation,
      showLabels,
      timestamp: new Date().toISOString(),
      summary,
    };

    const updatedHistory = [newHistoryEntry, ...history];

    setHistory(updatedHistory);
    localStorage.setItem('led_history', JSON.stringify(updatedHistory));
    setIsSummarizing(false);
  }, [displayType, history, ledColors, matrixHeight, matrixWidth, ringLeds, rotation, showLabels]);

  const handleDeleteFromHistory = useCallback(
    (timestamp: string) => {
      const updatedHistory = history.filter((entry) => entry.timestamp !== timestamp);
      setHistory(updatedHistory);
      localStorage.setItem('led_history', JSON.stringify(updatedHistory));
    },
    [history],
  );

  const loadFromHistory = useCallback((entry: HistoryEntry) => {
    setDisplayType(entry.displayType);
    if (entry.displayType === 'ring') {
      setRingLeds(entry.ringLeds);
    } else {
      setMatrixWidth(entry.matrixWidth);
      setMatrixHeight(entry.matrixHeight);
    }
    setRotation(entry.rotation || 0);
    setShowLabels(entry.showLabels === undefined ? true : entry.showLabels);

    const ledCount =
      entry.displayType === 'ring' ? entry.ringLeds : entry.matrixWidth * entry.matrixHeight;
    setLedColors(sanitizeLedColors(entry.ledColors, ledCount));
  }, []);

  const handleOutputRequest = useCallback(
    (format: OutputFormat) => {
      const ledCount = getLedCount(displayType, ringLeds, matrixWidth, matrixHeight);
      const safeColors = sanitizeLedColors(ledColors, ledCount);
      setOutputValue(
        generateOutputForFormat(safeColors, format, formatConfigs, {
          displayType,
          ringLeds,
          matrixWidth,
          matrixHeight,
          rotation,
        }),
      );
    },
    [displayType, formatConfigs, ledColors, matrixHeight, matrixWidth, ringLeds, rotation],
  );

  return {
    state: {
      displayType,
      ringLeds,
      matrixWidth,
      matrixHeight,
      ledColors,
      currentColor,
      outputValue,
      history,
      rotation,
      showLabels,
      isSummarizing,
      ringLayoutConfig,
      selectedFormat,
      formatConfigs,
    },
    actions: {
      setDisplayType,
      setRingLeds,
      setMatrixWidth,
      setMatrixHeight,
      setCurrentColor,
      setRotation,
      setShowLabels,
      handleLedClick,
      handleSaveToHistory,
      handleDeleteFromHistory,
      handleOutputRequest,
      loadFromHistory,
      setOutputValue,
      setLedColors,
      setSelectedFormat,
      setFormatConfigs,
    },
  };
};
