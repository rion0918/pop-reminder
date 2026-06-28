/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('bubble board gives extra size to long reminder titles', () => {
  const source = readFileSync(__dirname + '/ReminderBubbleBoard.tsx', 'utf8');

  assert.match(source, /if \(visualLength >= 32\) \{/);
  assert.match(source, /return 1\.64;/);
  assert.match(source, /if \(visualLength >= 24\) \{/);
  assert.match(source, /return 1\.52;/);
  assert.match(source, /if \(visualLength >= 32\) \{\n    return bucketMin \+ \(visibleCount >= 8 \? 26 : 34\);/);
});

test('bubble board lays out long titles with wide bubble dimensions', () => {
  const source = readFileSync(__dirname + '/ReminderBubbleBoard.tsx', 'utf8');

  assert.match(source, /type BubbleDimensions = \{/);
  assert.match(source, /width: number;\n  height: number;\n  collisionSize: number;/);
  assert.match(source, /function getBubbleDimensions\(reminder: Reminder, boardSize: BoardSize, visibleCount: number\): BubbleDimensions/);
  assert.match(source, /const aspectRatio = titleVisualLength >= 32 \? 1\.72 : titleVisualLength >= 24 \? 1\.56 : 1;/);
  assert.match(source, /return \{\n    width,\n    height,\n    collisionSize: Math\.max\(width, height\),\n  \};/);
  assert.match(source, /width: cachedLayout\.width,/);
  assert.match(source, /height: cachedLayout\.height,/);
  assert.match(source, /<ReminderBubble\n          key=\{reminder\.id\}\n          reminder=\{reminder\}\n          index=\{visualIndex\}\n          size=\{size\}\n          width=\{width\}\n          height=\{height\}/);
});
