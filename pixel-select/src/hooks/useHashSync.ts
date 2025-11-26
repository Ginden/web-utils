import { useEffect, useState } from 'react';
import type { DisplayType, RgbColor } from '../types';
import { parseNumber, parsePositiveInt, sanitizeLedColors } from '../utils/ledState';
import { hexToRgb } from '../utils/colorUtils';
import {
  DEFAULT_MATRIX_HEIGHT,
  DEFAULT_MATRIX_WIDTH,
  DEFAULT_RING_LED_COUNT,
  DEFAULT_STRIP_LED_COUNT,
  getLedCount,
} from '../utils/ledState';

type Setters = {
  setDisplayType: (next: DisplayType) => void;
  setRingLeds: (value: number) => void;
  setStripLeds: (value: number) => void;
  setMatrixWidth: (value: number) => void;
  setMatrixHeight: (value: number) => void;
  setRotation: (value: number) => void;
  setShowLabels: (value: boolean) => void;
  setLedColors: (colors: RgbColor[]) => void;
};

type State = {
  displayType: DisplayType;
  ringLeds: number;
  stripLeds: number;
  matrixWidth: number;
  matrixHeight: number;
  rotation: number;
  showLabels: boolean;
  ledColors: RgbColor[];
};

export const useHashSync = (state: State, setters: Setters) => {
  const [hashInitialized, setHashInitialized] = useState(false);
  const { displayType, ringLeds, stripLeds, matrixWidth, matrixHeight, rotation, showLabels, ledColors } = state;

  const encodeColorsBase64 = (colors: RgbColor[]) => {
    const bytes = new Uint8Array(colors.length * 3);
    colors.forEach(([r, g, b], idx) => {
      const base = idx * 3;
      bytes[base] = Math.max(0, Math.min(255, r));
      bytes[base + 1] = Math.max(0, Math.min(255, g));
      bytes[base + 2] = Math.max(0, Math.min(255, b));
    });
    let binary = '';
    bytes.forEach((val) => {
      binary += String.fromCharCode(val);
    });
    return btoa(binary);
  };

  const decodeColorsFromParam = (value: string | null): RgbColor[] => {
    if (!value) return [];
    // Migration path: old format was comma-separated hex (#RRGGBB)
    if (value.includes('#') || value.includes(',')) {
      return value.split(',').map((hex) => hexToRgb(hex));
    }
    try {
      const binary = atob(value);
      const result: RgbColor[] = [];
      for (let i = 0; i + 2 < binary.length; i += 3) {
        result.push([binary.charCodeAt(i), binary.charCodeAt(i + 1), binary.charCodeAt(i + 2)]);
      }
      return result;
    } catch {
      return [];
    }
  };

  // Load from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const type = (params.get('type') as DisplayType) || 'ring';
    const rotationFromHash = parseNumber(params.get('rotation'), 0);
    const showLabelsFromHash = params.get('labels') === 'true';

    setTimeout(() => {
      if (type === 'ring' || type === 'matrix' || type === 'strip') {
        setters.setDisplayType(type);

        let initialLedColors: RgbColor[] = [];

        if (type === 'ring') {
          const ringLedCount = parsePositiveInt(params.get('leds'), DEFAULT_RING_LED_COUNT);

          setters.setRingLeds(ringLedCount);

          const parsedColors = decodeColorsFromParam(params.get('colors'));
          initialLedColors = sanitizeLedColors(parsedColors, ringLedCount);
        } else if (type === 'matrix') {
          const parsedWidth = parsePositiveInt(params.get('width'), DEFAULT_MATRIX_WIDTH);
          const parsedHeight = parsePositiveInt(params.get('height'), DEFAULT_MATRIX_HEIGHT);

          setters.setMatrixWidth(parsedWidth);
          setters.setMatrixHeight(parsedHeight);

          const parsedColors = decodeColorsFromParam(params.get('colors'));
          initialLedColors = sanitizeLedColors(parsedColors, parsedWidth * parsedHeight);
        } else {
          const parsedStrip = parsePositiveInt(params.get('leds'), DEFAULT_STRIP_LED_COUNT);
          setters.setStripLeds(parsedStrip);

          const parsedColors = decodeColorsFromParam(params.get('colors'));
          initialLedColors = sanitizeLedColors(parsedColors, parsedStrip);
        }

        setters.setLedColors(initialLedColors); // Set once after determining size
        setters.setRotation(rotationFromHash);
        setters.setShowLabels(showLabelsFromHash);
      }

      setHashInitialized(true);
    }, 0);
  }, [setters]);

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
    params.set('colors', encodeColorsBase64(colorsForHash));

    const hash = params.toString();
    if (window.location.hash !== `#${hash}`) {
      window.location.hash = hash;
    }
  }, [hashInitialized, displayType, matrixHeight, matrixWidth, ringLeds, rotation, showLabels, stripLeds, ledColors]);
};
