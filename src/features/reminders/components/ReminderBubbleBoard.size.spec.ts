import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './ReminderBubbleBoard.tsx');

test('bubble board gives extra size to long reminder titles', () => {
  assertSourceIncludes(source, [
    /if \(visualLength >= 32\) \{/,
    /return 1\.64;/,
    /if \(visualLength >= 24\) \{/,
    /return 1\.52;/,
    /if \(visualLength >= 32\) \{\n    return bucketMin \+ \(visibleCount >= 8 \? 26 : 34\);/,
  ]);
});

test('bubble board lays out long titles with wide bubble dimensions', () => {
  assertSourceIncludes(source, [
    /type BubbleDimensions = \{/,
    /width: number;\n  height: number;\n  collisionSize: number;/,
    /function getBubbleDimensions\(\s*reminder: Reminder,\s*boardSize: BoardSize,\s*visibleCount: number,\s*\): BubbleDimensions/,
    /const aspectRatio = titleVisualLength >= 32 \? 1\.72 : titleVisualLength >= 24 \? 1\.56 : 1;/,
    /return \{\n    width,\n    height,\n    collisionSize: Math\.max\(width, height\),\n  \};/,
    /width: cachedLayout\.width,/,
    /height: cachedLayout\.height,/,
    /<ReminderBubble[\s\S]*key=\{reminder\.id\}[\s\S]*reminder=\{reminder\}[\s\S]*index=\{visualIndex\}[\s\S]*size=\{size\}[\s\S]*width=\{width\}[\s\S]*height=\{height\}/,
  ]);
});

test('bubble board can freeze layout measurements while an overlay is open', () => {
  assertSourceIncludes(source, [
    /freezeLayout\?: boolean;/,
    /freezeLayout,/,
    /if \(freezeLayout && current\.width > 0 && current\.height > 0\) \{/,
    /return current;/,
  ]);
});
