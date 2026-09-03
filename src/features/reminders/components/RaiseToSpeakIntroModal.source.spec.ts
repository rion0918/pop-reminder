import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './RaiseToSpeakIntroModal.tsx');

test('intro explains that returning the phone upright ends voice input', () => {
  assertSourceIncludes(source, [
    /let body = 'スマホを左右どちらかへ傾けると音声入力を開始し、縦に戻すと終了します。';/,
  ]);
});

test('raise-to-speak calibration can be cancelled from the intro modal', () => {
  assertSourceIncludes(source, [
    /onRequestClose=\{isDismissLocked \? undefined : onDismiss\}/,
    /accessibilityLabel="左右に傾けて音声入力の設定をキャンセル"/,
    /onPress=\{onDismiss\}/,
  ]);
  assert.doesNotMatch(source, /onRequestClose=\{busy \? undefined : onDismiss\}/);
});

test('calibration distinguishes sensor startup failure from an unrecognized pose and can retry', () => {
  assertSourceIncludes(source, [
    /sensorStatus === 'unavailable'/,
    /sensorFailureReason/,
    /sensor-unavailable/,
    /subscription-error/,
    /no-valid-sample/,
    /CALIBRATION_POSE_TIMEOUT_MS = 10_000/,
    /calibrationAttempt/,
    /tiltProgress/,
    /accessibilityLiveRegion="polite"/,
    /センサーを確認しています/,
    /センサーを確認できませんでした/,
    /傾きを検出できませんでした/,
    /accessibilityLabel="傾きセンサーをもう一度試す"/,
    /onPress=\{handleRetry\}/,
  ]);
  assert.doesNotMatch(source, /SENSOR_START_TIMEOUT_MS|startupTimeoutRef|sensorStartTimedOut/);
});

test('intro modal uses a reduced-motion-aware spring tilt illustration', () => {
  assertSourceIncludes(source, [
    /from 'react-native-reanimated'/,
    /cancelAnimation/,
    /useSharedValue\(0\)/,
    /withSequence\(/,
    /RaiseToSpeakCalibrationPhase =\s*'intro' \| 'preparing'/,
    /TILT_PHONE_ROTATION_DEGREES = 9/,
    /withSpring\(-TILT_PHONE_ROTATION_DEGREES, TILT_PHONE_SPRING\)/,
    /reduceMotionEnabled\s*\?\s*0\s*:\s*withSequence/,
    /active=\{visible && setupPhase === 'intro'\}/,
    /accessible\n\s*accessibilityRole="image"/,
    /accessibilityLabel="スマートフォンが左右に傾く動き"/,
  ]);
});

test('calibration progress is applied before an inactive illustration is reset', () => {
  const progressBranch = source.indexOf('if (tiltProgress !== null)');
  const inactiveBranch = source.indexOf('if (!active)');

  assert.ok(progressBranch >= 0);
  assert.ok(inactiveBranch >= 0);
  assert.ok(progressBranch < inactiveBranch);
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
    /<Text style=\{styles\.primaryLabel\}>\{busy \? '確認中…' : '動きを試す'\}<\/Text>/,
  ]);
  assert.doesNotMatch(source, /<Ionicons name="[^"]+" size=\{18\} color=\{palette\.white\}/);
});
