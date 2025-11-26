import React, { useEffect, useRef, useState } from 'react';
import type { OutputFormat } from '../types';
import { formatDefinitions } from '../output/formats';

interface ConfigPanelProps {
  displayType: 'ring' | 'matrix' | 'strip';
  ringLeds: number;
  stripLeds: number;
  matrixWidth: number;
  matrixHeight: number;
  onDisplayTypeChange: (next: 'ring' | 'matrix' | 'strip') => void;
  onRingLedsChange: React.Dispatch<React.SetStateAction<number>>;
  onStripLedsChange: React.Dispatch<React.SetStateAction<number>>;
  onMatrixWidthChange: React.Dispatch<React.SetStateAction<number>>;
  onMatrixHeightChange: React.Dispatch<React.SetStateAction<number>>;
  onOpenImageImport: () => void;
  currentColor: string;
  onColorChange: React.Dispatch<React.SetStateAction<string>>;
  onOutputRequest: (format: OutputFormat) => void;
  outputValue: string;
  outputPreviewUrl?: string;
  onSaveToHistory: () => void;
  rotation: number;
  onRotationChange: React.Dispatch<React.SetStateAction<number>>;
  showLabels: boolean;
  onShowLabelsChange: React.Dispatch<React.SetStateAction<boolean>>;
  isSavingHistory: boolean;
  selectedFormat: OutputFormat;
  onSelectFormat: (next: OutputFormat) => void;
  formatConfigs: Record<OutputFormat, Record<string, unknown>>;
  onFormatConfigsChange: React.Dispatch<React.SetStateAction<Record<OutputFormat, Record<string, unknown>>>>;
  onRotateMatrixPixels: (angle: 90 | 180 | 270) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  displayType,
  ringLeds,
  stripLeds,
  matrixWidth,
  matrixHeight,
  onDisplayTypeChange,
  onRingLedsChange,
  onStripLedsChange,
  onMatrixWidthChange,
  onMatrixHeightChange,
  onOpenImageImport,
  currentColor,
  onColorChange,
  onOutputRequest,
  outputValue,
  outputPreviewUrl,
  onSaveToHistory,
  rotation,
  onRotationChange,
  showLabels,
  onShowLabelsChange,
  isSavingHistory,
  selectedFormat,
  onSelectFormat,
  formatConfigs,
  onFormatConfigsChange,
  onRotateMatrixPixels,
}) => {
  const rotationOptions = [0, 45, 90, 135, 180, 225, 270, 315];
  const formatAllowed = (fmt: (typeof formatDefinitions)[number]) =>
    !fmt.displayTypes || fmt.displayTypes.includes(displayType);
  const rawActiveFormat = formatDefinitions.find((f) => f.id === selectedFormat);
  const fallbackFormat = formatDefinitions.find(formatAllowed) ?? formatDefinitions[0];
  const activeFormat = rawActiveFormat && formatAllowed(rawActiveFormat) ? rawActiveFormat : fallbackFormat;
  const activeConfig = (formatConfigs[activeFormat.id as OutputFormat] ??
    activeFormat.defaultConfig) as typeof activeFormat.defaultConfig;
  const isBitmapFormat = activeFormat.id === 'png_bitmap_8x8';
  const previewUrl = isBitmapFormat ? outputPreviewUrl : undefined;
  const previewWrapperRef = useRef<HTMLDivElement | null>(null);
  const [previewWidth, setPreviewWidth] = useState<number>(matrixWidth);
  const [rawToolboxOpen, setRawToolboxOpen] = useState(false);
  const toolboxOpen = displayType === 'matrix' && rawToolboxOpen;

  useEffect(() => {
    if (!isBitmapFormat) return;
    const recompute = () => {
      const el = previewWrapperRef.current;
      if (!el) return;
      const available = Math.max(el.getBoundingClientRect().width, matrixWidth);
      const step = Math.max(1, Math.floor(available / matrixWidth));
      const target = Math.max(matrixWidth, step * matrixWidth);
      setPreviewWidth((prev) => (prev === target ? prev : target));
    };

    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, [isBitmapFormat, matrixWidth]);

  return (
    <div className="card-surface stack">
      <div className="section-heading compact">
        <div className="eyebrow">Configuration</div>
        <h3>Display settings</h3>
      </div>

      <div className="field">
        <label className="label">Display Type</label>
        <select
          className="control"
          value={displayType}
          onChange={(e) => onDisplayTypeChange(e.target.value as 'ring' | 'matrix' | 'strip')}
        >
          <option value="ring">Ring</option>
          <option value="matrix">Matrix</option>
          <option value="strip">Strip</option>
        </select>
      </div>

      {displayType === 'ring' && (
        <div className="field">
          <label className="label">Number of LEDs</label>
          <input
            className="control"
            type="number"
            min="1"
            value={ringLeds}
            onChange={(e) => onRingLedsChange(parseInt(e.target.value, 10))}
          />
        </div>
      )}

      {displayType === 'strip' && (
        <div className="field">
          <label className="label">Number of LEDs</label>
          <input
            className="control"
            type="number"
            min="1"
            value={stripLeds}
            onChange={(e) => onStripLedsChange(parseInt(e.target.value, 10))}
          />
          <p className="muted">Rendered as a zig-zag with up to 16 LEDs per row.</p>
        </div>
      )}

      {displayType === 'matrix' && (
        <>
          <div className="field grid two">
            <div>
              <label className="label">Matrix Width</label>
              <input
                className="control"
                type="number"
                min="1"
                value={matrixWidth}
                onChange={(e) => onMatrixWidthChange(parseInt(e.target.value, 10))}
              />
            </div>
            <div>
              <label className="label">Matrix Height</label>
              <input
                className="control"
                type="number"
                min="1"
                value={matrixHeight}
                onChange={(e) => onMatrixHeightChange(parseInt(e.target.value, 10))}
              />
            </div>
          </div>
          <p className="muted">Total LEDs: {matrixWidth * matrixHeight}</p>
          <div className="toolbox">
            <button
              type="button"
              className="toolbox-header"
              onClick={() => setRawToolboxOpen((prev) => !prev)}
              aria-expanded={toolboxOpen}
            >
              <span className="toolbox-icon" aria-hidden="true">
                🧰
              </span>
              <div>
                <div className="label">Toolbox</div>
                <div className="toolbox-subtitle">Rotate pixels or import from image</div>
              </div>
              <span className="chevron" aria-hidden="true">
                {toolboxOpen ? '▾' : '▸'}
              </span>
            </button>
            {toolboxOpen && (
              <div className="toolbox-body">
                <div className="field">
                  <div className="label">Rotate pixels</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[90, 180, 270].map((angle) => (
                      <button
                        key={angle}
                        className="btn ghost"
                        type="button"
                        onClick={() => onRotateMatrixPixels(angle as 90 | 180 | 270)}
                      >
                        {angle}°
                      </button>
                    ))}
                  </div>
                  <p className="muted">Applies to pixel data (swaps width/height on 90°/270°).</p>
                </div>
                <div className="field">
                  <div className="label">Import from image</div>
                  <button className="btn ghost" type="button" onClick={onOpenImageImport}>
                    Upload image & crop
                  </button>
                  <p className="muted">Opens a modal with square crop and pixelated preview.</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <div className="grid two">
        <div className="field">
          <label className="label">Rotation</label>
          <select className="control" value={rotation} onChange={(e) => onRotationChange(parseInt(e.target.value, 10))}>
            {rotationOptions.map((angle) => (
              <option key={angle} value={angle}>
                {angle}°
              </option>
            ))}
          </select>
        </div>
        <label className="field checkbox">
          <input type="checkbox" checked={showLabels} onChange={(e) => onShowLabelsChange(e.target.checked)} />
          <span>Show labels</span>
        </label>
      </div>

      <div className="field">
        <label className="label">Current Color</label>
        <div className="color-row">
          <input
            className="control color"
            type="color"
            value={currentColor}
            onChange={(e) => onColorChange(e.target.value)}
          />
          <div className="color-value">{currentColor.toUpperCase()}</div>
        </div>
      </div>

      <button className="btn primary" onClick={onSaveToHistory} disabled={isSavingHistory}>
        {isSavingHistory ? 'Saving…' : 'Save to history'}
      </button>

      <div className="section-heading compact space-top">
        <div className="eyebrow">Output</div>
        <h3>Export formats</h3>
      </div>

      <div className="field">
        <label className="label">Format</label>
        <select
          className="control"
          value={selectedFormat}
          onChange={(e) => onSelectFormat(e.target.value as OutputFormat)}
        >
          {formatDefinitions.map((fmt) => (
            <option key={fmt.id} value={fmt.id} disabled={!formatAllowed(fmt)}>
              {fmt.label}
            </option>
          ))}
        </select>
      </div>
      <button
        className="btn ghost"
        onClick={() => onOutputRequest(selectedFormat)}
        disabled={isBitmapFormat && !previewUrl}
      >
        {isBitmapFormat ? 'Download PNG' : 'Generate'}
      </button>

      {activeFormat?.description && <p className="muted">{activeFormat.description}</p>}
      {activeFormat?.renderConfig && (
        <div className="field">
          <label className="label">Format options</label>
          {activeFormat.renderConfig({
            config: activeConfig,
            onChange: (cfg) =>
              onFormatConfigsChange((prev) => ({
                ...prev,
                [selectedFormat]: cfg as Record<string, unknown>,
              })),
          })}
        </div>
      )}

      {!isBitmapFormat && (
        <textarea
          className="code-block"
          readOnly
          value={outputValue}
          placeholder="Generated output will appear here..."
        />
      )}
      {isBitmapFormat && (
        <div
          className="image-preview"
          ref={previewWrapperRef}
          style={{
            width: '100%',
            maxWidth: '100%',
            overflow: 'hidden',
            display: 'block',
            boxSizing: 'border-box',
          }}
        >
          <div className="label">PNG Preview</div>
          {previewUrl ? (
            <picture
              style={{
                border: '1px solid var(--border)',
                padding: '6px',
                display: 'inline-block',
                background: 'var(--surface)',
                maxWidth: '100%',
              }}
            >
              <img
                src={previewUrl}
                alt="Matrix PNG preview"
                style={{
                  imageRendering: 'pixelated',
                  width: `${previewWidth}px`,
                  height: 'auto',
                  display: 'block',
                }}
              />
            </picture>
          ) : (
            <div
              style={{
                width: '120px',
                height: '120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed var(--border)',
                color: 'var(--muted)',
                fontSize: '12px',
              }}
            >
              No preview
            </div>
          )}
          <div className="space-top">
            <a
              className="btn ghost"
              href={previewUrl ?? '#'}
              download={`pixel-select-${matrixWidth}x${matrixHeight}.png`}
              aria-disabled={!previewUrl}
              style={!previewUrl ? { pointerEvents: 'none', opacity: 0.6 } : undefined}
            >
              Download PNG
            </a>
          </div>
          <div className="muted" style={{ fontSize: '12px' }}>
            Preview auto-updates; click Download for a file suitable for hosting.
          </div>
        </div>
      )}

      {/* Layout tuning removed now that defaults are dialed in */}
    </div>
  );
};

export default ConfigPanel;
