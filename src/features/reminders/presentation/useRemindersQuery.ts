import { useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAppServices } from '../../../bootstrap/AppProviders';
import type { Reminder } from '../domain/reminder';

export const activeRemindersQueryKey = ['reminders', 'active'] as const;
const MAX_REFRESH_TIMER_MS = 24 * 60 * 60 * 1000;

function sortReminders(reminders: Reminder[]) {
  return [...reminders].sort(
    (first, second) => new Date(first.targetAt).getTime() - new Date(second.targetAt).getTime(),
  );
}

export function useRemindersQuery() {
  const services = useAppServices();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: activeRemindersQueryKey,
    queryFn: () => services.reminders.listActive(),
    retry: false,
  });
  const { data: reminders, error, isLoading, refetch } = query;

  const reconcile = useCallback(
    () => queryClient.invalidateQueries({ queryKey: activeRemindersQueryKey }),
    [queryClient],
  );
  const upsertReminder = useCallback(
    (reminder: Reminder) => {
      queryClient.setQueryData<Reminder[]>(activeRemindersQueryKey, (current = []) =>
        sortReminders([...current.filter((item) => item.id !== reminder.id), reminder]),
      );
    },
    [queryClient],
  );
  const removeReminder = useCallback(
    (id: string) => {
      queryClient.setQueryData<Reminder[]>(activeRemindersQueryKey, (current = []) =>
        current.filter((item) => item.id !== id),
      );
    },
    [queryClient],
  );

  const createMutation = useMutation({
    mutationFn: ({
      input,
      options,
    }: {
      input: Parameters<typeof services.reminders.create>[0];
      options?: Parameters<typeof services.reminders.create>[1];
    }) => services.reminders.create(input, options),
    onSuccess: (result) => {
      upsertReminder(result.reminder);
      void reconcile();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string; deferCache?: boolean }) => services.reminders.delete(id),
    onSuccess: (deleted, { id, deferCache }) => {
      if (deleted && !deferCache) removeReminder(id);
      void reconcile();
    },
  });
  const updateTitleMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      services.reminders.updateTitle(id, title),
    onSuccess: (reminder) => {
      if (reminder) upsertReminder(reminder);
      void reconcile();
    },
  });

  const reconcileExpiredReminders = useCallback(async () => {
    await services.reminders.cleanup();
    await refetch();
  }, [refetch, services.reminders]);

  useEffect(() => {
    const nextTarget = (reminders ?? []).reduce<number | null>((next, reminder) => {
      const target = new Date(reminder.targetNotifyAt).getTime();
      if (target <= Date.now()) return next;
      return next === null ? target : Math.min(next, target);
    }, null);
    if (nextTarget === null) return;

    let timer: ReturnType<typeof setTimeout>;
    const scheduleRefresh = () => {
      const remainingMs = Math.max(0, nextTarget + 1000 - Date.now());
      timer = setTimeout(
        () => {
          if (remainingMs > MAX_REFRESH_TIMER_MS) {
            scheduleRefresh();
          } else {
            void reconcileExpiredReminders();
          }
        },
        Math.min(remainingMs, MAX_REFRESH_TIMER_MS),
      );
    };
    scheduleRefresh();
    return () => clearTimeout(timer);
  }, [reconcileExpiredReminders, reminders]);

  const refresh = useCallback((_options?: { silent?: boolean }) => refetch(), [refetch]);

  return {
    reminders: reminders ?? [],
    loading: isLoading,
    error: error ? 'リマインダーを読み込めませんでした' : null,
    refresh,
    upsertReminder,
    removeReminder,
    createReminder: (
      input: Parameters<typeof services.reminders.create>[0],
      options?: Parameters<typeof services.reminders.create>[1],
    ) => createMutation.mutateAsync({ input, options }),
    deleteReminder: (id: string, options?: { deferCache?: boolean }) =>
      deleteMutation.mutateAsync({ id, ...options }),
    updateReminderTitle: (id: string, title: string) =>
      updateTitleMutation.mutateAsync({ id, title }),
    isCreating: createMutation.isPending,
  };
}
