import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './ReminderSelectionBar.tsx');

test('selection bar is an accessible responsive material with immediate press feedback', () => {
  assertSourceIncludes(source, [
    /selectedCount: number;/,
    /allSelected: boolean;/,
    /busy: boolean;/,
    /\{selectedCount\}件選択中/,
    /allSelected \? '選択解除' : 'すべて選択'/,
    /const deleteButtonLabel = busy/,
    /\{deleteButtonLabel\}/,
    /accessibilityState=\{\{ disabled: selectedCount === 0 \|\| busy \}\}/,
    /pressed \? styles\.actionPressed : null/,
    /useReducedMotion\(\)/,
    /withSpring\(1, SELECTION_BAR_SPRING\)/,
    /backgroundColor: 'rgba\(255,255,255,0\.86\)'/,
    /minHeight: 60/,
  ]);
});

test('selection bar keeps the destructive icon and label together on narrow screens', () => {
  assertSourceContract(source, {
    includes: [
      /<View style=\{\[styles\.actionGroup, compact \? styles\.actionGroupCompact : null\]\}>/,
      /styles\.toggleActionCompact/,
      /styles\.deleteActionCompact/,
      /const deleteButtonLabel = busy[\s\S]*compact[\s\S]*'処理中'[\s\S]*'削除中…'[\s\S]*compact[\s\S]*'削除'[\s\S]*`\$\{selectedCount\}件を削除`/,
      /selectionCount: \{[\s\S]*flex: 1,[\s\S]*minWidth: 0,[\s\S]*alignItems: 'flex-start'/,
      /actionGroup: \{[\s\S]*flexDirection: 'row',[\s\S]*flexShrink: 0/,
      /deleteAction: \{[\s\S]*minWidth: 118,[\s\S]*flexDirection: 'row'/,
      /deleteActionCompact: \{[\s\S]*minWidth: 82/,
    ],
    excludes: [/toggleAction: \{\s*flex:/, /deleteAction: \{\s*flex:/],
  });
});
