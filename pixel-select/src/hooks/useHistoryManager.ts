import { useCallback, useEffect, useState } from 'react';
import { parseStoredHistory } from '../utils/ledState';
import type { HistoryEntry } from '../types';

export const useHistoryManager = (
  buildEntry: () => HistoryEntry,
  applyEntry: (entry: HistoryEntry) => void,
) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isSavingHistory, setIsSavingHistory] = useState<boolean>(false);

  useEffect(() => {
    const savedHistory = parseStoredHistory(localStorage.getItem('led_history'));
    if (savedHistory.length) {
      setTimeout(() => setHistory(savedHistory), 0);
    }
  }, []);

  const save = useCallback(() => {
    setIsSavingHistory(true);
    try {
      const entry = buildEntry();
      const updatedHistory = [entry, ...history];
      setHistory(updatedHistory);
      localStorage.setItem('led_history', JSON.stringify(updatedHistory));
    } finally {
      setIsSavingHistory(false);
    }
  }, [buildEntry, history]);

  const remove = useCallback(
    (timestamp: string) => {
      const updatedHistory = history.filter((entry) => entry.timestamp !== timestamp);
      setHistory(updatedHistory);
      localStorage.setItem('led_history', JSON.stringify(updatedHistory));
    },
    [history],
  );

  const load = useCallback(
    (entry: HistoryEntry) => {
      applyEntry(entry);
    },
    [applyEntry],
  );

  return {
    history,
    isSavingHistory,
    save,
    remove,
    load,
  };
};
