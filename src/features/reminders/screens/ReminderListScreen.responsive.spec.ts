import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './ReminderListScreen.tsx');

test('reminder list summary keeps count inside narrow Android widths', () => {
  assertSourceIncludes(source, [
    /<View style=\{styles\.summaryCopy\}>/,
    /<Text numberOfLines=\{1\} style=\{styles\.kicker\}>/,
    /<Text numberOfLines=\{2\} style=\{styles\.title\}>/,
    /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.82\}[\s\S]*style=\{styles\.countText\}/,
    /summaryCopy: \{[\s\S]*flex: 1,[\s\S]*minWidth: 0,/,
    /countPill: \{[\s\S]*flexShrink: 0,[\s\S]*maxWidth: '34%',/,
    /countText: \{[\s\S]*includeFontPadding: false,/,
  ]);
});
