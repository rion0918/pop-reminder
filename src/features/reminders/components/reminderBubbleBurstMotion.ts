import { REMINDER_BUBBLE_BURST_MS, REMINDER_BUBBLE_RUPTURE_MS } from './ReminderBubbleBurst.types';

export function clampBurstProgress(value: number) {
  'worklet';
  return Math.min(1, Math.max(0, value));
}

export function getRuptureProgress(progress: number) {
  'worklet';
  return clampBurstProgress(
    (progress * REMINDER_BUBBLE_BURST_MS - REMINDER_BUBBLE_RUPTURE_MS) / 75,
  );
}

export function getBurstSurfaceFrame(progress: number, hasMembrane: boolean) {
  'worklet';
  const ms = progress * REMINDER_BUBBLE_BURST_MS;
  const tremor =
    ms < REMINDER_BUBBLE_RUPTURE_MS
      ? Math.sin((ms / REMINDER_BUBBLE_RUPTURE_MS) * Math.PI * 2) * 0.008
      : 0;
  return {
    opacity:
      ms < REMINDER_BUBBLE_RUPTURE_MS
        ? 1
        : hasMembrane
          ? 0
          : 1 - clampBurstProgress((ms - REMINDER_BUBBLE_RUPTURE_MS) / 25),
    scaleX: 1 + tremor,
    scaleY: 1 - tremor * 0.7,
  };
}
