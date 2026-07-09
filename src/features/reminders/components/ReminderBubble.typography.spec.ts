import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './ReminderBubble.tsx');
const colorsSource = readSource(import.meta.url, '../../../constants/colors.ts');

test('reminder bubble typography is derived from bubble size and title length', () => {
  assertSourceContract(source, {
    includes: [
      /type BubbleTypography = \{/,
      /function getBubbleTypography\(\s*width: number,\s*height: number,\s*titleVisualLength: number,\s*\): BubbleTypography/,
      /const typography = getBubbleTypography\(bubbleWidth, bubbleHeight, titleVisualLength\);/,
      /titleVisualLength <= 8/,
      /titleAdjustsFontSizeToFit: !isShortTitle/,
      /titleMinFontScale: isShortTitle \? 1 : isLongTitle \? 0\.72 : 0\.9/,
    ],
    excludes: [/const baseTitleFontSize =/, /const titleFontReduction =/],
  });
});

test('long reminder bubble titles avoid tail ellipsis', () => {
  assertSourceContract(source, {
    includes: [
      /const isLongTitle = titleVisualLength > 24;/,
      /titleLineCount = isShortTitle \? 1 : isMediumTitle \? 2 : isLongTitle \? 4 : 3;/,
      /titleEllipsizeMode: 'clip'/,
      /ellipsizeMode=\{typography.titleEllipsizeMode\}/,
    ],
    excludes: [
      /<Text\n {12}adjustsFontSizeToFit=\{typography\.titleAdjustsFontSizeToFit\}\n {12}ellipsizeMode="tail"/,
    ],
  });
});

test('reminder bubble can render as a wide bubble for long text', () => {
  assertSourceIncludes(source, [
    /width\?: number;/,
    /height\?: number;/,
    /const bubbleWidth = width \?\? size;/,
    /const bubbleHeight = height \?\? size;/,
    /function getBubbleTypography\(\s*width: number,\s*height: number,\s*titleVisualLength: number,\s*\): BubbleTypography/,
    /const textMeasure = Math\.min\(height, width \/ 1\.45\);/,
    /width: bubbleWidth,/,
    /height: bubbleHeight,/,
  ]);
});

test('reminder bubble uses shared home visual tokens for iOS-like Android rendering', () => {
  assertSourceIncludes(colorsSource, [
    /export const homeVisualTokens = \{/,
    /bubbleTintMistOpacity: 0\.46/,
    /bubbleInnerColorRimOpacity: 0\.3/,
    /bubbleSurfaceElevation: 0/,
  ]);
  assertSourceContract(source, {
    includes: [
      /homeVisualTokens\.bubbleTintMistOpacity/,
      /homeVisualTokens\.bubbleInnerColorRimOpacity/,
      /homeVisualTokens\.bubbleSurfaceElevation/,
    ],
    excludes: [
      /sans-serif-medium/,
      /androidGradient/,
      /Platform\.OS === 'android' \? 0\.[0-9]+ : 0\.[0-9]+/,
    ],
  });
});

test('reminder bubble delete motion reads as a visible pop burst', () => {
  assertSourceContract(source, {
    includes: [
      /export const REMINDER_BUBBLE_BURST_MS = 320;/,
      /const burstParticleTravel = Math\.max\(visualSize \* 0\.42, 34\);/,
      /const bubbleSurfaceAnimatedStyle = useAnimatedStyle\(\(\) => \{/,
      /const popSnap =\s*burstProgress\.value < 0\.35/,
      /opacity: entryProgress\.value,/,
      /styles\.bubbleSurface[\s\S]*bubbleSurfaceAnimatedStyle/,
      /styles\.burstFlash/,
      /styles\.burstCrack/,
      /styles\.burstParticleFive/,
    ],
    excludes: [/opacity: entryProgress\.value \* \(1 - burstProgress\.value\)/],
  });
});
