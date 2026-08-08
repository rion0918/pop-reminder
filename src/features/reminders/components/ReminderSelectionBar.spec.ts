import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './ReminderSelectionBar.tsx');

test('selection bar is an accessible responsive material with immediate press feedback', () => {
  assertSourceIncludes(source, [
    /selectedCount: number;/,
    /allSelected: boolean;/,
    /busy: boolean;/,
    /\{selectedCount\}件選択中/,
    /allSelected \? '選択解除' : 'すべて選択'/,
    /busy \? '削除中…' : `\$\{selectedCount\}件を削除`/,
    /accessibilityState=\{\{ disabled: selectedCount === 0 \|\| busy \}\}/,
    /pressed \? styles\.actionPressed : null/,
    /useReducedMotion\(\)/,
    /withSpring\(1, SELECTION_BAR_SPRING\)/,
    /backgroundColor: 'rgba\(255,255,255,0\.86\)'/,
    /minHeight: 60/,
  ]);
});
