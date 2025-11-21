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
    <div className="card-surface stack">
      <div className="section-heading compact">
        <div className="eyebrow">Saved</div>
        <h3>History</h3>
      </div>
      {history.length === 0 ? (
        <p className="muted">No history saved yet.</p>
      ) : (
        <ul className="history-list">
          {history.map((entry) => (
            <li key={entry.timestamp} className="history-card">
              <div className="history-main">
                <div className="history-title">{describeConfiguration(entry)}</div>
                {entry.summary && <div className="history-summary">{entry.summary}</div>}
                <div className="history-meta">{new Date(entry.timestamp).toLocaleString()}</div>
                <div className="history-actions">
                  <button className="btn ghost" onClick={() => onLoadHistory(entry)}>
                    Load
                  </button>
                  <button className="btn subtle" onClick={() => onDeleteHistory(entry.timestamp)}>
                    Delete
                  </button>
                </div>
              </div>
              <div className="history-preview">
                <HistoryPreview entry={entry} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HistoryPanel;
