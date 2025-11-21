import React, { useState } from 'react';

interface ConfigPanelProps {
  displayType: 'ring' | 'matrix';
  ringLeds: number;
  matrixWidth: number;
  matrixHeight: number;
  onDisplayTypeChange: (type: 'ring' | 'matrix') => void;
  onRingLedsChange: (leds: number) => void;
  onMatrixWidthChange: (width: number) => void;
  onMatrixHeightChange: (height: number) => void;
  currentColor: string;
  onColorChange: (color: string) => void;
  onOutputRequest: (format: 'rgb' | 'bgr' | 'arduino') => void;
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
}) => {
  const [outputFormat, setOutputFormat] = useState<'rgb' | 'bgr' | 'arduino'>('rgb');

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h3>Display Configuration</h3>
      <div>
        <label>
          Display Type:
          <select value={displayType} onChange={(e) => onDisplayTypeChange(e.target.value as 'ring' | 'matrix')}>
            <option value="ring">Ring</option>
            <option value="matrix">Matrix</option>
          </select>
        </label>
      </div>

      {displayType === 'ring' && (
        <div style={{ marginTop: '10px' }}>
          <label>
            Number of LEDs:
            <input
              type="number"
              min="1"
              value={ringLeds}
              onChange={(e) => onRingLedsChange(parseInt(e.target.value, 10))}
            />
          </label>
        </div>
      )}

      {displayType === 'matrix' && (
        <div style={{ marginTop: '10px' }}>
          <label>
            Matrix Width:
            <input
              type="number"
              min="1"
              value={matrixWidth}
              onChange={(e) => onMatrixWidthChange(parseInt(e.target.value, 10))}
            />
          </label>
          <label style={{ marginLeft: '10px' }}>
            Matrix Height:
            <input
              type="number"
              min="1"
              value={matrixHeight}
              onChange={(e) => onMatrixHeightChange(parseInt(e.target.value, 10))}
            />
          </label>
        </div>
      )}

      <h3 style={{ marginTop: '20px' }}>Color Picker</h3>
      <div>
        <label>
          Current Color:
          <input
            type="color"
            value={currentColor}
            onChange={(e) => onColorChange(e.target.value)}
          />
        </label>
      </div>

      <h3 style={{ marginTop: '20px' }}>Output Options</h3>
      <div>
        <label>
          Output Format:
          <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as 'rgb' | 'bgr' | 'arduino')}>
            <option value="rgb">RGB Buffer</option>
            <option value="bgr">BGR Buffer</option>
            <option value="arduino">Arduino Code</option>
          </select>
        </label>
        <button onClick={() => onOutputRequest(outputFormat)} style={{ marginLeft: '10px', padding: '8px 12px' }}>
          Generate Output
        </button>
      </div>
    </div>
  );
};

export default ConfigPanel;
