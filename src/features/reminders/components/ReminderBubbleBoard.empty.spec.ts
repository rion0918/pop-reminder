import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './ReminderBubbleBoard.tsx');

test('bubble board keeps loading and error states ahead of the empty add state', () => {
  const loadingIndex = source.indexOf('if (loading)');
  const errorIndex = source.indexOf('if (error)');
  const emptyIndex = source.indexOf('if (reminders.length === 0)');

  assert.ok(loadingIndex >= 0);
  assert.ok(errorIndex > loadingIndex);
  assert.ok(emptyIndex > errorIndex);
});

test('bubble board presents the selected empty-state copy with the add bubble centered vertically', () => {
  assertSourceIncludes(source, [
    /import \{ EmptyReminderBubble \} from '\.\/EmptyReminderBubble';/,
    /onEmptyPress\?: \(\) => void;/,
    /emptyDisabled\?: boolean;/,
    /const emptyBubbleSize = Math\.round\(\s*clamp\(\s*Math\.min\(boardSize\.width \* 0\.82, boardSize\.height \* 0\.48\),\s*184,\s*286,?\s*\),?\s*\);/,
    /const EMPTY_HEADLINE_BLOCK_HEIGHT = 31 \* 2 \+ 32;/,
    /const emptySceneTopPadding = Math\.max\(\s*0,\s*Math\.round\(\(boardSize\.height - emptyBubbleSize\) \/ 2 - EMPTY_HEADLINE_BLOCK_HEIGHT\),?\s*\);/,
    /const emptyInstructionGap = Math\.round\(\s*clamp\(boardSize\.height \* 0\.09, 32, 68\),?\s*\);/,
    /最初のリマインドを\{`\\n`\}ふわっと残そう。/,
    /styles\.emptyScene, \{ paddingTop: emptySceneTopPadding \}/,
    /<EmptyReminderBubble[\s\S]*size=\{emptyBubbleSize\}[\s\S]*disabled=\{emptyDisabled\}[\s\S]*onPress=\{onEmptyPress\}/,
    /styles\.emptyInstruction, \{ marginTop: emptyInstructionGap \}/,
    />\s*泡をタップして追加\s*<\/Text>/,
  ]);
  assertSourceContract(source, {
    excludes: [/まだ泡はひとつも浮いていません/, /右下からふわっとどうぞ/, /右下から/],
  });
});
