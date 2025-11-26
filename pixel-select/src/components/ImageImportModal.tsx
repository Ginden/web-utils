import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { RgbColor } from '../types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  matrixWidth: number;
  matrixHeight: number;
  onApply: (colors: RgbColor[]) => void;
};

type CropState = { x: number; y: number; size: number };
type ScalingAlgorithm = 'box' | 'bilinear' | 'bicubic' | 'lanczos';
type BackgroundMode = 'none' | 'color' | 'black';

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

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

const rasterizeSvgText = async (svgText: string): Promise<Blob | null> => {
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

const resample = (
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
    const y0 = Math.floor(sy);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    const fx = sx - x0;
    const fy = sy - y0;

    const p00 = readPixel(x0, y0);
    const p10 = readPixel(x1, y0);
    const p01 = readPixel(x0, y1);
    const p11 = readPixel(x1, y1);

    const mix = (a: number, b: number, t: number) => a + (b - a) * t;

    return [
      mix(mix(p00[0], p10[0], fx), mix(p01[0], p11[0], fx), fy),
      mix(mix(p00[1], p10[1], fx), mix(p01[1], p11[1], fx), fy),
      mix(mix(p00[2], p10[2], fx), mix(p01[2], p11[2], fx), fy),
      mix(mix(p00[3], p10[3], fx), mix(p01[3], p11[3], fx), fy),
    ];
  };

  const bicubicSample = (dx: number, dy: number) => {
    const sx = (dx + 0.5) * scaleX - 0.5;
    const sy = (dy + 0.5) * scaleY - 0.5;
    const xInt = Math.floor(sx);
    const yInt = Math.floor(sy);
    const fx = sx - xInt;
    const fy = sy - yInt;

    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    let weightSum = 0;

    for (let j = -1; j <= 2; j += 1) {
      const wY = cubicWeight(j - fy);
      for (let i = -1; i <= 2; i += 1) {
        const wX = cubicWeight(i - fx);
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

const ImageImportModal: React.FC<Props> = ({ isOpen, onClose, matrixWidth, matrixHeight, onApply }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(null);
  const [crop, setCrop] = useState<CropState | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pixelatedColors, setPixelatedColors] = useState<RgbColor[] | null>(null);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('none');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [blackLift, setBlackLift] = useState(0);
  const [scalingAlgorithm, setScalingAlgorithm] = useState<ScalingAlgorithm>('lanczos');
  const [displayMetrics, setDisplayMetrics] = useState<{
    scaleX: number;
    scaleY: number;
    imgLeft: number;
    imgTop: number;
    containerLeft: number;
    containerTop: number;
  } | null>(null);
  const previewRaf = useRef<number | null>(null);
  const movePending = useRef<{ x: number; y: number } | null>(null);
  const moveRaf = useRef<number | null>(null);
  const cropRef = useRef<CropState | null>(null);
  const imageDimsRef = useRef<{ w: number; h: number } | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ active: boolean; offsetX: number; offsetY: number }>({
    active: false,
    offsetX: 0,
    offsetY: 0,
  });
  const metricsRaf = useRef<number | null>(null);

  const resetState = useCallback(() => {
    setImageDims(null);
    setCrop(null);
    setPreviewUrl(null);
    setPixelatedColors(null);
    setBackgroundMode('none');
    setBackgroundColor('#000000');
    setBlackLift(0);
    setScalingAlgorithm('lanczos');
    cropRef.current = null;
    imageDimsRef.current = null;
  }, []);

  const loadFromBlob = useCallback(
    async (blob: Blob) => {
      let finalBlob = blob;
      if (blob.type.includes('svg')) {
        try {
          const svgText = await blob.text();
          const raster = await rasterizeSvgText(svgText);
          if (raster) {
            finalBlob = raster;
          }
        } catch (e) {
          console.warn('Falling back to raw SVG load', e);
        }
      }
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
      const url = URL.createObjectURL(finalBlob);
      setImageUrl(url);
      resetState();
    },
    [imageUrl, resetState],
  );

  const loadFromFile = useCallback(
    (file: File) => {
      void loadFromBlob(file);
    },
    [loadFromBlob],
  );

  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    loadFromFile(file);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setImageDims({ w, h });
    imageDimsRef.current = { w, h };
    const size = Math.min(w, h);
    setCrop({ x: (w - size) / 2, y: (h - size) / 2, size });
  };

  useEffect(() => {
    cropRef.current = crop;
  }, [crop]);

  useEffect(() => {
    imageDimsRef.current = imageDims;
  }, [imageDims]);

  const updateMetrics = useCallback(() => {
    if (!imageRef.current || !imageDims || !containerRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    setDisplayMetrics({
      scaleX: imageDims.w / rect.width,
      scaleY: imageDims.h / rect.height,
      imgLeft: rect.left,
      imgTop: rect.top,
      containerLeft: containerRect.left,
      containerTop: containerRect.top,
    });
  }, [imageDims]);

  useEffect(() => {
    updateMetrics();
  }, [imageUrl, updateMetrics]);

  useEffect(() => {
    const onResize = () => {
      if (metricsRaf.current) cancelAnimationFrame(metricsRaf.current);
      metricsRaf.current = requestAnimationFrame(() => {
        metricsRaf.current = null;
        updateMetrics();
      });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [updateMetrics]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!displayMetrics || !crop) return;
    updateMetrics();
    e.preventDefault();
    const { imgLeft, imgTop, scaleX, scaleY } = displayMetrics;
    const x = (e.clientX - imgLeft) * scaleX;
    const y = (e.clientY - imgTop) * scaleY;
    dragState.current = { active: true, offsetX: x - crop.x, offsetY: y - crop.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current.active || !displayMetrics || !crop || !imageDims) return;
    const { imgLeft, imgTop, scaleX, scaleY } = displayMetrics;
    const x = (e.clientX - imgLeft) * scaleX;
    const y = (e.clientY - imgTop) * scaleY;
    const nextX = clamp(x - dragState.current.offsetX, 0, imageDims.w - crop.size);
    const nextY = clamp(y - dragState.current.offsetY, 0, imageDims.h - crop.size);
    movePending.current = { x: nextX, y: nextY };
    if (moveRaf.current === null) {
      moveRaf.current = requestAnimationFrame(() => {
        moveRaf.current = null;
        const pending = movePending.current;
        const dims = imageDimsRef.current;
        const currentCrop = cropRef.current;
        if (!pending || !dims || !currentCrop) return;
        const maxX = Math.max(0, dims.w - currentCrop.size);
        const maxY = Math.max(0, dims.h - currentCrop.size);
        setCrop((prev) => {
          if (!prev) return prev;
          return { ...prev, x: clamp(pending.x, 0, maxX), y: clamp(pending.y, 0, maxY) };
        });
      });
    }
  };

  const handleMouseUp = () => {
    dragState.current.active = false;
    movePending.current = null;
    schedulePreviewRender();
  };

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const schedulePreviewRender = useCallback(() => {
    if (!imageUrl || !cropRef.current || !imageDimsRef.current) return;
    const cropState = cropRef.current;
    const img = imageRef.current;
    if (!img) return;
    if (previewRaf.current) cancelAnimationFrame(previewRaf.current);
    previewRaf.current = requestAnimationFrame(() => {
      const cropSize = Math.round(cropState.size);
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = cropSize;
      sourceCanvas.height = cropSize;
      const srcCtx = sourceCanvas.getContext('2d');
      if (!srcCtx) return;

      if (backgroundMode === 'color') {
        srcCtx.fillStyle = backgroundColor;
        srcCtx.fillRect(0, 0, cropSize, cropSize);
      } else {
        // keep transparent for "none" and "black" so alpha drives lifting
        srcCtx.clearRect(0, 0, cropSize, cropSize);
      }
      srcCtx.drawImage(img, cropState.x, cropState.y, cropState.size, cropState.size, 0, 0, cropSize, cropSize);

      const srcData = srcCtx.getImageData(0, 0, cropSize, cropSize);
      const resampled = resample(srcData.data, cropSize, cropSize, matrixWidth, matrixHeight, scalingAlgorithm);

      if (backgroundMode === 'black' && blackLift > 0) {
        const lift = blackLift;
        const scale = (255 - lift) / 255;
        for (let i = 0; i < resampled.length; i += 4) {
          const alpha = resampled[i + 3];
          if (alpha === 0) continue;
          resampled[i] = clamp(Math.round(lift + resampled[i] * scale), 0, 255);
          resampled[i + 1] = clamp(Math.round(lift + resampled[i + 1] * scale), 0, 255);
          resampled[i + 2] = clamp(Math.round(lift + resampled[i + 2] * scale), 0, 255);
        }
      }

      const destCanvas = document.createElement('canvas');
      destCanvas.width = matrixWidth;
      destCanvas.height = matrixHeight;
      const destCtx = destCanvas.getContext('2d');
      if (!destCtx) return;
      const destImage = new ImageData(new Uint8ClampedArray(resampled), matrixWidth, matrixHeight);
      destCtx.putImageData(destImage, 0, 0);

      setPreviewUrl(destCanvas.toDataURL('image/png'));
      const result: RgbColor[] = [];
      for (let i = 0; i < resampled.length; i += 4) {
        const alpha = resampled[i + 3] / 255;
        const r = Math.round(resampled[i] * alpha);
        const g = Math.round(resampled[i + 1] * alpha);
        const b = Math.round(resampled[i + 2] * alpha);
        result.push([r, g, b]);
      }
      setPixelatedColors(result);
    });
  }, [backgroundColor, backgroundMode, blackLift, imageUrl, matrixHeight, matrixWidth, scalingAlgorithm]);

  const handleSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!imageDims || !crop) return;
    const raw = parseInt(event.target.value, 10) || crop.size;
    const maxSize = Math.min(imageDims.w, imageDims.h);
    const step = Math.max(1, Math.max(matrixWidth, matrixHeight));
    const snapped = Math.round(raw / step) * step;
    const nextSize = clamp(snapped, step, maxSize);
    const maxX = imageDims.w - nextSize;
    const maxY = imageDims.h - nextSize;
    setCrop((prev) =>
      prev ? { ...prev, size: nextSize, x: clamp(prev.x, 0, maxX), y: clamp(prev.y, 0, maxY) } : prev,
    );
  };

  useEffect(() => {
    if (!imageUrl || !crop || !matrixWidth || !matrixHeight) return;
    if (dragState.current.active) return;
    schedulePreviewRender();
  }, [crop, imageDims, imageUrl, matrixHeight, matrixWidth, schedulePreviewRender]);

  useEffect(() => {
    if (!imageUrl || !crop || dragState.current.active) return;
    schedulePreviewRender();
  }, [backgroundColor, backgroundMode, blackLift, scalingAlgorithm, imageUrl, crop, schedulePreviewRender]);

  const handleApply = () => {
    if (!pixelatedColors) return;
    onApply(pixelatedColors);
    handleClose();
  };

  const handleCenterCrop = () => {
    if (!imageDims) return;
    const maxSize = Math.min(imageDims.w, imageDims.h);
    const currentSize = crop?.size ? Math.min(crop.size, maxSize) : maxSize;
    setCrop({ x: (imageDims.w - currentSize) / 2, y: (imageDims.h - currentSize) / 2, size: currentSize });
  };

  const handleClose = () => {
    setImageUrl(null);
    resetState();
    movePending.current = null;
    if (moveRaf.current) {
      cancelAnimationFrame(moveRaf.current);
      moveRaf.current = null;
    }
    if (previewRaf.current) {
      cancelAnimationFrame(previewRaf.current);
      previewRaf.current = null;
    }
    cropRef.current = null;
    imageDimsRef.current = null;
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (item.type && item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              loadFromFile(file);
              return;
            }
          }
        }
      }
      const text = event.clipboardData?.getData('text/plain');
      if (text && /<svg[^>]*>/i.test(text)) {
        event.preventDefault();
        const blob = new Blob([text], { type: 'image/svg+xml' });
        void loadFromBlob(blob);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [isOpen, loadFromBlob, loadFromFile]);

  useEffect(() => {
    return () => {
      if (moveRaf.current) cancelAnimationFrame(moveRaf.current);
      if (previewRaf.current) cancelAnimationFrame(previewRaf.current);
      if (metricsRaf.current) cancelAnimationFrame(metricsRaf.current);
    };
  }, []);

  if (!isOpen) return null;

  const checkerboard = 'repeating-conic-gradient(#ccc 0% 25%, #999 0% 50%) 50% / 16px 16px';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '24px',
        overflow: 'auto',
      }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        style={{
          background: 'var(--surface)',
          color: 'var(--text)',
          maxWidth: '1200px',
          width: '100%',
          borderRadius: '12px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.45)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div>
            <div className="eyebrow">Matrix tool</div>
            <h3 style={{ margin: 0 }}>Upload & crop image</h3>
            <p className="muted" style={{ margin: 0 }}>
              Square crop, auto-resized to {matrixWidth}×{matrixHeight}. Drag crop or adjust size. Paste (Ctrl/Cmd+V) an
              image or upload a file.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn subtle" type="button" onClick={handleClose}>
              Close
            </button>
            <button className="btn primary" type="button" onClick={handleApply} disabled={!pixelatedColors}>
              Apply to matrix
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div
            style={{
              flex: '1 1 360px',
              minHeight: '320px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              position: 'relative',
              overflow: 'hidden',
              background: backgroundMode === 'black' ? '#000' : checkerboard,
              userSelect: 'none',
            }}
            ref={containerRef}
          >
            {!imageUrl && (
              <div style={{ padding: '24px', color: 'var(--muted)', textAlign: 'center' }}>
                Choose an image to start
              </div>
            )}
            {imageUrl && (
              <>
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Upload preview"
                  style={{ width: '100%', height: 'auto', objectFit: 'contain', display: 'block' }}
                  draggable={false}
                  onDragStart={(ev) => ev.preventDefault()}
                  onLoad={handleImageLoad}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                />
                {crop && displayMetrics && (
                  <div
                    style={{
                      position: 'absolute',
                      border: '2px solid #4da3ff',
                      boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                      pointerEvents: 'none',
                      left: `${displayMetrics.imgLeft - displayMetrics.containerLeft + crop.x / displayMetrics.scaleX}px`,
                      top: `${displayMetrics.imgTop - displayMetrics.containerTop + crop.y / displayMetrics.scaleY}px`,
                      width: `${crop.size / displayMetrics.scaleX}px`,
                      height: `${crop.size / displayMetrics.scaleY}px`,
                      borderRadius: '4px',
                    }}
                  />
                )}
              </>
            )}
          </div>
          <div style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="label">Image file</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            {imageDims && crop && (
              <>
                <label className="label">Crop size</label>
                <input
                  type="range"
                  min="20"
                  max={Math.min(imageDims.w, imageDims.h)}
                  step={Math.max(1, Math.max(matrixWidth, matrixHeight))}
                  value={crop.size}
                  onChange={handleSizeChange}
                />
                <div className="muted">
                  {Math.round(crop.size)} px square • image {imageDims.w}×{imageDims.h} • step{' '}
                  {Math.max(1, Math.max(matrixWidth, matrixHeight))} px
                </div>
                <button className="btn ghost" type="button" onClick={handleCenterCrop}>
                  Center crop
                </button>
              </>
            )}
            <div className="field">
              <label className="label">Background</label>
              <select
                className="control"
                value={backgroundMode}
                onChange={(e) => setBackgroundMode(e.target.value as BackgroundMode)}
              >
                <option value="none">Ignore background (transparent)</option>
                <option value="color">Color background</option>
                <option value="black">True black background</option>
              </select>
            </div>
            {backgroundMode === 'color' && (
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                style={{ width: '100%', height: '32px', padding: 0 }}
              />
            )}
            {backgroundMode === 'black' && (
              <div className="field">
                <label className="label">Lift filled pixels</label>
                <input
                  type="range"
                  min={0}
                  max={127}
                  value={blackLift}
                  onChange={(e) => setBlackLift(parseInt(e.target.value, 10) || 0)}
                />
                <div className="muted">{blackLift} (0 = full black)</div>
              </div>
            )}
            <div className="field">
              <label className="label">Scaling algorithm</label>
              <select
                className="control"
                value={scalingAlgorithm}
                onChange={(e) => setScalingAlgorithm(e.target.value as ScalingAlgorithm)}
              >
                <option value="box">Box filter (area average)</option>
                <option value="bilinear">Bilinear</option>
                <option value="bicubic">Bicubic</option>
                <option value="lanczos">Lanczos (sharp)</option>
              </select>
            </div>
            <div className="label">
              Matrix preview ({matrixWidth}×{matrixHeight})
            </div>
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '6px',
                background: backgroundMode === 'black' ? '#000' : checkerboard,
                minHeight: '140px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Pixelated preview"
                  style={{ imageRendering: 'pixelated', width: '100%', height: 'auto', maxWidth: '240px' }}
                />
              ) : (
                <span className="muted">No preview yet</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageImportModal;
