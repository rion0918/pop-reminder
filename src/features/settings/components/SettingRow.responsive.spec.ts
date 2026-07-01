import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './SettingRow.tsx');

test('setting rows keep controls reachable on compact Android widths', () => {
  assertSourceContract(source, {
    includes: [
      /<Text style=\{styles\.title\}>/,
      /<Text style=\{styles\.caption\}>/,
      /tapArea: \{[\s\S]*flex: 1,[\s\S]*minWidth: 0,/,
      /iconWrap: \{[\s\S]*flexShrink: 0,/,
      /copy: \{[\s\S]*flex: 1,[\s\S]*minWidth: 48,/,
      /control: \{[\s\S]*flexShrink: 0,/,
    ],
    excludes: [
      /<Text numberOfLines=\{1\} style=\{styles\.title\}>/,
      /<Text numberOfLines=\{2\} style=\{styles\.caption\}>/,
    ],
  });

  assertSourceIncludes(source, [
    /title: \{[\s\S]*fontSize: 14,[\s\S]*lineHeight: 19,[\s\S]*includeFontPadding: false,/,
    /caption: \{[\s\S]*fontSize: 11,[\s\S]*lineHeight: 16,/,
  ]);
});
