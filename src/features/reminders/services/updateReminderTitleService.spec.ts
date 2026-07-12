import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './updateReminderTitleService.ts');

test('title update replaces future notifications before cancelling their previous schedule', () => {
  assertSourceIncludes(source, [
    /const reminder = await getReminderById\(id\);/,
    /const updatedReminder = await updateReminderTitleById\(id, parsedTitle\);/,
    /const notificationIds = await notificationGateway\.scheduleReminderNotifications\(/,
    /await notificationGateway\.cancelReminderNotifications\(reminder\);/,
    /await updateReminderNotificationIds\(\s*updatedReminder\.id,\s*notificationIds,\s*\);/,
    /await updateWidget\(\);/,
  ]);
  assertSourceContract(source, {
    excludes: [/void updateWidget\(\);/],
  });
});
