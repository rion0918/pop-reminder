import { test } from 'node:test';

import { assertSourceContract, readSource } from '../test-utils/sourceAssertions';

const source = readSource(import.meta.url, '../app/_layout.tsx');

test('bootstrap loading state uses the centered disabled reminder bubble', () => {
  assertSourceContract(source, {
    includes: [
      /import \{ EmptyReminderBubble \} from '\.\.\/features\/reminders\/components\/EmptyReminderBubble';/,
      /useWindowDimensions/,
      /const bootstrapBubbleSize = Math\.round\(\s*Math\.min\(Math\.max\(windowWidth \* 0\.68, 184\), 286\),?\s*\);/,
      /bootstrapState === 'loading' \? \(\s*<EmptyReminderBubble size=\{bootstrapBubbleSize\} disabled \/>/,
    ],
    excludes: [/ActivityIndicator/],
  });
});

test('bootstrap error state keeps its retry action', () => {
  assertSourceContract(source, {
    includes: [
      /<Text style=\{styles\.errorTitle\}>起動できませんでした<\/Text>/,
      /<Text style=\{styles\.errorBody\}>データベースを準備できませんでした。<\/Text>/,
      /onPress=\{\(\) => void prepare\(\)\}/,
      />もう一度試す<\/Text>/,
    ],
  });
});
