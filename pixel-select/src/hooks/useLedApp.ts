import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSummary } from '../api/SummarizerAPI';
import { hexToRgb, rgbToHex } from '../utils/colorUtils';
import {
  DEFAULT_MATRIX_HEIGHT,
  DEFAULT_MATRIX_WIDTH,
  DEFAULT_RING_LED_COUNT,
  DEFAULT_STRIP_LED_COUNT,
  getLedCount,
  parseNumber,
  parsePositiveInt,
  parseStoredHistory,
  sanitizeLedColors,
} from '../utils/ledState';
import type { DisplayType, HistoryEntry, OutputFormat, RingLayoutConfig, RgbColor } from '../types';
import {
  buildDefaultFormatConfig,
  formatDefinitions,
  generateOutputForFormat,
  getFormatDefinition,
} from '../output/formats';
import { generateMatrixBitmapDataUrl } from '../output/png';

const generateArduinoOutput = (colors: RgbColor[]) => {
  let output = `CRGB leds[] = {\n`;
  output += colors.map(([r, g, b]) => `  CRGB(${r}, ${g}, ${b})`).join(',\n');
  output += `\n};`;
  return output;
};

export const useLedApp = () => {
  const [displayType, setDisplayType] = useState<DisplayType>('ring');
  const [ringLeds, setRingLeds] = useState<number>(DEFAULT_RING_LED_COUNT);
  const [stripLeds, setStripLeds] = useState<number>(DEFAULT_STRIP_LED_COUNT);
  const [matrixWidth, setMatrixWidth] = useState<number>(DEFAULT_MATRIX_WIDTH);
  const [matrixHeight, setMatrixHeight] = useState<number>(DEFAULT_MATRIX_HEIGHT);
  const [ledColors, setLedColors] = useState<RgbColor[]>(() => sanitizeLedColors([], DEFAULT_RING_LED_COUNT));
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
  const [formatConfigs, setFormatConfigs] = useState<Record<OutputFormat, Record<string, unknown>>>(() => {
    const base = buildDefaultFormatConfig();
    const stored = localStorage.getItem('wled_udp_endpoint');
    if (!stored) return base;
    try {
      const parsed = JSON.parse(stored);
      const ip = typeof parsed?.ip === 'string' && parsed.ip.trim() ? parsed.ip.trim() : undefined;
      const port = Number.isFinite(parsed?.port) ? Number(parsed.port) : undefined;
      if (!ip && port === undefined) return base;
      return {
        ...base,
        wled_udp: {
          ...base.wled_udp,
          ...(ip ? { ip } : {}),
          ...(port !== undefined ? { port } : {}),
        },
      };
    } catch (error) {
      console.warn('Failed to parse stored WLED endpoint', error);
      return base;
    }
  });
  const [hashInitialized, setHashInitialized] = useState(false);
  const WLED_ENDPOINT_STORAGE_KEY = 'wled_udp_endpoint';

  const handleDisplayTypeChange = useCallback((next: DisplayType) => {
    setDisplayType(next);
    setSelectedFormat((prev) => {
      const allowed = formatDefinitions.filter((fmt) => !fmt.displayTypes || fmt.displayTypes.includes(next));
      return (allowed.some((f) => f.id === prev) ? prev : (allowed[0]?.id ?? 'rgb')) as OutputFormat;
    });
  }, []);

  const handleSelectFormat = useCallback((next: OutputFormat) => {
    setSelectedFormat(next);
    const def = getFormatDefinition(next);
    if (!def?.eager) {
      setOutputValue('');
    }
  }, []);

  const rotateMatrixPixels = useCallback(
    (angle: 90 | 180 | 270) => {
      if (displayType !== 'matrix') return;
      const w = matrixWidth;
      const h = matrixHeight;
      const ledCount = getLedCount('matrix', ringLeds, w, h, stripLeds);
      const safeColors = sanitizeLedColors(ledColors, ledCount);

      const swap = angle % 180 !== 0;
      const newW = swap ? h : w;
      const newH = swap ? w : h;
      const rotated: RgbColor[] = Array.from({ length: newW * newH }, () => [0, 0, 0]);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
          const color = safeColors[idx] || [0, 0, 0];
          let newX = x;
          let newY = y;
          if (angle === 90) {
            newX = h - 1 - y;
            newY = x;
          } else if (angle === 180) {
            newX = w - 1 - x;
            newY = h - 1 - y;
          } else if (angle === 270) {
            newX = y;
            newY = w - 1 - x;
          }
          const newIdx = newY * newW + newX;
          rotated[newIdx] = color;
        }
      }

      setMatrixWidth(newW);
      setMatrixHeight(newH);
      setLedColors(rotated);
    },
    [displayType, ledColors, matrixHeight, matrixWidth, ringLeds, stripLeds],
  );

  const previewUrl = useMemo(() => {
    if (selectedFormat !== 'png_bitmap_8x8' || displayType !== 'matrix') return undefined;
    const ledCount = getLedCount(displayType, ringLeds, matrixWidth, matrixHeight, stripLeds);
    const safeColors = sanitizeLedColors(ledColors, ledCount);
    return generateMatrixBitmapDataUrl(safeColors, matrixWidth, matrixHeight) || undefined;
  }, [displayType, ledColors, matrixHeight, matrixWidth, ringLeds, selectedFormat, stripLeds]);

  const eagerOutputValue = useMemo(() => {
    const def = getFormatDefinition(selectedFormat);
    if (!def?.eager) return undefined;
    const ledCount = getLedCount(displayType, ringLeds, matrixWidth, matrixHeight, stripLeds);
    const safeColors = sanitizeLedColors(ledColors, ledCount);
    return generateOutputForFormat(safeColors, selectedFormat, formatConfigs, {
      displayType,
      ringLeds,
      matrixWidth,
      matrixHeight,
      stripLeds,
      rotation,
    });
  }, [displayType, formatConfigs, ledColors, matrixHeight, matrixWidth, ringLeds, rotation, selectedFormat, stripLeds]);

  const outputValueToShow = eagerOutputValue ?? outputValue;

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
      if (type === 'ring' || type === 'matrix' || type === 'strip') {
        handleDisplayTypeChange(type);

        let initialLedColors: RgbColor[] = [];

        if (type === 'ring') {
          const ringLedCount = parsePositiveInt(params.get('leds'), DEFAULT_RING_LED_COUNT);

          setRingLeds(ringLedCount);

          const colorsParam = params.get('colors');
          const parsedColors = colorsParam ? colorsParam.split(',').map(hexToRgb) : undefined;

          initialLedColors = sanitizeLedColors(parsedColors, ringLedCount);
        } else if (type === 'matrix') {
          const parsedWidth = parsePositiveInt(params.get('width'), DEFAULT_MATRIX_WIDTH);
          const parsedHeight = parsePositiveInt(params.get('height'), DEFAULT_MATRIX_HEIGHT);

          setMatrixWidth(parsedWidth);
          setMatrixHeight(parsedHeight);

          const colorsParam = params.get('colors');
          const parsedColors = colorsParam ? colorsParam.split(',').map(hexToRgb) : undefined;

          initialLedColors = sanitizeLedColors(parsedColors, parsedWidth * parsedHeight);
        } else {
          const parsedStrip = parsePositiveInt(params.get('leds'), DEFAULT_STRIP_LED_COUNT);
          setStripLeds(parsedStrip);

          const colorsParam = params.get('colors');
          const parsedColors = colorsParam ? colorsParam.split(',').map(hexToRgb) : undefined;
          initialLedColors = sanitizeLedColors(parsedColors, parsedStrip);
        }

        setLedColors(initialLedColors); // Set once after determining size
        setRotation(rotationFromHash);
        setShowLabels(showLabelsFromHash);
      }

      setHashInitialized(true);
    }, 0);
  }, [handleDisplayTypeChange]);

  // Update URL hash on state change
  useEffect(() => {
    if (!hashInitialized) return;

    const ledCount = getLedCount(displayType, ringLeds, matrixWidth, matrixHeight, stripLeds);
    const colorsForHash = sanitizeLedColors(ledColors, ledCount);
    const params = new URLSearchParams();

    params.set('type', displayType);

    if (displayType === 'ring' || displayType === 'strip') {
      params.set('leds', (displayType === 'ring' ? ringLeds : stripLeds).toString());
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
  }, [displayType, ringLeds, matrixWidth, matrixHeight, rotation, showLabels, ledColors, hashInitialized, stripLeds]);

  useEffect(() => {
    const cfg = formatConfigs.wled_udp as { ip?: unknown; port?: unknown } | undefined;
    if (!cfg) return;
    const ip = typeof cfg.ip === 'string' && cfg.ip.trim() ? cfg.ip.trim() : undefined;
    const port = Number.isFinite(cfg.port) ? Number(cfg.port) : undefined;

    if (ip || port !== undefined) {
      localStorage.setItem(WLED_ENDPOINT_STORAGE_KEY, JSON.stringify({ ip, port }));
    } else {
      localStorage.removeItem(WLED_ENDPOINT_STORAGE_KEY);
    }
  }, [formatConfigs.wled_udp, WLED_ENDPOINT_STORAGE_KEY]);

  const handleLedClick = useCallback(
    (index: number) => {
      const ledCount = getLedCount(displayType, ringLeds, matrixWidth, matrixHeight, stripLeds);
      setLedColors((previous) => {
        const safeColors = sanitizeLedColors(previous, ledCount);
        const newColors = [...safeColors];
        newColors[index] = hexToRgb(currentColor);
        return newColors;
      });
    },
    [currentColor, displayType, matrixHeight, matrixWidth, ringLeds, stripLeds],
  );

  const handleSaveToHistory = useCallback(async () => {
    setIsSummarizing(true);

    const ledCount = getLedCount(displayType, ringLeds, matrixWidth, matrixHeight, stripLeds);
    const safeColors = sanitizeLedColors(ledColors, ledCount);
    const arduinoOutput = generateArduinoOutput(safeColors);
    const summary = await getSummary(arduinoOutput);

    const newHistoryEntry: HistoryEntry = {
      ...(displayType === 'ring'
        ? {
            displayType,
            ringLeds,
          }
        : displayType === 'matrix'
          ? {
              displayType,
              matrixWidth,
              matrixHeight,
            }
          : {
              displayType,
              stripLeds,
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
  }, [displayType, history, ledColors, matrixHeight, matrixWidth, ringLeds, rotation, showLabels, stripLeds]);

  const handleDeleteFromHistory = useCallback(
    (timestamp: string) => {
      const updatedHistory = history.filter((entry) => entry.timestamp !== timestamp);
      setHistory(updatedHistory);
      localStorage.setItem('led_history', JSON.stringify(updatedHistory));
    },
    [history],
  );

  const loadFromHistory = useCallback(
    (entry: HistoryEntry) => {
      handleDisplayTypeChange(entry.displayType);
      if (entry.displayType === 'ring') {
        setRingLeds(entry.ringLeds);
      } else if (entry.displayType === 'matrix') {
        setMatrixWidth(entry.matrixWidth);
        setMatrixHeight(entry.matrixHeight);
      } else {
        setStripLeds(entry.stripLeds);
      }
      setRotation(entry.rotation || 0);
      setShowLabels(entry.showLabels === undefined ? true : entry.showLabels);

      const ledCount =
        entry.displayType === 'ring'
          ? entry.ringLeds
          : entry.displayType === 'matrix'
            ? entry.matrixWidth * entry.matrixHeight
            : entry.stripLeds;
      setLedColors(sanitizeLedColors(entry.ledColors, ledCount));
    },
    [handleDisplayTypeChange],
  );

  const handleOutputRequest = useCallback(
    (format: OutputFormat) => {
      const ledCount = getLedCount(displayType, ringLeds, matrixWidth, matrixHeight, stripLeds);
      const safeColors = sanitizeLedColors(ledColors, ledCount);

      // Special handling for matrix PNG bitmap to support preview + proper downloads
      if (format === 'png_bitmap_8x8') {
        if (displayType !== 'matrix') {
          setOutputValue('Uploadable PNG works only in matrix mode');
          return;
        }
        const url = previewUrl ?? generateMatrixBitmapDataUrl(safeColors, matrixWidth, matrixHeight);
        if (!url) {
          setOutputValue('Failed to generate PNG');
          return;
        }
        // Trigger a download so the user gets a real file for hosting
        const link = document.createElement('a');
        link.href = url;
        link.download = `pixel-select-${matrixWidth}x${matrixHeight}-${Date.now()}.png`;
        link.click();
        setOutputValue(`${matrixWidth}x${matrixHeight} PNG downloaded`);
        return;
      }

      setOutputValue(
        generateOutputForFormat(safeColors, format, formatConfigs, {
          displayType,
          ringLeds,
          matrixWidth,
          matrixHeight,
          stripLeds,
          rotation,
        }),
      );
    },
    [displayType, formatConfigs, ledColors, matrixHeight, matrixWidth, ringLeds, rotation, previewUrl, stripLeds],
  );

  return {
    state: {
      displayType,
      ringLeds,
      matrixWidth,
      matrixHeight,
      ledColors,
      currentColor,
      outputValue: outputValueToShow,
      history,
      rotation,
      showLabels,
      isSummarizing,
      ringLayoutConfig,
      selectedFormat,
      formatConfigs,
      outputPreviewUrl: previewUrl,
      stripLeds,
    },
    actions: {
      setDisplayType: handleDisplayTypeChange,
      setRingLeds,
      setStripLeds,
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
      setSelectedFormat: handleSelectFormat,
      setFormatConfigs,
      rotateMatrixPixels,
    },
  };
};
