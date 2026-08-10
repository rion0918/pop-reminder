import { create } from 'zustand';

import { digitsToTime, timeToDigits, validateTimeInput } from '../../../shared/utils/time';
import type { ReminderDatePreset } from '../utils/reminderDatePresets';

export type ReminderDateOffset = 0 | 1 | 2;

type QuickAddOptions = {
  focusTitle?: boolean;
  inputMode?: QuickAddInputMode;
};

export type QuickAddInputMode = 'text' | 'voice';

type ReminderUiState = {
  isQuickAddOpen: boolean;
  shouldFocusTitleOnOpen: boolean;
  quickAddInputMode: QuickAddInputMode;
  isQuickAddPickerOpen: boolean;
  voiceInputRequestId: number;
  voiceInputStopRequestId: number;
  title: string;
  dateOffset: ReminderDateOffset;
  datePreset: ReminderDatePreset;
  customTargetDate: string | null;
  timeDigits: string;
  timeTouched: boolean;
  openQuickAdd: (defaultTime?: string, options?: QuickAddOptions) => void;
  closeQuickAdd: () => void;
  requestVoiceInputStop: () => void;
  completeVoiceInput: () => void;
  setQuickAddPickerOpen: (isOpen: boolean) => void;
  setTitle: (title: string) => void;
  resetTitle: () => void;
  setDateOffset: (dateOffset: ReminderDateOffset) => void;
  setPresetTargetDate: (datePreset: 'weekend' | 'nextWeek', date: string) => void;
  setCustomTargetDate: (date: string | null) => void;
  setTargetTime: (time: string) => void;
  resetInput: (defaultTime?: string) => void;
};

const initialState = {
  isQuickAddOpen: false,
  shouldFocusTitleOnOpen: false,
  quickAddInputMode: 'text' as QuickAddInputMode,
  isQuickAddPickerOpen: false,
  voiceInputRequestId: 0,
  voiceInputStopRequestId: 0,
  title: '',
  dateOffset: 0 as ReminderDateOffset,
  datePreset: 'today' as ReminderDatePreset,
  customTargetDate: null,
  timeDigits: '0800',
  timeTouched: false,
};

export const useReminderUiStore = create<ReminderUiState>((set) => ({
  ...initialState,
  openQuickAdd: (defaultTime = '08:00', options) =>
    set((state) => {
      const shouldFocusTitleOnOpen = Boolean(options?.focusTitle);
      const quickAddInputMode = options?.inputMode ?? 'text';
      const voiceInputRequestId =
        quickAddInputMode === 'voice' ? state.voiceInputRequestId + 1 : state.voiceInputRequestId;

      if (state.isQuickAddOpen) {
        return {
          shouldFocusTitleOnOpen,
          quickAddInputMode,
          voiceInputRequestId,
        };
      }

      return {
        isQuickAddOpen: true,
        shouldFocusTitleOnOpen,
        quickAddInputMode,
        isQuickAddPickerOpen: false,
        voiceInputRequestId,
        title: '',
        dateOffset: 0,
        datePreset: 'today',
        customTargetDate: null,
        timeDigits: timeToDigits(defaultTime),
        timeTouched: false,
      };
    }),
  closeQuickAdd: () =>
    set({
      isQuickAddOpen: false,
      shouldFocusTitleOnOpen: false,
      quickAddInputMode: 'text',
      isQuickAddPickerOpen: false,
    }),
  requestVoiceInputStop: () =>
    set((state) => ({ voiceInputStopRequestId: state.voiceInputStopRequestId + 1 })),
  completeVoiceInput: () => set({ quickAddInputMode: 'text' }),
  setQuickAddPickerOpen: (isQuickAddPickerOpen) => set({ isQuickAddPickerOpen }),
  setTitle: (title) => set({ title }),
  resetTitle: () => set({ title: '' }),
  setDateOffset: (dateOffset) =>
    set({
      dateOffset,
      datePreset: dateOffset === 0 ? 'today' : dateOffset === 1 ? 'tomorrow' : 'dayAfterTomorrow',
      customTargetDate: null,
    }),
  setPresetTargetDate: (datePreset, customTargetDate) => set({ datePreset, customTargetDate }),
  setCustomTargetDate: (customTargetDate) =>
    set({ customTargetDate, datePreset: customTargetDate ? 'custom' : 'tomorrow' }),
  setTargetTime: (time) => set({ timeDigits: timeToDigits(time), timeTouched: true }),
  resetInput: (defaultTime = '08:00') =>
    set({
      title: '',
      dateOffset: 0,
      datePreset: 'today',
      customTargetDate: null,
      timeDigits: timeToDigits(defaultTime),
      timeTouched: false,
      shouldFocusTitleOnOpen: false,
      isQuickAddPickerOpen: false,
    }),
}));

export function selectFormattedTime(state: ReminderUiState) {
  return digitsToTime(state.timeDigits);
}

export function selectIsTimeValid(state: ReminderUiState) {
  return validateTimeInput(state.timeDigits);
}
