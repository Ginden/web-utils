import type { DisplayType, RgbColor } from '../types';
import { MAX_STRIP_ROW_LENGTH } from '../utils/ledState';

type PngOptions = {
  resolution: number;
  background: string;
  rotation: number;
  displayType: DisplayType;
  ringLeds: number;
  matrixWidth: number;
  matrixHeight: number;
  stripLeds: number;
};

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const drawRing = (
  ctx: CanvasRenderingContext2D,
  colors: RgbColor[],
  { resolution, rotation, ringLeds }: PngOptions,
) => {
  const center = resolution / 2;
  const pcbWidth = clamp(resolution * 0.08, 8, 40);
  const radius = clamp(resolution * 0.35, 60, (resolution - pcbWidth * 2) / 2);
  const ledSize = clamp(resolution * 0.05, 10, pcbWidth * 0.9);

  ctx.save();
  ctx.translate(center, center);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-center, -center);

  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = pcbWidth;
  ctx.stroke();

  for (let i = 0; i < ringLeds; i++) {
    const angle = (i / ringLeds) * Math.PI * 2 - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    const [r, g, b] = colors[i] || [0, 0, 0];
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = Math.max(1, ledSize * 0.05);
    ctx.beginPath();
    ctx.roundRect(x - ledSize / 2, y - ledSize / 2, ledSize, ledSize, ledSize * 0.2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
};

const drawMatrix = (
  ctx: CanvasRenderingContext2D,
  colors: RgbColor[],
  { resolution, rotation, matrixWidth, matrixHeight }: PngOptions,
) => {
  const padding = clamp(resolution * 0.01, 2, 12);
  const margin = clamp(resolution * 0.05, 8, 40);
  const maxCells = Math.max(matrixWidth, matrixHeight, 1);
  const cellSize = clamp((resolution - margin * 2) / maxCells - padding, 12, 42);
  const contentWidth = matrixWidth * (cellSize + padding) - padding;
  const contentHeight = matrixHeight * (cellSize + padding) - padding;
  const svgWidth = contentWidth + margin * 2;
  const svgHeight = contentHeight + margin * 2;
  const offsetX = (resolution - svgWidth) / 2;
  const offsetY = (resolution - svgHeight) / 2;

  const centerX = offsetX + svgWidth / 2;
  const centerY = offsetY + svgHeight / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-centerX, -centerY);

  ctx.fillStyle = '#555';
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(offsetX, offsetY, svgWidth, svgHeight, 6);
  ctx.fill();
  ctx.stroke();

  for (let row = 0; row < matrixHeight; row++) {
    for (let col = 0; col < matrixWidth; col++) {
      const idx = row * matrixWidth + col;
      const x = offsetX + margin + col * (cellSize + padding);
      const y = offsetY + margin + row * (cellSize + padding);
      const [r, g, b] = colors[idx] || [0, 0, 0];
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.strokeStyle = '#333';
      ctx.lineWidth = Math.max(1, cellSize * 0.06);
      ctx.beginPath();
      ctx.roundRect(x, y, cellSize, cellSize, cellSize * 0.2);
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
};

const drawStrip = (
  ctx: CanvasRenderingContext2D,
  colors: RgbColor[],
  { resolution, rotation, stripLeds }: PngOptions,
) => {
  const padding = clamp(resolution * 0.01, 2, 12);
  const margin = clamp(resolution * 0.05, 8, 40);
  const cols = Math.max(1, Math.min(MAX_STRIP_ROW_LENGTH, stripLeds));
  const rows = Math.max(1, Math.ceil(stripLeds / cols));
  const cellSize = clamp((resolution - margin * 2) / cols - padding, 12, 42);
  const maxRowWidth = cols * (cellSize + padding) - padding;
  const rowHeight = cellSize + padding;
  const idealSkew = cellSize * (4 / Math.max(1, rows));
  const rowSkew = clamp(idealSkew, cellSize * 0.25, cellSize * 0.7);
  const maxOffset = Math.min(rowSkew * Math.max(0, rows - 1), maxRowWidth * 0.4);
  const contentHeight = rows * rowHeight - padding;
  const svgWidth = maxRowWidth + margin * 2 + maxOffset;
  const svgHeight = contentHeight + margin * 2;
  const offsetX = (resolution - svgWidth) / 2;
  const offsetY = (resolution - svgHeight) / 2;
  const centerX = offsetX + svgWidth / 2;
  const centerY = offsetY + svgHeight / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-centerX, -centerY);

  const points: { cx: number; cy: number }[] = [];

  for (let index = 0; index < stripLeds; index++) {
    const row = Math.floor(index / cols);
    const indexInRow = index - row * cols;
    const rowWidth = Math.min(cols, stripLeds - row * cols);
    const col = row % 2 === 0 ? indexInRow : rowWidth - 1 - indexInRow;
    const rowVisualWidth = rowWidth * (cellSize + padding) - padding;
    const xOffset = row * rowSkew;
    const anchor = row % 2 === 0 ? 0 : maxRowWidth - rowVisualWidth;
    const xStart = offsetX + anchor + xOffset;
    const yStart = offsetY + row * rowHeight;
    const cx = xStart + col * (cellSize + padding) + cellSize / 2;
    const cy = yStart + cellSize / 2;
    points.push({ cx, cy });
  }

  const trackWidth = Math.max(8, cellSize * 1.2);
  ctx.strokeStyle = '#323232';
  ctx.lineWidth = trackWidth * 1.25;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  points.forEach(({ cx, cy }, idx) => {
    if (idx === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  });
  ctx.stroke();

  ctx.strokeStyle = '#555';
  ctx.lineWidth = trackWidth;
  ctx.beginPath();
  points.forEach(({ cx, cy }, idx) => {
    if (idx === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  });
  ctx.stroke();

  for (let index = 0; index < stripLeds; index++) {
    const row = Math.floor(index / cols);
    const indexInRow = index - row * cols;
    const rowWidth = Math.min(cols, stripLeds - row * cols);
    const col = row % 2 === 0 ? indexInRow : rowWidth - 1 - indexInRow;
    const rowVisualWidth = rowWidth * (cellSize + padding) - padding;
    const xOffset = row * rowSkew;
    const anchor = row % 2 === 0 ? 0 : maxRowWidth - rowVisualWidth;
    const xStart = offsetX + anchor + xOffset;
    const yStart = offsetY + row * rowHeight;
    const x = xStart + col * (cellSize + padding);
    const y = yStart;
    const [r, g, b] = colors[index] || [0, 0, 0];
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = Math.max(1, cellSize * 0.06);
    ctx.beginPath();
    ctx.roundRect(x, y, cellSize, cellSize, cellSize * 0.2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
};

export const generatePngDataUrl = (colors: RgbColor[], options: PngOptions) => {
  const resolution = clamp(options.resolution, 128, 4096);
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = options.background;
  ctx.fillRect(0, 0, resolution, resolution);

  if (options.displayType === 'ring') {
    drawRing(ctx, colors, options);
  } else if (options.displayType === 'matrix') {
    drawMatrix(ctx, colors, options);
  } else {
    drawStrip(ctx, colors, options);
  }

  return canvas.toDataURL('image/png');
};

export const generateMatrixBitmapDataUrl = (colors: RgbColor[], width: number, height: number) => {
  if (width <= 0 || height <= 0) return '';
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imageData = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const [r, g, b] = colors[idx] || [0, 0, 0];
      const offset = idx * 4;
      imageData.data[offset] = Math.max(0, Math.min(255, r));
      imageData.data[offset + 1] = Math.max(0, Math.min(255, g));
      imageData.data[offset + 2] = Math.max(0, Math.min(255, b));
      imageData.data[offset + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};
