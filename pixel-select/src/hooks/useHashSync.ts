import { useEffect, useState } from 'react';
import type { DisplayType, RgbColor } from '../types';
import { parseNumber, parsePositiveInt, sanitizeLedColors } from '../utils/ledState';
import { hexToRgb, rgbToHex } from '../utils/colorUtils';
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

          const colorsParam = params.get('colors');
          const parsedColors = colorsParam ? colorsParam.split(',').map(hexToRgb) : undefined;

          initialLedColors = sanitizeLedColors(parsedColors, ringLedCount);
        } else if (type === 'matrix') {
          const parsedWidth = parsePositiveInt(params.get('width'), DEFAULT_MATRIX_WIDTH);
          const parsedHeight = parsePositiveInt(params.get('height'), DEFAULT_MATRIX_HEIGHT);

          setters.setMatrixWidth(parsedWidth);
          setters.setMatrixHeight(parsedHeight);

          const colorsParam = params.get('colors');
          const parsedColors = colorsParam ? colorsParam.split(',').map(hexToRgb) : undefined;

          initialLedColors = sanitizeLedColors(parsedColors, parsedWidth * parsedHeight);
        } else {
          const parsedStrip = parsePositiveInt(params.get('leds'), DEFAULT_STRIP_LED_COUNT);
          setters.setStripLeds(parsedStrip);

          const colorsParam = params.get('colors');
          const parsedColors = colorsParam ? colorsParam.split(',').map(hexToRgb) : undefined;
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
    params.set('colors', colorsForHash.map(rgbToHex).join(','));

    const hash = params.toString();
    if (window.location.hash !== `#${hash}`) {
      window.location.hash = hash;
    }
  }, [hashInitialized, displayType, matrixHeight, matrixWidth, ringLeds, rotation, showLabels, stripLeds, ledColors]);
};
