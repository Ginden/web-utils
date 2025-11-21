import React from 'react';

interface DisplayProps {
  displayType: 'ring' | 'matrix';
  ringLeds: number;
  matrixWidth: number;
  matrixHeight: number;
  ledColors: string[]; // Array of hex color strings
  onLedClick: (index: number) => void;
  rotation: number;
  showLabels: boolean;
}

// Function to get a contrasting color (black or white) for a given hex color
const getContrastingColor = (hex: string) => {
  if (!hex) return '#ffffff';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

const Display: React.FC<DisplayProps> = ({
  displayType,
  ringLeds,
  matrixWidth,
  matrixHeight,
  ledColors,
  onLedClick,
  rotation,
  showLabels,
}) => {
  const renderRing = () => {
    const ledSize = 20;
    const ringRadius = 100;
    const pcbWidth = ledSize * 1.5;
    const padding = pcbWidth;
    const size = ringRadius * 2 + padding * 2;
    const centerX = size / 2;
    const centerY = size / 2;

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(${rotation}, ${centerX}, ${centerY})`}>
          <circle
            cx={centerX}
            cy={centerY}
            r={ringRadius}
            fill="none"
            stroke="#555" // PCB color
            strokeWidth={pcbWidth}
          />
          {Array.from({ length: ringLeds }).map((_, i) => {
            const angleRad = (i / ringLeds) * 2 * Math.PI - Math.PI / 2;
            const angleDeg = (i / ringLeds) * 360;
            const x = centerX + ringRadius * Math.cos(angleRad);
            const y = centerY + ringRadius * Math.sin(angleRad);
            const color = ledColors[i] || '#000000';

            return (
              <g key={`led-group-${i}`} transform={`rotate(${angleDeg}, ${x}, ${y})`}>
                <rect
                  key={`led-${i}`}
                  id={`led-${i}`}
                  x={x - ledSize / 2}
                  y={y - ledSize / 2}
                  width={ledSize}
                  height={ledSize}
                  fill={color}
                  stroke="#333"
                  strokeWidth="1"
                  onClick={() => onLedClick(i)}
                  style={{ cursor: 'pointer' }}
                />
                {showLabels && (
                  <text
                    x={x}
                    y={y}
                    dy=".3em"
                    textAnchor="middle"
                    fill={getContrastingColor(color)}
                    pointerEvents="none"
                    fontSize="10"
                    transform={`rotate(${-angleDeg - rotation}, ${x}, ${y})`}
                  >
                    {i}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    );
  };

  const renderMatrix = () => {
    const cellSize = 20;
    const pcbMargin = cellSize / 3;
    const padding = 5;
    const contentWidth = matrixWidth * (cellSize + padding) - padding;
    const contentHeight = matrixHeight * (cellSize + padding) - padding;
    const svgWidth = contentWidth + pcbMargin * 2;
    const svgHeight = contentHeight + pcbMargin * 2;
    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2;

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        <g transform={`rotate(${rotation}, ${centerX}, ${centerY})`}>
          <rect
            x="0"
            y="0"
            width={svgWidth}
            height={svgHeight}
            fill="#555" // PCB color
            rx="2"
          />
          {Array.from({ length: matrixHeight }).map((_, row) =>
            Array.from({ length: matrixWidth }).map((__, col) => {
              const index = row * matrixWidth + col;
              const x = pcbMargin + col * (cellSize + padding);
              const y = pcbMargin + row * (cellSize + padding);
              const color = ledColors[index] || '#000000';
              const textX = x + cellSize / 2;
              const textY = y + cellSize / 2;

              return (
                <g key={`led-group-${index}`}>
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
                  {showLabels && (
                    <text
                      x={textX}
                      y={textY}
                      dy=".3em"
                      textAnchor="middle"
                      fill={getContrastingColor(color)}
                      pointerEvents="none"
                      fontSize="10"
                      transform={`rotate(${-rotation}, ${textX}, ${textY})`}
                    >
                      {index}
                    </text>
                  )}
                </g>
              );
            }),
          )}
        </g>
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
