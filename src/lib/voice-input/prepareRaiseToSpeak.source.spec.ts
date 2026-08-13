import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './prepareRaiseToSpeak.ts');

test('side-tilt voice setup uses the Android accelerometer and requests motion permission only on iOS', () => {
  assertSourceIncludes(source, [
    /import \{ Platform \} from 'react-native';/,
    /import Accelerometer from 'expo-sensors\/build\/Accelerometer';/,
    /Platform\.OS === 'android'\s*\? Accelerometer\.isAvailableAsync\(\)\s*: DeviceMotion\.isAvailableAsync\(\)/,
    /if \(Platform\.OS === 'ios'\) \{[\s\S]*DeviceMotion\.requestPermissionsAsync\(\)[\s\S]*\}/,
    /voiceInputService\.getAvailability\(\)/,
    /voiceInputService\.requestMicrophonePermission\(\)/,
  ]);
  assertSourceContract(source, {
    excludes: [/downloadJapaneseModel/, /model-download-required/, /model-download-started/],
  });
  assert.doesNotMatch(source, /Proximity|proximity/);
});
