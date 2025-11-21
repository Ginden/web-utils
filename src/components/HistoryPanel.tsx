import React from 'react';
import type { HistoryEntry } from '../types'; // Import HistoryEntry as a type
import HistoryPreview from './HistoryPreview';
import { describeConfiguration } from '../utils/ledState';

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
            <li
              key={entry.timestamp}
              style={{
                marginBottom: '10px',
                border: '1px solid #ccc',
                padding: '10px',
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div style={{ flexGrow: 1 }}>
                <strong>{describeConfiguration(entry)}</strong>
              </div>
              {entry.summary && (
                <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px', flexGrow: 1 }}>{entry.summary}</div>
              )}
              <div style={{ fontSize: '0.8em', color: '#888', marginTop: '5px', flexGrow: 1 }}>
                {new Date(entry.timestamp).toLocaleString()}
              </div>
              <div style={{ marginRight: '1rem' }}>
                <HistoryPreview entry={entry} />
              </div>
              <div>
                <button onClick={() => onLoadHistory(entry)} style={{ marginTop: '5px' }}>
                  Load
                </button>
                <button
                  onClick={() => onDeleteHistory(entry.timestamp)}
                  style={{ marginTop: '5px', marginLeft: '10px' }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HistoryPanel;
