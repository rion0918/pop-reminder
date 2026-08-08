import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './ReminderBubble.tsx');

test('reminder bubbles support accessible multi-selection and suppress tap after long press', () => {
  assertSourceIncludes(source, [
    /selectionMode\?: boolean;/,
    /isMultiSelected\?: boolean;/,
    /interactionDisabled\?: boolean;/,
    /const longPressTriggeredRef = useRef\(false\);/,
    /onLongPress=\{\(\) => \{[\s\S]*longPressTriggeredRef\.current = true;[\s\S]*onLongPress\(reminder\);/,
    /if \(longPressTriggeredRef\.current\) \{[\s\S]*longPressTriggeredRef\.current = false;[\s\S]*return;/,
    /if \(!selectionMode\) \{\s*longPressTriggeredRef\.current = false;/,
    /accessibilityRole=\{selectionMode \? 'checkbox' : 'button'\}/,
    /accessibilityState=\{\s*selectionMode\s*\? \{ selected: isMultiSelected, disabled: isDisabled \}\s*:/,
    /styles\.selectionHighlight/,
    /const selectionProgress = useSharedValue\(0\);/,
    /withSpring\(isMultiSelected \? 1 : 0, REMINDER_BUBBLE_SELECTION_SPRING\)/,
    /selectionMode && !deleteMotionPhase \? \(/,
    /styles\.selectionIndicator/,
    /name="checkmark"/,
    /disabled=\{isDisabled\}/,
  ]);
});
