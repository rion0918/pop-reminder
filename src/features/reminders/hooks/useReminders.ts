import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { listActiveReminders } from '../services/reminderRepository';
import { Reminder } from '../types/reminder';

type RefreshOptions = {
  silent?: boolean;
};

const MAX_AUTO_REFRESH_TIMEOUT_MS = 24 * 60 * 60 * 1000;

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

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh({ silent: true });
      }
    });

    return () => subscription.remove();
  }, [refresh]);

  useEffect(() => {
    const now = Date.now();
    const nextTargetTime = reminders.reduce<number | null>((next, reminder) => {
      const targetTime = new Date(reminder.targetNotifyAt).getTime();

      if (targetTime <= now) {
        return next;
      }

      return next === null ? targetTime : Math.min(next, targetTime);
    }, null);

    if (nextTargetTime === null) {
      return;
    }

    const timeoutMs = Math.min(
      Math.max(0, nextTargetTime - now) + 1000,
      MAX_AUTO_REFRESH_TIMEOUT_MS,
    );
    const timer = setTimeout(() => {
      void refresh({ silent: true });
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [refresh, reminders]);

  return {
    reminders,
    loading,
    error,
    refresh,
    upsertReminder,
  };
}
