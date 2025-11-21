import React, { useState } from 'react';

interface ConfigPanelProps {
  displayType: 'ring' | 'matrix';
  ringLeds: number;
  matrixWidth: number;
  matrixHeight: number;
  onDisplayTypeChange: React.Dispatch<React.SetStateAction<'ring' | 'matrix'>>;
  onRingLedsChange: React.Dispatch<React.SetStateAction<number>>;
  onMatrixWidthChange: React.Dispatch<React.SetStateAction<number>>;
  onMatrixHeightChange: React.Dispatch<React.SetStateAction<number>>;
  currentColor: string;
  onColorChange: React.Dispatch<React.SetStateAction<string>>;
  onOutputRequest: (format: 'rgb' | 'bgr' | 'arduino') => void;
  outputValue: string;
  onSaveToHistory: () => void;
  rotation: number;
  onRotationChange: React.Dispatch<React.SetStateAction<number>>;
  showLabels: boolean;
  onShowLabelsChange: React.Dispatch<React.SetStateAction<boolean>>;
  isSummarizing: boolean; // New prop
  ringLayoutConfig: import('../types').RingLayoutConfig;
  onRingLayoutConfigChange: React.Dispatch<React.SetStateAction<import('../types').RingLayoutConfig>>;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  displayType,
  ringLeds,
  matrixWidth,
  matrixHeight,
  onDisplayTypeChange,
  onRingLedsChange,
  onMatrixWidthChange,
  onMatrixHeightChange,
  currentColor,
  onColorChange,
  onOutputRequest,
  outputValue,
  onSaveToHistory,
  rotation,
  onRotationChange,
  showLabels,
  onShowLabelsChange,
  isSummarizing,
  ringLayoutConfig,
  onRingLayoutConfigChange,
}) => {
  const [outputFormat, setOutputFormat] = useState<'rgb' | 'bgr' | 'arduino'>('rgb');
  const rotationOptions = [0, 45, 90, 135, 180, 225, 270, 315];
  const [showTuning, setShowTuning] = useState<boolean>(false);

  const updateLayout = (key: keyof typeof ringLayoutConfig, value: number) => {
    onRingLayoutConfigChange((prev) => ({ ...prev, [key]: value }));
  };

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
          onChange={(e) => onDisplayTypeChange(e.target.value as 'ring' | 'matrix')}
        >
          <option value="ring">Ring</option>
          <option value="matrix">Matrix</option>
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

      {displayType === 'matrix' && (
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
          <p className="muted span-two">Total LEDs: {matrixWidth * matrixHeight}</p>
        </div>
      )}

      <div className="grid two">
        <div className="field">
          <label className="label">Rotation</label>
          <select
            className="control"
            value={rotation}
            onChange={(e) => onRotationChange(parseInt(e.target.value, 10))}
          >
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
          <input className="control color" type="color" value={currentColor} onChange={(e) => onColorChange(e.target.value)} />
          <div className="color-value">{currentColor.toUpperCase()}</div>
        </div>
      </div>

      <button className="btn primary" onClick={onSaveToHistory} disabled={isSummarizing}>
        {isSummarizing ? 'Saving…' : 'Save to history'}
      </button>

      <div className="section-heading compact space-top">
        <div className="eyebrow">Output</div>
        <h3>Export formats</h3>
      </div>

      <div className="grid two align-end">
        <div className="field">
          <label className="label">Format</label>
          <select
            className="control"
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value as 'rgb' | 'bgr' | 'arduino')}
          >
            <option value="rgb">RGB Buffer</option>
            <option value="bgr">BGR Buffer</option>
            <option value="arduino">Arduino Code</option>
          </select>
        </div>
        <button className="btn ghost" onClick={() => onOutputRequest(outputFormat)}>
          Generate
        </button>
      </div>

      <textarea
        className="code-block"
        readOnly
        value={outputValue}
        placeholder="Generated output will appear here..."
      />

      <details className="tuning" open={showTuning} onToggle={(e) => setShowTuning(e.currentTarget.open)}>
        <summary className="tuning-toggle">Layout tuning (dev)</summary>
        <div className="grid two">
          <div className="field">
            <label className="label">LED spacing (px)</label>
            <input
              className="control"
              type="range"
              min="8"
              max="40"
              step="1"
              value={ringLayoutConfig.spacingPx}
              onChange={(e) => updateLayout('spacingPx', parseFloat(e.target.value))}
            />
            <div className="muted small">{ringLayoutConfig.spacingPx.toFixed(0)}px</div>
          </div>
          <div className="field">
            <label className="label">PCB thickness ratio</label>
            <input
              className="control"
              type="range"
              min="0.03"
              max="0.12"
              step="0.005"
              value={ringLayoutConfig.pcbRatio}
              onChange={(e) => updateLayout('pcbRatio', parseFloat(e.target.value))}
            />
            <div className="muted small">{(ringLayoutConfig.pcbRatio * 100).toFixed(1)}%</div>
          </div>
        </div>
      </details>
    </div>
  );
};

export default ConfigPanel;
