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
    /accessibilityRole=\{selectionMode \? 'checkbox' : 'button'\}/,
    /accessibilityState=\{\s*selectionMode\s*\? \{ selected: isMultiSelected, disabled: isDisabled \}\s*:/,
    /styles\.selectionHighlight/,
    /disabled=\{isDisabled\}/,
  ]);
});
