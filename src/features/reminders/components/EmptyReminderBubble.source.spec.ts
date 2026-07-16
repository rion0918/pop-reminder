import { test } from 'node:test';

import { assertSourceContract, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './EmptyReminderBubble.tsx');

test('empty reminder bubble exposes the whole membrane as the add action without a center icon', () => {
  assertSourceContract(source, {
    includes: [
      /accessibilityRole="button"/,
      /accessibilityLabel="リマインダーを追加"/,
      /accessibilityHint="入力シートを開きます"/,
      /const isDisabled = disabled \|\| !onPress;/,
      /accessibilityState=\{\{ disabled: isDisabled \}\}/,
      /disabled=\{isDisabled\}/,
      /onPress=\{onPress\}/,
      /width: size/,
      /height: size/,
      /<LinearGradient/,
    ],
    excludes: [/@expo\/vector-icons/, /<Ionicons/, /<Text/, />\s*\+\s*</],
  });
});

test('empty reminder bubble floats gently and honors reduced motion', () => {
  assertSourceContract(source, {
    includes: [
      /useReducedMotion/,
      /duration: 5200/,
      /withRepeat/,
      /translateY: reduceMotion \? 0 :/,
      /\* 6 - 3/,
      /onPressIn=\{handlePressIn\}/,
      /onPressOut=\{handlePressOut\}/,
      /withTiming\(1, \{ duration: 120 \}\)/,
      /scale: 1 - pressProgress\.value \* 0\.03/,
      /opacity: 1 - pressProgress\.value \* 0\.1/,
    ],
  });
});

test('empty reminder bubble centers itself within the empty scene', () => {
  assertSourceContract(source, {
    includes: [/bubble: \{[\s\S]*?alignSelf: 'center'/],
  });
});

test('empty reminder bubble keeps its existing membrane without a ground shadow', () => {
  assertSourceContract(source, {
    includes: [/<AnimatedPressable/, /styles\.bubble/],
    excludes: [/styles\.bubbleFrame/, /styles\.groundShadow/, /rgba\(124,185,255,0\.24\)/],
  });
});
