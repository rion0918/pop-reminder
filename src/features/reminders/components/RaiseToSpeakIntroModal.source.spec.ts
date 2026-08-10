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
