import type { QueryClient } from '@tanstack/react-query';

import type { Reminder } from '../domain/reminder';

export const activeRemindersQueryKey = ['reminders', 'active'] as const;

export function removeRemindersFromQueryCache(queryClient: QueryClient, ids: string[]) {
  const idSet = new Set(ids);
  queryClient.setQueryData<Reminder[]>(activeRemindersQueryKey, (current = []) =>
    current.filter((item) => !idSet.has(item.id)),
  );
}

type DeleteRemindersMutationDependencies = {
  deleteMany: (ids: string[]) => Promise<string[]>;
  removeReminders: (ids: string[]) => void;
  reconcile: () => undefined | Promise<unknown>;
};

export async function deleteRemindersAndSyncCache(
  ids: string[],
  options: { deferCache?: boolean },
  dependencies: DeleteRemindersMutationDependencies,
) {
  const deletedIds = await dependencies.deleteMany(ids);

  if (options.deferCache) {
    return deletedIds;
  }

  dependencies.removeReminders(deletedIds);
  void dependencies.reconcile();
  return deletedIds;
}
