import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './ReminderBubbleBoard.tsx');

test('bubble board uses shared readable size buckets for reminder titles', () => {
  assertSourceIncludes(source, [
    /getReminderBubbleDimensions/,
    /selectVisibleReminders/,
    /onVisibleReminderIdsChange\?: \(ids: string\[\]\) => void;/,
  ]);
});

test('bubble board lays out long titles with wide bubble dimensions', () => {
  assertSourceIncludes(source, [
    /type BubbleDimensions = \{/,
    /width: number;\n {2}height: number;\n {2}collisionSize: number;/,
    /function getBubbleDimensions\(/,
    /getReminderBubbleDimensions\(/,
    /width: dimensions\.width,/,
    /height: dimensions\.height,/,
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

test('bubble board freezes the calculated layout and springs positions after release', () => {
  assertSourceIncludes(source, [
    /const calculatedBoardLayout = useMemo\(/,
    /const frozenBoardLayoutRef = useRef<SelectedBoardLayout>\(calculatedBoardLayout\);/,
    /const boardLayout =\s*freezeLayout && hasCommittedBoardLayoutRef\.current\s*\?\s*frozenBoardLayoutRef\.current\s*:\s*calculatedBoardLayout;/,
    /function useBubblePositionStyle\(left: number, top: number\)/,
    /const REMINDER_BUBBLE_LAYOUT_SPRING = \{\n {2}damping: 28,\n {2}stiffness: 240,\n {2}mass: 0\.8,\n {2}overshootClamping: true,\n\} as const;/,
    /positionLeft\.value = withSpring\(left, REMINDER_BUBBLE_LAYOUT_SPRING\);/,
    /positionTop\.value = withSpring\(top, REMINDER_BUBBLE_LAYOUT_SPRING\);/,
    /if \(reduceMotion\) \{[\s\S]*positionLeft\.value = left;[\s\S]*positionTop\.value = top;/,
    /<PositionedReminderBubble/,
    /<OverflowBubble[\s\S]*left=\{overflowBubble\.left\}[\s\S]*top=\{overflowBubble\.top\}/,
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
    /deleteMotions\?: readonly BubbleDeleteMotion\[];/,
    /onReminderLongPress\?: \(reminder: Reminder\) => void;/,
    /const isMultiSelected = selectedReminderIds\?\.has\(reminder\.id\) \?\? false;/,
    /const activeDeleteMotion =\s*deleteMotions\?\.find/,
    /isMultiSelected=\{isMultiSelected\}/,
    /selectionMode=\{selectionMode\}/,
    /deleteMotionDelayMs=\{activeDeleteMotion\?\.delayMs\}/,
    /deleteMotionHapticsEnabled=\{activeDeleteMotion\?\.hapticsEnabled\}/,
    /onLongPress=\{onReminderLongPress\}/,
    /interactionDisabled=\{interactionDisabled\}/,
    /disabled=\{Boolean\(selectionMode\) \|\| !onOverflowPress\}/,
  ]);
});
