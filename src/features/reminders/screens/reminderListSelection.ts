export function startReminderSelection(id: string): Set<string> {
  return new Set([id]);
}

export function toggleReminderSelection(current: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(current);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

export function toggleAllReminderSelection(
  current: ReadonlySet<string>,
  visibleIds: string[],
): Set<string> {
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => current.has(id));
  return allSelected ? new Set() : new Set(visibleIds);
}

export function retainVisibleReminderSelection(
  current: ReadonlySet<string>,
  visibleIds: string[],
): Set<string> {
  const visibleIdSet = new Set(visibleIds);
  return new Set([...current].filter((id) => visibleIdSet.has(id)));
}

export type ReminderBulkDeleteResult =
  | { ok: true; deletedIds: string[]; remainingSelectedIds: Set<string> }
  | { ok: false; error: unknown; remainingSelectedIds: Set<string> };

export async function executeReminderBulkDelete(
  ids: string[],
  deleteMany: (ids: string[]) => Promise<string[]>,
): Promise<ReminderBulkDeleteResult> {
  try {
    const deletedIds = await deleteMany(ids);
    return { ok: true, deletedIds, remainingSelectedIds: new Set() };
  } catch (error) {
    return { ok: false, error, remainingSelectedIds: new Set(ids) };
  }
}
