export type ScalingAlgorithm = 'box' | 'bilinear' | 'bicubic' | 'lanczos';

export const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const parseSvgSize = (svgText: string): { width: number; height: number } => {
  const viewBoxMatch = svgText.match(/viewBox=["']?([^"']+)["']?/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/\s+/);
    if (parts.length === 4) {
      const width = parseFloat(parts[2]);
      const height = parseFloat(parts[3]);
      if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
        return { width, height };
      }
    }
  }
  const widthMatch = svgText.match(/width=["']?([0-9.]+)(px)?["']?/i);
  const heightMatch = svgText.match(/height=["']?([0-9.]+)(px)?["']?/i);
  const width = widthMatch ? parseFloat(widthMatch[1]) : 0;
  const height = heightMatch ? parseFloat(heightMatch[1]) : 0;
  if (width > 0 && height > 0) {
    return { width, height };
  }
  return { width: 512, height: 512 };
};

export const rasterizeSvgText = async (svgText: string): Promise<Blob | null> => {
  const { width, height } = parseSvgSize(svgText);
  const maxSide = 960;
  const scale = Math.min(maxSide / width, maxSide / height);
  const canvasWidth = Math.max(1, Math.round(width * scale));
  const canvasHeight = Math.max(1, Math.round(height * scale));

  const blob = new Blob([svgText], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });
  } catch (e) {
    console.error('Failed to rasterize SVG', e);
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const cubicWeight = (x: number) => {
  const a = -0.5; // Catmull-Rom spline
  const abs = Math.abs(x);
  if (abs <= 1) {
    return (a + 2) * abs * abs * abs - (a + 3) * abs * abs + 1;
  }
  if (abs < 2) {
    return a * abs * abs * abs - 5 * a * abs * abs + 8 * a * abs - 4 * a;
  }
  return 0;
};

const sinc = (x: number) => {
  if (x === 0) return 1;
  const pix = Math.PI * x;
  return Math.sin(pix) / pix;
};

export const resample = (
  src: Uint8ClampedArray,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
  mode: ScalingAlgorithm,
): Uint8ClampedArray => {
  const dst = new Uint8ClampedArray(dw * dh * 4);
  const scaleX = sw / dw;
  const scaleY = sh / dh;

  const premult = new Float32Array(sw * sh * 4);
  for (let i = 0; i < src.length; i += 4) {
    const a = src[i + 3] / 255;
    premult[i] = src[i] * a;
    premult[i + 1] = src[i + 1] * a;
    premult[i + 2] = src[i + 2] * a;
    premult[i + 3] = src[i + 3];
  }

  const readPixel = (x: number, y: number) => {
    const xi = clamp(Math.round(x), 0, sw - 1);
    const yi = clamp(Math.round(y), 0, sh - 1);
    const idx = (yi * sw + xi) * 4;
    return [premult[idx], premult[idx + 1], premult[idx + 2], premult[idx + 3]];
  };

  const setPixel = (x: number, y: number, r: number, g: number, b: number, a: number) => {
    const idx = (y * dw + x) * 4;
    const alpha = a > 0 ? a : 0;
    const invA = alpha > 0 ? 255 / alpha : 0;
    dst[idx] = alpha > 0 ? clamp(Math.round(r * invA), 0, 255) : 0;
    dst[idx + 1] = alpha > 0 ? clamp(Math.round(g * invA), 0, 255) : 0;
    dst[idx + 2] = alpha > 0 ? clamp(Math.round(b * invA), 0, 255) : 0;
    dst[idx + 3] = a;
  };

  const boxSample = (dx: number, dy: number) => {
    const xStart = dx * scaleX;
    const xEnd = (dx + 1) * scaleX;
    const yStart = dy * scaleY;
    const yEnd = (dy + 1) * scaleY;
    const x0 = Math.floor(xStart);
    const x1 = Math.min(Math.ceil(xEnd), sw);
    const y0 = Math.floor(yStart);
    const y1 = Math.min(Math.ceil(yEnd), sh);
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    let count = 0;
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const idx = (y * sw + x) * 4;
        r += premult[idx];
        g += premult[idx + 1];
        b += premult[idx + 2];
        a += premult[idx + 3];
        count += 1;
      }
    }
    if (count === 0) return [0, 0, 0, 0];
    return [r / count, g / count, b / count, a / count];
  };

  const bilinearSample = (dx: number, dy: number) => {
    const sx = (dx + 0.5) * scaleX - 0.5;
    const sy = (dy + 0.5) * scaleY - 0.5;
    const x0 = Math.floor(sx);
    const x1 = Math.min(Math.ceil(sx), sw - 1);
    const y0 = Math.floor(sy);
    const y1 = Math.min(Math.ceil(sy), sh - 1);

    const wX = sx - x0;
    const wY = sy - y0;

    const read = (x: number, y: number) => {
      const idx = (y * sw + x) * 4;
      return [premult[idx], premult[idx + 1], premult[idx + 2], premult[idx + 3]];
    };

    const p00 = read(x0, y0);
    const p10 = read(x1, y0);
    const p01 = read(x0, y1);
    const p11 = read(x1, y1);

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const r = lerp(lerp(p00[0], p10[0], wX), lerp(p01[0], p11[0], wX), wY);
    const g = lerp(lerp(p00[1], p10[1], wX), lerp(p01[1], p11[1], wX), wY);
    const b = lerp(lerp(p00[2], p10[2], wX), lerp(p01[2], p11[2], wX), wY);
    const a = lerp(lerp(p00[3], p10[3], wX), lerp(p01[3], p11[3], wX), wY);
    return [r, g, b, a];
  };

  const bicubicSample = (dx: number, dy: number) => {
    const sx = (dx + 0.5) * scaleX - 0.5;
    const sy = (dy + 0.5) * scaleY - 0.5;
    const xInt = Math.floor(sx);
    const yInt = Math.floor(sy);
    const xFrac = sx - xInt;
    const yFrac = sy - yInt;

    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    let weightSum = 0;

    for (let j = -1; j <= 2; j += 1) {
      const wY = cubicWeight(j - yFrac);
      for (let i = -1; i <= 2; i += 1) {
        const wX = cubicWeight(i - xFrac);
        const w = wX * wY;
        const [pr, pg, pb, pa] = readPixel(xInt + i, yInt + j);
        r += pr * w;
        g += pg * w;
        b += pb * w;
        a += pa * w;
        weightSum += w;
      }
    }

    const norm = weightSum || 1;
    return [r / norm, g / norm, b / norm, a / norm];
  };

  const lanczosSample = (dx: number, dy: number) => {
    const a = 3; // window size
    const sx = (dx + 0.5) * scaleX - 0.5;
    const sy = (dy + 0.5) * scaleY - 0.5;
    const xStart = Math.floor(sx) - a + 1;
    const xEnd = Math.floor(sx) + a;
    const yStart = Math.floor(sy) - a + 1;
    const yEnd = Math.floor(sy) + a;

    let r = 0;
    let g = 0;
    let b = 0;
    let aSum = 0;
    let weightSum = 0;

    for (let y = yStart; y <= yEnd; y += 1) {
      const dyKernel = sy - y;
      const wy = sinc(dyKernel) * sinc(dyKernel / a);
      for (let x = xStart; x <= xEnd; x += 1) {
        const dxKernel = sx - x;
        const wx = sinc(dxKernel) * sinc(dxKernel / a);
        const w = wx * wy;
        const [pr, pg, pb, pa] = readPixel(x, y);
        r += pr * w;
        g += pg * w;
        b += pb * w;
        aSum += pa * w;
        weightSum += w;
      }
    }

    const norm = weightSum || 1;
    return [r / norm, g / norm, b / norm, aSum / norm];
  };

  for (let y = 0; y < dh; y += 1) {
    for (let x = 0; x < dw; x += 1) {
      let sample: number[];
      switch (mode) {
        case 'box':
          sample = boxSample(x, y);
          break;
        case 'bilinear':
          sample = bilinearSample(x, y);
          break;
        case 'bicubic':
          sample = bicubicSample(x, y);
          break;
        case 'lanczos':
        default:
          sample = lanczosSample(x, y);
          break;
      }
      setPixel(x, y, sample[0], sample[1], sample[2], sample[3]);
    }
  }

  return dst;
};
