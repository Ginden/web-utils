import React, { useState, useEffect } from 'react';
import Display from './components/Display';
import ConfigPanel from './components/ConfigPanel';
import HistoryPanel from './components/HistoryPanel';
import './App.css';
import { getSummary } from './api/SummarizerAPI'; // Import the summarizer API

// Define the HistoryEntry interface to include the optional summary
export interface HistoryEntry { // Export HistoryEntry
  displayType: 'ring' | 'matrix';
  ringLeds: number;
  matrixWidth: number;
  matrixHeight: number;
  ledColors: string[];
  rotation: number;
  showLabels: boolean;
  timestamp: string;
  summary?: string; // Add optional summary field
}

const App: React.FC = () => {
  const [displayType, setDisplayType] = useState<'ring' | 'matrix'>('ring');
  const [ringLeds, setRingLeds] = useState<number>(24);
  const [matrixWidth, setMatrixWidth] = useState<number>(8);
  const [matrixHeight, setMatrixHeight] = useState<number>(8);
  const [ledColors, setLedColors] = useState<string[]>(Array(24).fill('#000000'));
  const [currentColor, setCurrentColor] = useState<string>('#FF0000');
  const [outputValue, setOutputValue] = useState<string>('');
  const [history, setHistory] = useState<HistoryEntry[]>([]); // Use the defined interface
  const [rotation, setRotation] = useState<number>(0);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false); // New state for summarizer feedback

  // Helper to generate Arduino output for summarization
  const generateArduinoOutput = (colors: string[]) => {
    const hexToRgbForSummary = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };
    let output = `CRGB leds[] = {\n`;
    output += colors.map(hex => {
      const { r, g, b } = hexToRgbForSummary(hex);
      return `  CRGB(${r}, ${g}, ${b})`;
    }).join(',\n');
    output += `\n};`;
    return output;
  };

  // Load from URL hash and localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('led_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error("Failed to parse history from localStorage", e);
    }
    
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const type = params.get('type');
    if (type === 'ring' || type === 'matrix') {
      setDisplayType(type);
      if (type === 'ring') {
        setRingLeds(parseInt(params.get('leds') || '24', 10));
      } else {
        setMatrixWidth(parseInt(params.get('width') || '8', 10));
        setMatrixHeight(parseInt(params.get('height') || '8', 10));
      }
      setRotation(parseInt(params.get('rotation') || '0', 10));
      setShowLabels(params.get('labels') === 'true');
      const colors = params.get('colors');
      if (colors) {
        setLedColors(colors.split(',').map(c => `#${c}`));
      }
    }
  }, []);
  
  // Update URL hash on state change
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('type', displayType);
    if (displayType === 'ring') {
      params.set('leds', ringLeds.toString());
    } else {
      params.set('width', matrixWidth.toString());
      params.set('height', matrixHeight.toString());
    }
    params.set('rotation', rotation.toString());
    params.set('labels', String(showLabels));
    params.set('colors', ledColors.map(c => c.slice(1)).join(','));
    const hash = params.toString();
    if (window.location.hash !== `#${hash}`) {
        window.location.hash = hash
    }
  }, [displayType, ringLeds, matrixWidth, matrixHeight, rotation, showLabels, ledColors]);


  // Re-initialize ledColors when display size changes
  useEffect(() => {
    const newSize = displayType === 'ring' ? ringLeds : matrixWidth * matrixHeight;
    setLedColors(Array(newSize).fill('#000000'));
  }, [displayType, ringLeds, matrixWidth, matrixHeight]);

  const handleLedClick = (index: number) => {
    setLedColors(p => {
      const newColors = [...p];
      newColors[index] = currentColor;
      return newColors;
    });
  };
  
  const handleSaveToHistory = async () => { // Made async
    setIsSummarizing(true);
    const arduinoOutput = generateArduinoOutput(ledColors);
    const summary = await getSummary(arduinoOutput); // Get summary

    const newHistoryEntry: HistoryEntry = {
      displayType,
      ringLeds,
      matrixWidth,
      matrixHeight,
      ledColors,
      rotation,
      showLabels,
      timestamp: new Date().toISOString(),
      summary, // Include summary
    };
    const updatedHistory = [newHistoryEntry, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('led_history', JSON.stringify(updatedHistory));
    setIsSummarizing(false);
  }

  const handleDeleteFromHistory = (timestamp: string) => {
    const updatedHistory = history.filter(entry => entry.timestamp !== timestamp);
    setHistory(updatedHistory);
    localStorage.setItem('led_history', JSON.stringify(updatedHistory));
  };

  const loadFromHistory = (entry: HistoryEntry) => { // Use HistoryEntry interface
    setDisplayType(entry.displayType);
    setRingLeds(entry.ringLeds);
    setMatrixWidth(entry.matrixWidth);
    setMatrixHeight(entry.matrixHeight);
    setRotation(entry.rotation || 0);
    setShowLabels(entry.showLabels === undefined ? true : entry.showLabels);
    if (entry.ledColors) {
      setLedColors(entry.ledColors);
    }
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
        output = ledColors.map(hex => { const { r, g, b } = hexToRgb(hex); return `${r}, ${g}, ${b}`; }).join(', ');
        output = `[${output}]`;
        break;
      case 'bgr':
        output = ledColors.map(hex => { const { r, g, b } = hexToRgb(hex); return `${b}, ${g}, ${r}`; }).join(', ');
        output = `[${output}]`;
        break;
      case 'arduino':
        output = `CRGB leds[] = {\n` + ledColors.map(hex => { const { r, g, b } = hexToRgb(hex); return `  CRGB(${r}, ${g}, ${b})`; }).join(',\n') + `\n};`;
        break;
      default:
        output = 'Unsupported format';
    }
    setOutputValue(output);
  };

  return (
    <div className="app-container">
        <header style={{padding: "1rem", borderBottom: "1px solid #ccc", textAlign: "center"}}>
            <h1>WS281x LED Controller</h1>
        </header>
        <div className="main-content">
            <div className="left-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <h2>Display Visualization</h2>
              <div style={{ flexGrow: 1, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                    <Display
                        displayType={displayType}
                        ringLeds={ringLeds}
                        matrixWidth={matrixWidth}
                        matrixHeight={matrixHeight}
                        ledColors={ledColors}
                        onLedClick={handleLedClick}
                        rotation={rotation}
                        showLabels={showLabels}
                    />
                </div>
              </div>
            </div>
            <div className="right-panel">
              <ConfigPanel
                displayType={displayType}
                ringLeds={ringLeds}
                matrixWidth={matrixWidth}
                matrixHeight={matrixHeight}
                onDisplayTypeChange={setDisplayType}
                onRingLedsChange={setRingLeds}
                onMatrixWidthChange={setMatrixWidth}
                onMatrixHeightChange={setMatrixHeight}
                currentColor={currentColor}
                onColorChange={setCurrentColor}
                onOutputRequest={handleOutputRequest}
                outputValue={outputValue}
                onSaveToHistory={handleSaveToHistory}
                rotation={rotation}
                onRotationChange={setRotation}
                showLabels={showLabels}
                onShowLabelsChange={setShowLabels}
                isSummarizing={isSummarizing} // Pass isSummarizing to ConfigPanel
              />
              <HistoryPanel history={history} onLoadHistory={loadFromHistory} onDeleteHistory={handleDeleteFromHistory} />
            </div>
        </div>
    </div>
  );
};

export default App;

;

