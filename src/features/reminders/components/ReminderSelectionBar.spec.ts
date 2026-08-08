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
    /accessibilityLabel=\{busy \? `\$\{selectedCount\}件を削除中` : `\$\{selectedCount\}件を削除`\}/,
    /accessibilityState=\{\{ disabled: selectedCount === 0 \|\| busy \}\}/,
    /pressed \? styles\.actionPressed : null/,
    /useReducedMotion\(\)/,
    /withSpring\(1, SELECTION_BAR_SPRING\)/,
    /backgroundColor: 'rgba\(255,255,255,0\.86\)'/,
    /minHeight: 64/,
  ]);
});

test('selection bar keeps one large destructive icon without repeating the selected count', () => {
  assertSourceContract(source, {
    includes: [
      /<View style=\{\[styles\.actionGroup, compact \? styles\.actionGroupCompact : null\]\}>/,
      /styles\.toggleActionCompact/,
      /selectionCount: \{[\s\S]*flex: 1,[\s\S]*minWidth: 0,[\s\S]*alignItems: 'flex-start'/,
      /actionGroup: \{[\s\S]*flexDirection: 'row',[\s\S]*flexShrink: 0/,
      /actionGroupCompact: \{\s*gap: 8/,
      /accessibilityHint="削除確認を開きます"/,
      /pressRetentionOffset=\{12\}/,
      /android_ripple=\{\{ color: 'rgba\(248,113,113,0\.22\)' \}\}/,
      /<Ionicons name="trash-outline" size=\{24\}/,
      /action: \{[\s\S]*minHeight: 56,[\s\S]*overflow: 'hidden'/,
      /deleteAction: \{[\s\S]*width: 56,[\s\S]*height: 56,[\s\S]*paddingHorizontal: 0/,
      /deleteIconSlot: \{[\s\S]*width: 28,[\s\S]*height: 28/,
    ],
    excludes: [
      /toggleAction: \{\s*flex:/,
      /deleteAction: \{\s*flex:/,
      /deleteButtonLabel/,
      /styles\.deleteLabel/,
      /deleteActionCompact/,
    ],
  });
});
