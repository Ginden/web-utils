import React from 'react';
import type { HistoryEntry } from '../App';

interface HistoryPreviewProps {
  entry: HistoryEntry;
}

const HistoryPreview: React.FC<HistoryPreviewProps> = ({ entry }) => {
  const { displayType, ledColors } = entry;

  const ledSize = 4;
  const gap = 1;

  if (displayType === 'ring') {
    const { ringLeds } = entry;
    const radius = 30;
    return (
      <div style={{ width: '70px', height: '70px', position: 'relative' }}>
        {ledColors.map((color, index) => {
          const angle = (index / ringLeds) * 2 * Math.PI;
          const x = radius + (radius - ledSize) * Math.cos(angle);
          const y = radius + (radius - ledSize) * Math.sin(angle);
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                width: `${ledSize}px`,
                height: `${ledSize}px`,
                backgroundColor: color,
                borderRadius: '50%',
              }}
            />
          );
        })}
      </div>
    );
  } else {
    const { matrixWidth, matrixHeight } = entry;
    const containerWidth = matrixWidth * (ledSize + gap);
    const containerHeight = matrixHeight * (ledSize + gap);

    return (
      <div style={{ width: containerWidth, height: containerHeight, display: 'grid', gridTemplateColumns: `repeat(${matrixWidth}, ${ledSize}px)`, gap: `${gap}px` }}>
        {ledColors.map((color, index) => (
          <div
            key={index}
            style={{
              width: `${ledSize}px`,
              height: `${ledSize}px`,
              backgroundColor: color,
            }}
          />
        ))}
      </div>
    );
  }
};

export default HistoryPreview;
