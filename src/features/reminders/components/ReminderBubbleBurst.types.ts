import type { RefObject } from 'react';
import type { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import type { BubbleDeleteMotionPhase } from './ReminderBubble';

export const REMINDER_BUBBLE_BURST_MS = 380;
export const REMINDER_BUBBLE_RUPTURE_MS = 55;
export const REMINDER_BUBBLE_RESTORE_MS = 220;

export type ReminderBubbleBurstColor = {
  background: string;
  border: string;
  accent: string;
};

export type ReminderBubbleBurstProps = {
  reminderId: string;
  width: number;
  height: number;
  color: ReminderBubbleBurstColor;
  phase?: BubbleDeleteMotionPhase;
  delayMs?: number;
  hapticsEnabled?: boolean;
  isSelected?: boolean;
  surfaceRef: RefObject<View | null>;
  surfaceKey: string;
  surfaceReady: boolean;
  motion: {
    progress: SharedValue<number>;
    snapshotReady: SharedValue<boolean>;
    membraneMode: SharedValue<number>;
    activePhase: SharedValue<BubbleDeleteMotionPhase | undefined>;
  };
};
