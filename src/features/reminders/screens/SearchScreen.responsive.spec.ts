import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './SearchScreen.tsx');

test('search result meta keeps the result count inside narrow widths', () => {
  assertSourceIncludes(source, [
    /<Text numberOfLines=\{1\} style=\{styles\.resultMetaText\}>/,
    /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.82\}[\s\S]*style=\{styles\.resultMetaSub\}/,
    /resultMetaText: \{[\s\S]*flex: 1,[\s\S]*minWidth: 0,/,
    /resultMetaSub: \{[\s\S]*flexShrink: 0,[\s\S]*maxWidth: '34%',/,
    /resultMetaSub: \{[\s\S]*includeFontPadding: false,/,
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
