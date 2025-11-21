import React from 'react';
import type { HistoryEntry } from '../App'; // Import HistoryEntry as a type

interface HistoryPanelProps {
  history: HistoryEntry[];
  onLoadHistory: (entry: HistoryEntry) => void;
  onDeleteHistory: (timestamp: string) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onLoadHistory, onDeleteHistory }) => {
  return (
    <div style={{ marginTop: '20px' }}>
      <h3>History</h3>
      {history.length === 0 ? (
        <p>No history saved yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {history.map((entry) => (
            <li key={entry.timestamp} style={{ marginBottom: '10px', border: '1px solid #ccc', padding: '10px', borderRadius: '5px' }}>
              <div>
                <strong>{entry.displayType === 'ring' ? 'Ring' : 'Matrix'}</strong> -{' '}
                {entry.displayType === 'ring'
                  ? `${entry.ringLeds} LEDs`
                  : `${entry.matrixWidth}x${entry.matrixHeight}`}
              </div>
              {entry.summary && <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>{entry.summary}</div>}
              <div style={{ fontSize: '0.8em', color: '#888', marginTop: '5px' }}>
                {new Date(entry.timestamp).toLocaleString()}
              </div>
              <button onClick={() => onLoadHistory(entry)} style={{ marginTop: '5px' }}>
                Load
              </button>
              <button onClick={() => onDeleteHistory(entry.timestamp)} style={{ marginTop: '5px', marginLeft: '10px' }}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HistoryPanel;



