import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './ReminderBubbleBoard.tsx');

test('bubble board gives extra size to long reminder titles', () => {
  assertSourceIncludes(source, [
    /if \(visualLength >= 32\) \{/,
    /return 1\.64;/,
    /if \(visualLength >= 24\) \{/,
    /return 1\.52;/,
    /if \(visualLength >= 32\) \{\n {4}return bucketMin \+ \(visibleCount >= 8 \? 26 : 34\);/,
  ]);
});

test('bubble board lays out long titles with wide bubble dimensions', () => {
  assertSourceIncludes(source, [
    /type BubbleDimensions = \{/,
    /width: number;\n {2}height: number;\n {2}collisionSize: number;/,
    /function getBubbleDimensions\(\s*reminder: Reminder,\s*boardSize: BoardSize,\s*visibleCount: number,\s*\): BubbleDimensions/,
    /const aspectRatio = titleVisualLength >= 32 \? 1\.72 : titleVisualLength >= 24 \? 1\.56 : 1;/,
    /return \{\n {4}width,\n {4}height,\n {4}collisionSize: Math\.max\(width, height\),\n {2}\};/,
    /width: cachedLayout\.width,/,
    /height: cachedLayout\.height,/,
    /<ReminderBubble[\s\S]*key=\{reminder\.id\}[\s\S]*reminder=\{reminder\}[\s\S]*index=\{visualIndex\}[\s\S]*size=\{size\}[\s\S]*width=\{width\}[\s\S]*height=\{height\}/,
  ]);
});

test('bubble board freezes only same-mode measurements while an overlay is open', () => {
  assertSourceIncludes(source, [
    /freezeLayout\?: boolean;/,
    /freezeLayout,/,
    /lastMeasuredContentModeRef/,
    /contentModeChanged/,
    /resolveBoardSizeMeasurement/,
  ]);
});

test('overflow bubble matches the immediate spring press response of reminder bubbles', () => {
  assertSourceIncludes(source, [
    /const pressProgress = useSharedValue\(0\);/,
    /reduceMotion\s*\? 1\s*:\s*withSpring\(1, REMINDER_BUBBLE_PRESS_SPRING\)/,
    /reduceMotion\s*\? 0\s*:\s*withSpring\(0, REMINDER_BUBBLE_PRESS_SPRING\)/,
    /accessibilityState=\{\{ disabled \}\}/,
    /accessibilityHint="一覧を開きます"/,
    /onPressIn=\{handlePressIn\}/,
    /onPressOut=\{handlePressOut\}/,
    /REMINDER_BUBBLE_PRESS_SCALE/,
  ]);
});

test('bubble board forwards home selection state and keeps overflow outside selection', () => {
  assertSourceIncludes(source, [
    /selectedReminderIds\?: ReadonlySet<string>;/,
    /selectionMode\?: boolean;/,
    /interactionDisabled\?: boolean;/,
    /onReminderLongPress\?: \(reminder: Reminder\) => void;/,
    /const isMultiSelected = selectedReminderIds\?\.has\(reminder\.id\) \?\? false;/,
    /isMultiSelected=\{isMultiSelected\}/,
    /selectionMode=\{selectionMode\}/,
    /onLongPress=\{onReminderLongPress\}/,
    /interactionDisabled=\{interactionDisabled\}/,
    /disabled=\{Boolean\(selectionMode\) \|\| !onOverflowPress\}/,
  ]);
});
