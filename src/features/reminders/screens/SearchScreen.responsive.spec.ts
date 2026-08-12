import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './SearchScreen.tsx');

test('search result meta keeps the result count inside narrow widths', () => {
  assertSourceIncludes(source, [
    /<Text numberOfLines=\{1\} className="min-w-0 flex-1 text-\[14px\] font-black text-app-ink">/,
    /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.82\}[\s\S]*className="min-h-\[28px\] min-w-\[42px\] max-w-\[34%\] shrink-0/,
    /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.82\}[\s\S]*style=\{styles\.noFontPadding\}/,
    /noFontPadding: \{[\s\S]*includeFontPadding: false,/,
  ]);
  assert.equal(source.includes('verticalLayoutMode'), false);
});

test('search removes deleted reminders locally before a silent refresh', () => {
  assertSourceIncludes(source, [
    /import \{ useRemindersQuery as useReminders \} from '..\/presentation\/useRemindersQuery';/,
    /deleteReminder,/,
    /updateReminderTitle,/,
    /const deleted = await deleteReminder\(reminder\.id\);/,
    /setSelectedReminderId\(null\);/,
  ]);
});

test('search reflects edited titles without resetting the current result set', () => {
  assertSourceIncludes(source, [
    /import \{ useRemindersQuery as useReminders \} from '..\/presentation\/useRemindersQuery';/,
    /const handleUpdateReminderTitle = useCallback\(/,
    /const updatedReminder = await updateReminderTitle\(reminder\.id, title\);/,
    /onUpdateTitle=\{handleUpdateReminderTitle\}/,
  ]);
});

test('search keeps native IME text uncontrolled and defers expensive result updates', () => {
  assertSourceContract(source, {
    includes: [
      /useDeferredValue/,
      /const searchInputRef = useRef<TextInput>\(null\);/,
      /const deferredQuery = useDeferredValue\(query\);/,
      /filterReminders\(reminders, deferredQuery, filter\)/,
      /ref=\{searchInputRef\}/,
      /defaultValue=""/,
      /returnKeyType="search"/,
      /submitBehavior="blurAndSubmit"/,
      /onSubmitEditing=\{Keyboard\.dismiss\}/,
      /searchInputRef\.current\?\.clear\(\);/,
    ],
    excludes: [/value=\{query\}/],
  });
});
