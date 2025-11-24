import React, { useEffect, useState } from 'react';
import Display from './components/Display';
import ConfigPanel from './components/ConfigPanel';
import HistoryPanel from './components/HistoryPanel';
import './App.css';
import { useLedApp } from './hooks/useLedApp';

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  const {
    state: {
      displayType,
      ringLeds,
      matrixWidth,
      matrixHeight,
      ledColors,
      currentColor,
      outputValue,
      history,
      rotation,
      showLabels,
      isSummarizing,
      ringLayoutConfig,
      selectedFormat,
      formatConfigs,
      outputPreviewUrl,
    },
    actions: {
      setDisplayType,
      setRingLeds,
      setMatrixWidth,
      setMatrixHeight,
      setCurrentColor,
      setRotation,
      setShowLabels,
      handleLedClick,
      handleSaveToHistory,
      handleDeleteFromHistory,
      handleOutputRequest,
      loadFromHistory,
      setSelectedFormat,
      setFormatConfigs,
    },
  } = useLedApp();

  return (
    <div className="app-container">
      <header className="top-bar">
        <div className="brand">
          <div className="brand-mark">PX</div>
          <div className="brand-text">
            <h1>Pixel Select</h1>
            <p>WS281x LED Controller</p>
          </div>
        </div>
        <button className="pill-action" onClick={toggleTheme} aria-label="Toggle color theme">
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
      </header>
      <div className="main-content">
        <div className="panel display-panel card-surface">
          <div className="section-heading">
            <div className="eyebrow">Visualizer</div>
            <h2>Display</h2>
            <p>Interact with the LEDs and see the rotation/labels update live.</p>
          </div>
          <div className="display-canvas">
            <div className="display-shell">
              <Display
                displayType={displayType}
                ringLeds={ringLeds}
                matrixWidth={matrixWidth}
                matrixHeight={matrixHeight}
                ledColors={ledColors}
                onLedClick={handleLedClick}
                rotation={rotation}
                showLabels={showLabels}
                ringLayoutConfig={ringLayoutConfig}
              />
            </div>
          </div>
        </div>
        <div className="panel sidebar">
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
            outputPreviewUrl={outputPreviewUrl}
            onSaveToHistory={handleSaveToHistory}
            rotation={rotation}
            onRotationChange={setRotation}
            showLabels={showLabels}
            onShowLabelsChange={setShowLabels}
            isSummarizing={isSummarizing}
            selectedFormat={selectedFormat}
            onSelectFormat={setSelectedFormat}
            formatConfigs={formatConfigs}
            onFormatConfigsChange={setFormatConfigs}
          />
          <HistoryPanel
            history={history}
            onLoadHistory={loadFromHistory}
            onDeleteHistory={handleDeleteFromHistory}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
