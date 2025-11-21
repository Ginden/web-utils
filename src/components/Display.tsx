import React from 'react';

interface DisplayProps {
  displayType: 'ring' | 'matrix';
  ringLeds: number;
  matrixWidth: number;
  matrixHeight: number;
  ledColors: string[]; // Array of hex color strings
  onLedClick: (index: number) => void;
}

const Display: React.FC<DisplayProps> = ({
  displayType,
  ringLeds,
  matrixWidth,
  matrixHeight,
  ledColors,
  onLedClick,
}) => {
  const renderRing = () => {
    const ledRadius = 10;
    const ringRadius = 100;
    const padding = ledRadius * 2; // Padding around the ring
    const size = ringRadius * 2 + padding * 2;
    const centerX = size / 2;
    const centerY = size / 2;

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
        {Array.from({ length: ringLeds }).map((_, i) => {
          const angle = (i / ringLeds) * 2 * Math.PI - Math.PI / 2; // Start from top
          const x = centerX + ringRadius * Math.cos(angle);
          const y = centerY + ringRadius * Math.sin(angle);
          const color = ledColors[i] || '#000000'; // Default to black

          return (
            <circle
              key={`led-${i}`}
              id={`led-${i}`}
              cx={x}
              cy={y}
              r={ledRadius}
              fill={color}
              stroke="#333"
              strokeWidth="1"
              onClick={() => onLedClick(i)}
              style={{ cursor: 'pointer' }}
            />
          );
        })}
      </svg>
    );
  };

  const renderMatrix = () => {
    const cellSize = 20;
    const padding = 5;
    const svgWidth = matrixWidth * (cellSize + padding) + padding;
    const svgHeight = matrixHeight * (cellSize + padding) + padding;

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        {Array.from({ length: matrixHeight }).map((_, row) =>
          Array.from({ length: matrixWidth }).map((__, col) => {
            const index = row * matrixWidth + col;
            const x = padding + col * (cellSize + padding);
            const y = padding + row * (cellSize + padding);
            const color = ledColors[index] || '#000000'; // Default to black

            return (
              <rect
                key={`led-${index}`}
                id={`led-${index}`}
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                fill={color}
                stroke="#333"
                strokeWidth="1"
                onClick={() => onLedClick(index)}
                style={{ cursor: 'pointer' }}
              />
            );
          })
        )}
      </svg>
    );
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {displayType === 'ring' ? renderRing() : renderMatrix()}
    </div>
  );
};

export default Display;


