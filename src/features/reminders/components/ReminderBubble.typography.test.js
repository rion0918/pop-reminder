/* global __dirname */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');

test('reminder bubble typography is derived from bubble size and title length', () => {
  const source = readFileSync(__dirname + '/ReminderBubble.tsx', 'utf8');

  assert.match(source, /type BubbleTypography = \{/);
  assert.match(source, /function getBubbleTypography\(width: number, height: number, titleVisualLength: number\): BubbleTypography/);
  assert.match(source, /const typography = getBubbleTypography\(bubbleWidth, bubbleHeight, titleVisualLength\);/);
  assert.match(source, /titleVisualLength <= 8/);
  assert.match(source, /titleAdjustsFontSizeToFit: !isShortTitle/);
  assert.match(source, /titleMinFontScale: isShortTitle \? 1 : isLongTitle \? 0\.72 : 0\.9/);
  assert.doesNotMatch(source, /const baseTitleFontSize =/);
  assert.doesNotMatch(source, /const titleFontReduction =/);
});

test('long reminder bubble titles avoid tail ellipsis', () => {
  const source = readFileSync(__dirname + '/ReminderBubble.tsx', 'utf8');

  assert.match(source, /const isLongTitle = titleVisualLength > 24;/);
  assert.match(source, /titleLineCount = isShortTitle \? 1 : isMediumTitle \? 2 : isLongTitle \? 4 : 3;/);
  assert.match(source, /titleEllipsizeMode: 'clip'/);
  assert.match(source, /ellipsizeMode=\{typography.titleEllipsizeMode\}/);
  assert.doesNotMatch(source, /<Text\n            adjustsFontSizeToFit=\{typography\.titleAdjustsFontSizeToFit\}\n            ellipsizeMode="tail"/);
});

test('reminder bubble can render as a wide bubble for long text', () => {
  const source = readFileSync(__dirname + '/ReminderBubble.tsx', 'utf8');

  assert.match(source, /width\?: number;/);
  assert.match(source, /height\?: number;/);
  assert.match(source, /const bubbleWidth = width \?\? size;/);
  assert.match(source, /const bubbleHeight = height \?\? size;/);
  assert.match(source, /function getBubbleTypography\(width: number, height: number, titleVisualLength: number\): BubbleTypography/);
  assert.match(source, /const textMeasure = Math\.min\(height, width \/ 1\.45\);/);
  assert.match(source, /width: bubbleWidth,/);
  assert.match(source, /height: bubbleHeight,/);
});

test('reminder bubble uses shared home visual tokens for iOS-like Android rendering', () => {
  const source = readFileSync(__dirname + '/ReminderBubble.tsx', 'utf8');
  const colorsSource = readFileSync(__dirname + '/../../../constants/colors.ts', 'utf8');

  assert.match(colorsSource, /export const homeVisualTokens = \{/);
  assert.match(colorsSource, /bubbleTintMistOpacity: 0\.26/);
  assert.match(colorsSource, /bubbleInnerColorRimOpacity: 0\.16/);
  assert.match(colorsSource, /bubbleSurfaceElevation: 0/);
  assert.match(source, /homeVisualTokens\.bubbleTintMistOpacity/);
  assert.match(source, /homeVisualTokens\.bubbleInnerColorRimOpacity/);
  assert.match(source, /homeVisualTokens\.bubbleSurfaceElevation/);
  assert.doesNotMatch(source, /sans-serif-medium/);
  assert.doesNotMatch(source, /androidGradient/);
  assert.doesNotMatch(source, /Platform\.OS === 'android' \? 0\.[0-9]+ : 0\.[0-9]+/);
});
