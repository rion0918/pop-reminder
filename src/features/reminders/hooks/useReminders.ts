import { useCallback, useEffect, useState } from 'react';

import { listActiveReminders } from '../services/reminderRepository';
import { Reminder } from '../types/reminder';

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const rows = await listActiveReminders();
      setReminders(rows);
    } catch (refreshError) {
      console.warn('Failed to load reminders', refreshError);
      setError('リマインダーを読み込めませんでした');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    reminders,
    loading,
    error,
    refresh,
  };
}
