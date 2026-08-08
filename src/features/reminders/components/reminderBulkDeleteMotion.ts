import type { BubbleDeleteMotion } from './ReminderBubbleBoard';

export const BULK_DELETE_BURST_STAGGER_MS = 70;

export function makeBulkDeleteMotions(ids: string[]): BubbleDeleteMotion[] {
  return ids.map((reminderId, index) => ({
    reminderId,
    phase: 'bursting',
    delayMs: index * BULK_DELETE_BURST_STAGGER_MS,
    hapticsEnabled: index === 0,
  }));
}
