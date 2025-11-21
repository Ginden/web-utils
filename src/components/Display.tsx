import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { RgbColor, RingLayoutConfig } from '../types';
import { rgbToHashHex } from '../utils/colorUtils'; // Import rgbToHashHex

interface DisplayProps {
  displayType: 'ring' | 'matrix';
  ringLeds: number;
  matrixWidth: number;
  matrixHeight: number;
  ledColors: RgbColor[]; // Array of RgbColor arrays
  onLedClick: (index: number) => void;
  rotation: number;
  showLabels: boolean;
  ringLayoutConfig?: RingLayoutConfig;
}

// Function to get a contrasting color (black or white) for a given RGB color
const getContrastingColor = (rgb: RgbColor) => {
  const [r, g, b] = rgb;
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
  ringLayoutConfig,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 360, height: 360 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const ringLayout = useMemo(() => {
    const cfg: RingLayoutConfig = {
      spacingPx: 22,
      pcbRatio: 0.06,
      ...ringLayoutConfig,
    };

    const size = Math.max(360, Math.min(dimensions.width, dimensions.height));
    const pcbWidth = Math.max(8, Math.min(28, size * cfg.pcbRatio));

    const maxRadius = Math.max(60, (size - pcbWidth * 2) / 2);
    const desiredRadius = (ringLeds * cfg.spacingPx) / (2 * Math.PI);
    const ringRadius = Math.min(maxRadius, Math.max(16, desiredRadius));

    const circumference = 2 * Math.PI * ringRadius;
    const actualSpacing = circumference / Math.max(1, ringLeds);
    const ledSize = Math.max(
      10,
      Math.min(34, actualSpacing * 0.75, pcbWidth * 0.85),
    ); // keep LEDs within PCB band and reduce overlap

    const effectiveSize = size;
    const center = effectiveSize / 2;
    return { ledSize, ringRadius, pcbWidth, size: effectiveSize, centerX: center, centerY: center };
  }, [dimensions, ringLeds, ringLayoutConfig]);

  const matrixLayout = useMemo(() => {
    const size = Math.max(320, Math.min(dimensions.width, dimensions.height));
    const padding = Math.max(4, size * 0.012);
    const pcbMargin = Math.max(8, size * 0.03);
    const maxCells = Math.max(matrixWidth, matrixHeight, 1);
    const available = size - pcbMargin * 2;
    const cellSize = Math.max(12, Math.min(40, available / maxCells - padding));
    const contentWidth = matrixWidth * (cellSize + padding) - padding;
    const contentHeight = matrixHeight * (cellSize + padding) - padding;
    const svgWidth = contentWidth + pcbMargin * 2;
    const svgHeight = contentHeight + pcbMargin * 2;
    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2;
    return { cellSize, padding, pcbMargin, svgWidth, svgHeight, centerX, centerY };
  }, [dimensions, matrixHeight, matrixWidth]);

  const renderRing = () => {
    const { ledSize, ringRadius, pcbWidth, size, centerX, centerY } = ringLayout;

    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${size} ${size}`}
        preserveAspectRatio="xMidYMid meet"
      >
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
            const color = ledColors[i] || [0, 0, 0]; // Default to black RGB
            const hexColor = rgbToHashHex(color);

            return (
              <g key={`led-group-${i}`} transform={`rotate(${angleDeg}, ${x}, ${y})`}>
                <rect
                  key={`led-${i}`}
                  id={`led-${i}`}
                  x={x - ledSize / 2}
                  y={y - ledSize / 2}
                  width={ledSize}
                  height={ledSize}
                  fill={hexColor}
                  stroke="#333"
                  strokeWidth={Math.max(1, ledSize * 0.05)}
                  onClick={() => onLedClick(i)}
                  style={{ cursor: 'pointer' }}
                  rx={Math.max(2, ledSize * 0.18)}
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
    const { cellSize, padding, pcbMargin, svgWidth, svgHeight, centerX, centerY } = matrixLayout;

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
              const color = ledColors[index] || [0, 0, 0]; // Default to black RGB
              const hexColor = rgbToHashHex(color);
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
                    fill={hexColor}
                    stroke="#333"
                    strokeWidth="1"
                    onClick={() => onLedClick(index)}
                    style={{ cursor: 'pointer' }}
                    rx={Math.max(2, cellSize * 0.2)}
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
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    >
      {displayType === 'ring' ? renderRing() : renderMatrix()}
    </div>
  );
};

export default Display;
