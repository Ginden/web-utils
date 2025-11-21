import React, { useState, useEffect } from 'react';
import Display from './components/Display';
import ConfigPanel from './components/ConfigPanel';

const App: React.FC = () => {
  const [displayType, setDisplayType] = useState<'ring' | 'matrix'>('ring');
  const [ringLeds, setRingLeds] = useState<number>(24);
  const [matrixWidth, setMatrixWidth] = useState<number>(8);
  const [matrixHeight, setMatrixHeight] = useState<number>(8);
  const [ledColors, setLedColors] = useState<string[]>(Array(24).fill('#808080')); // Default to 24 grey LEDs for ring
  const [currentColor, setCurrentColor] = useState<string>('#FF0000'); // Default to red

  // Effect to re-initialize ledColors when display type or size changes
  useEffect(() => {
    let newSize = 0;
    if (displayType === 'ring') {
      newSize = ringLeds;
    } else {
      newSize = matrixWidth * matrixHeight;
    }
    setLedColors(Array(newSize).fill('#808080'));
  }, [displayType, ringLeds, matrixWidth, matrixHeight]);

  const handleDisplayTypeChange = (type: 'ring' | 'matrix') => {
    setDisplayType(type);
  };

  const handleRingLedsChange = (leds: number) => {
    setRingLeds(Math.max(1, leds)); // Ensure at least 1 LED
  };

  const handleMatrixWidthChange = (width: number) => {
    setMatrixWidth(Math.max(1, width)); // Ensure at least 1 width
  };

  const handleMatrixHeightChange = (height: number) => {
    setMatrixHeight(Math.max(1, height)); // Ensure at least 1 height
  };

  const handleColorChange = (color: string) => {
    setCurrentColor(color);
  };

  const handleLedClick = (index: number) => {
    setLedColors((prevColors) => {
      const newColors = [...prevColors];
      newColors[index] = currentColor;
      return newColors;
    });
  };

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };

  const handleOutputRequest = (format: 'rgb' | 'bgr' | 'arduino') => {
    let output = '';
    switch (format) {
      case 'rgb':
        output = ledColors.map(hex => {
          const { r, g, b } = hexToRgb(hex);
          return `${r}, ${g}, ${b}`;
        }).join(', ');
        output = `RGB Buffer: [${output}]`;
        break;
      case 'bgr':
        output = ledColors.map(hex => {
          const { r, g, b } = hexToRgb(hex);
          return `${b}, ${g}, ${r}`;
        }).join(', ');
        output = `BGR Buffer: [${output}]`;
        break;
      case 'arduino':
        output = `CRGB leds[] = {\n`;
        output += ledColors.map(hex => {
          const { r, g, b } = hexToRgb(hex);
          return `  CRGB(${r}, ${g}, ${b})`;
        }).join(',\n');
        output += `\n};`;
        break;
      default:
        output = 'Unsupported format';
    }
    alert(output);
    console.log(output);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      {/* Left panel for SVG visualization */}
      <div style={{ flex: 1, borderRight: '1px solid #ccc', padding: '20px', overflow: 'auto' }}>
        <h2>Display Visualization</h2>
        <Display
          displayType={displayType}
          ringLeds={ringLeds}
          matrixWidth={matrixWidth}
          matrixHeight={matrixHeight}
          ledColors={ledColors}
          onLedClick={handleLedClick}
        />
      </div>

      {/* Right panel for configuration */}
      <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
        <ConfigPanel
          displayType={displayType}
          ringLeds={ringLeds}
          matrixWidth={matrixWidth}
          matrixHeight={matrixHeight}
          onDisplayTypeChange={handleDisplayTypeChange}
          onRingLedsChange={handleRingLedsChange}
          onMatrixWidthChange={handleMatrixWidthChange}
          onMatrixHeightChange={handleMatrixHeightChange}
          currentColor={currentColor}
          onColorChange={handleColorChange}
          onOutputRequest={handleOutputRequest}
        />
      </div>
    </div>
  );
};

export default App;
;

