import React from 'react';
import Display from './components/Display';
import ConfigPanel from './components/ConfigPanel';
import HistoryPanel from './components/HistoryPanel';
import './App.css';
import { useLedApp } from './hooks/useLedApp';

const App: React.FC = () => {
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
    },
  } = useLedApp();

  return (
    <div className="app-container">
      <header style={{ padding: '1rem', borderBottom: '1px solid #ccc', textAlign: 'center' }}>
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
            isSummarizing={isSummarizing}
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
