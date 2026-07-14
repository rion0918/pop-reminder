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
