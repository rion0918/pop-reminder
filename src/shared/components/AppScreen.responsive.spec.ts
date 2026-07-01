import { test } from 'node:test';

import { assertSourceContract, readSource } from '../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './AppScreen.tsx');

test('app screen reduces horizontal padding on compact phone widths', () => {
  assertSourceContract(source, {
    includes: [
      /useWindowDimensions/,
      /const horizontalPadding = width <= 360 \? 16 : 20;/,
      /<View style=\{\[styles\.container, \{ paddingHorizontal: horizontalPadding \}\]\}>/,
    ],
    excludes: [/paddingHorizontal: 20,/],
  });
});
