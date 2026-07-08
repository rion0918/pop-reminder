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
      /className="-my-\[10px\] min-w-0 flex-1 flex-row items-center gap-\[12px\] py-\[10px\]"/,
      /className="h-\[34px\] w-\[34px\] shrink-0 items-center justify-center rounded-\[17px\] bg-\[#F2F7FE\]"/,
      /className="min-w-\[48px\] flex-1"/,
      /className="shrink-0 items-end"/,
    ],
    excludes: [
      /<Text numberOfLines=\{1\} style=\{styles\.title\}>/,
      /<Text numberOfLines=\{2\} style=\{styles\.caption\}>/,
    ],
  });

  assertSourceIncludes(source, [
    /className="text-\[14px\] font-extrabold leading-\[19px\] text-app-ink"[\s\S]*style=\{\{ includeFontPadding: false \}\}/,
    /className="mt-\[3px\] text-\[11px\] font-semibold leading-\[16px\] text-app-muted"/,
  ]);
});
