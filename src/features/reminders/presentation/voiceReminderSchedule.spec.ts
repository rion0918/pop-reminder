import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseVoiceReminder } from '../domain/voiceReminderParser';
import { getVoiceReminderSchedulePatch } from './voiceReminderSchedule';

const now = new Date(2026, 8, 20, 15, 40);

function parse(text: string) {
  return parseVoiceReminder({
    text,
    currentDateTime: now,
    currentUiDate: '2026-09-20',
    currentUiTime: '08:00',
  });
}

test('maps parsed nearby dates to the existing quick-add date chips', () => {
  assert.deepEqual(getVoiceReminderSchedulePatch(parse('明日に薬'), now), {
    dateOffset: 1,
    customTargetDate: null,
    targetTime: null,
  });
});

test('maps dates outside the quick-add chips to a custom date without changing time', () => {
  assert.deepEqual(getVoiceReminderSchedulePatch(parse('10月1日に会議'), now), {
    dateOffset: null,
    customTargetDate: '2026-10-01',
    targetTime: null,
  });
});

test('keeps non-parsed date and time fields untouched', () => {
  assert.deepEqual(getVoiceReminderSchedulePatch(parse('来週に会議'), now), {
    dateOffset: null,
    customTargetDate: null,
    targetTime: null,
  });
  assert.deepEqual(getVoiceReminderSchedulePatch(parse('15時に会議'), now), {
    dateOffset: null,
    customTargetDate: null,
    targetTime: '15:00',
  });
});

test('keeps an explicit past date as a custom target instead of future-correcting it', () => {
  assert.deepEqual(getVoiceReminderSchedulePatch(parse('2025年1月5日に確認'), now), {
    dateOffset: null,
    customTargetDate: '2025-01-05',
    targetTime: null,
  });
});
