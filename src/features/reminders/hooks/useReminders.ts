import { useCallback, useEffect, useRef, useState } from 'react';

import { listActiveReminders } from '../services/reminderRepository';
import { Reminder } from '../types/reminder';

type RefreshOptions = {
  silent?: boolean;
};

function sortReminders(reminders: Reminder[]) {
  return [...reminders].sort(
    (first, second) =>
      new Date(first.targetAt).getTime() - new Date(second.targetAt).getTime(),
  );
}

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshSequenceRef = useRef(0);

  const refresh = useCallback(async (options?: RefreshOptions) => {
    const requestId = refreshSequenceRef.current + 1;
    refreshSequenceRef.current = requestId;

    if (!options?.silent) {
      setLoading(true);
    }

    setError(null);

    try {
      const rows = await listActiveReminders();

      if (refreshSequenceRef.current === requestId) {
        setReminders(rows);
      }
    } catch (refreshError) {
      console.warn('Failed to load reminders', refreshError);

      if (refreshSequenceRef.current === requestId) {
        setError('リマインダーを読み込めませんでした');
      }
    } finally {
      if (refreshSequenceRef.current === requestId) {
        setLoading(false);
      }
    }
  }, []);

  const upsertReminder = useCallback((reminder: Reminder) => {
    setReminders((current) => {
      const next = current.filter((item) => item.id !== reminder.id);

      return sortReminders([...next, reminder]);
    });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    reminders,
    loading,
    error,
    refresh,
    upsertReminder,
  };
}
