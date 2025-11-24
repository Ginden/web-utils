import type { DisplayType, RgbColor } from '../types';

type PngOptions = {
  resolution: number;
  background: string;
  rotation: number;
  displayType: DisplayType;
  ringLeds: number;
  matrixWidth: number;
  matrixHeight: number;
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
  } else {
    drawMatrix(ctx, colors, options);
  }

  return canvas.toDataURL('image/png');
};
