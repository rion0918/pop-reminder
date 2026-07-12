import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './SearchScreen.tsx');

test('search result meta keeps the result count inside narrow widths', () => {
  assertSourceIncludes(source, [
    /<Text numberOfLines=\{1\} className="min-w-0 flex-1 text-\[14px\] font-black text-app-ink">/,
    /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.82\}[\s\S]*className="min-h-\[28px\] min-w-\[42px\] max-w-\[34%\] shrink-0/,
    /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.82\}[\s\S]*style=\{styles\.noFontPadding\}/,
    /noFontPadding: \{[\s\S]*includeFontPadding: false,/,
  ]);
});

test('search removes deleted reminders locally before a silent refresh', () => {
  assertSourceIncludes(source, [
    /const refresh = useCallback\(async \(options\?: \{ silent\?: boolean \}\) => \{/,
    /if \(!options\?\.silent\) \{[\s\S]*setLoading\(true\);[\s\S]*\}/,
    /setReminders\(\(current\) => current\.filter\(\(item\) => item\.id !== reminder\.id\)\);/,
    /await refresh\(\{ silent: true \}\);/,
  ]);
});

test('search reflects edited titles without resetting the current result set', () => {
  assertSourceIncludes(source, [
    /import \{ updateReminderTitle \} from '..\/services\/updateReminderTitleService';/,
    /const handleUpdateReminderTitle = useCallback\(/,
    /setReminders\(\(current\) =>[\s\S]*current\.map\(\(item\) => \(item\.id === updatedReminder\.id \? updatedReminder : item\)\)/,
    /onUpdateTitle=\{handleUpdateReminderTitle\}/,
  ]);
});
