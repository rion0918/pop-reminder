import { create } from 'zustand';

import {
  digitsToTime,
  timeToDigits,
  validateTimeInput,
} from '../../../shared/utils/time';
import type { ReminderDatePreset } from '../utils/reminderDatePresets';

export type ReminderDateOffset = 0 | 1 | 2;

type ReminderUiState = {
  isQuickAddOpen: boolean;
  title: string;
  dateOffset: ReminderDateOffset;
  datePreset: ReminderDatePreset;
  customTargetDate: string | null;
  timeDigits: string;
  timeTouched: boolean;
  isSaving: boolean;
  openQuickAdd: (defaultTime?: string) => void;
  closeQuickAdd: () => void;
  setTitle: (title: string) => void;
  setDateOffset: (dateOffset: ReminderDateOffset) => void;
  setPresetTargetDate: (datePreset: 'weekend' | 'nextWeek', date: string) => void;
  setCustomTargetDate: (date: string | null) => void;
  setTargetTime: (time: string) => void;
  setSaving: (isSaving: boolean) => void;
  resetInput: (defaultTime?: string) => void;
};

const initialState = {
  isQuickAddOpen: false,
  title: '',
  dateOffset: 1 as ReminderDateOffset,
  datePreset: 'tomorrow' as ReminderDatePreset,
  customTargetDate: null,
  timeDigits: '0800',
  timeTouched: false,
  isSaving: false,
};

export const useReminderUiStore = create<ReminderUiState>((set) => ({
  ...initialState,
  openQuickAdd: (defaultTime = '08:00') =>
    set((state) => {
      if (state.isQuickAddOpen) {
        return {};
      }

      return {
        isQuickAddOpen: true,
        title: '',
        dateOffset: 1,
        datePreset: 'tomorrow',
        customTargetDate: null,
        timeDigits: timeToDigits(defaultTime),
        timeTouched: false,
        isSaving: false,
      };
    }),
  closeQuickAdd: () => set({ isQuickAddOpen: false, isSaving: false }),
  setTitle: (title) => set({ title }),
  setDateOffset: (dateOffset) =>
    set({
      dateOffset,
      datePreset:
        dateOffset === 0 ? 'today' : dateOffset === 1 ? 'tomorrow' : 'dayAfterTomorrow',
      customTargetDate: null,
    }),
  setPresetTargetDate: (datePreset, customTargetDate) =>
    set({ datePreset, customTargetDate }),
  setCustomTargetDate: (customTargetDate) =>
    set({ customTargetDate, datePreset: customTargetDate ? 'custom' : 'tomorrow' }),
  setTargetTime: (time) => set({ timeDigits: timeToDigits(time), timeTouched: true }),
  setSaving: (isSaving) => set({ isSaving }),
  resetInput: (defaultTime = '08:00') =>
    set({
      title: '',
      dateOffset: 1,
      datePreset: 'tomorrow',
      customTargetDate: null,
      timeDigits: timeToDigits(defaultTime),
      timeTouched: false,
      isSaving: false,
    }),
}));

export function selectFormattedTime(state: ReminderUiState) {
  return digitsToTime(state.timeDigits);
}

export function selectIsTimeValid(state: ReminderUiState) {
  return validateTimeInput(state.timeDigits);
}
