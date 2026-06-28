import { useReminderUiStore } from './reminderUiStore';

const state = useReminderUiStore.getState();

state.resetTitle();
