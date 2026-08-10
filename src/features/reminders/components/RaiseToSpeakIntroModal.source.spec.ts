import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './RaiseToSpeakIntroModal.tsx');

test('raise-to-speak calibration can be cancelled from the intro modal', () => {
  assertSourceIncludes(source, [
    /onRequestClose=\{busy \? undefined : onDismiss\}/,
    /accessibilityLabel="左右に傾けて音声入力の設定をキャンセル"/,
    /onPress=\{onDismiss\}/,
  ]);
  assert.doesNotMatch(source, /onRequestClose=\{busy \|\| calibrating \? undefined : onDismiss\}/);
});

test('intro modal uses a reduced-motion-aware spring tilt illustration', () => {
  assertSourceIncludes(source, [
    /from 'react-native-reanimated'/,
    /cancelAnimation/,
    /useSharedValue\(0\)/,
    /withRepeat\(/,
    /withSequence\(/,
    /TILT_PHONE_ROTATION_DEGREES = 9/,
    /withSpring\(-TILT_PHONE_ROTATION_DEGREES, TILT_PHONE_SPRING\)/,
    /reduceMotionEnabled\s*\?\s*0\s*:\s*withRepeat/,
    /accessible\n\s*accessibilityRole="image"/,
    /accessibilityLabel="スマートフォンが左右に傾く動き"/,
  ]);
});

test('intro actions use a side-by-side choice layout', () => {
  assertSourceIncludes(source, [
    /actions:\s*\{[\s\S]*?flexDirection: 'row'/,
    /choiceButton:\s*\{[\s\S]*?flex: 1/,
    /styles\.choiceButton,[\s\S]*?styles\.secondaryButton/,
    /styles\.choiceButton,[\s\S]*?styles\.primaryButton/,
  ]);
});

test('privacy guidance sits below the actions in a compact treatment', () => {
  assertSourceIncludes(source, [
    /styles\.actions[\s\S]*?styles\.privacyRow/,
    /privacyRow:\s*\{[\s\S]*?minHeight: 28/,
    /privacyText:\s*\{[\s\S]*?fontSize: 10/,
  ]);
});

test('enable action stays text-only', () => {
  assertSourceIncludes(source, [
    /accessibilityLabel="左右に傾けて音声入力を使ってみる"/,
    /<Text style=\{styles\.primaryLabel\}>\{busy \? '確認中…' : '使ってみる'\}<\/Text>/,
  ]);
  assert.doesNotMatch(source, /<Ionicons name="[^"]+" size=\{18\} color=\{palette\.white\}/);
});
