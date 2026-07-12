import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readSource } from '../test-utils/sourceAssertions';

const domainSources = [
  readSource(import.meta.url, '../features/reminders/domain/reminder.ts'),
  readSource(import.meta.url, '../features/reminders/domain/reminderSchedule.ts'),
  readSource(import.meta.url, '../features/settings/domain/appSettings.ts'),
].join('\n');
const presentationSources = [
  readSource(import.meta.url, '../features/reminders/presentation/useRemindersQuery.ts'),
  readSource(import.meta.url, '../features/settings/presentation/useAppSettingsQuery.ts'),
].join('\n');

test('domain does not import database, Expo, React, or React Native modules', () => {
  assert.doesNotMatch(domainSources, /from ['"][^'"]*(?:db|expo|react-native|react)['"]/);
});

test('presentation does not import infrastructure adapters', () => {
  assert.doesNotMatch(presentationSources, /from ['"][^'"]*infrastructure[^'"]*['"]/);
});
