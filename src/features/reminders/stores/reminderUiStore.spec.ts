import assert from 'node:assert/strict';
import { test } from 'node:test';

import { useReminderUiStore } from './reminderUiStore';

test('quick add date defaults to today when opened and reset', () => {
  const store = useReminderUiStore;

  store.getState().resetInput();
  assert.equal(store.getState().dateOffset, 0);
  assert.equal(store.getState().datePreset, 'today');

  store.getState().openQuickAdd();
  assert.equal(store.getState().dateOffset, 0);
  assert.equal(store.getState().datePreset, 'today');

  store.getState().closeQuickAdd();
});

test('quick add exposes interruptible voice start and stop requests', () => {
  const store = useReminderUiStore;
  const initialStartRequest = store.getState().voiceInputRequestId;
  const initialStopRequest = store.getState().voiceInputStopRequestId;

  store.getState().openQuickAdd('08:00', { inputMode: 'voice' });
  assert.equal(store.getState().quickAddInputMode, 'voice');
  assert.equal(store.getState().voiceInputRequestId, initialStartRequest + 1);

  store.getState().requestVoiceInputStop();
  assert.equal(store.getState().voiceInputStopRequestId, initialStopRequest + 1);

  store.getState().completeVoiceInput();
  assert.equal(store.getState().quickAddInputMode, 'text');
  store.getState().closeQuickAdd();
});

test('opening voice quick add keeps its pending request through sheet input reset', () => {
  const store = useReminderUiStore;

  store.getState().openQuickAdd('08:00', { inputMode: 'voice' });
  store.getState().resetInput('09:00');

  assert.equal(store.getState().quickAddInputMode, 'voice');
  store.getState().closeQuickAdd();
});

test('quick add exposes picker visibility so raise-to-speak can pause', () => {
  const store = useReminderUiStore;

  store.getState().setQuickAddPickerOpen(true);
  assert.equal(store.getState().isQuickAddPickerOpen, true);

  store.getState().closeQuickAdd();
  assert.equal(store.getState().isQuickAddPickerOpen, false);
});
