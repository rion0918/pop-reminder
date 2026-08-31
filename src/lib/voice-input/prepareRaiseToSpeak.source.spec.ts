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
    /import \{ Accelerometer, DeviceMotion \} from 'expo-sensors';/,
    /Platform\.OS === 'android'\s*\? Accelerometer\.isAvailableAsync\(\)\s*: DeviceMotion\.isAvailableAsync\(\)/,
    /if \(Platform\.OS === 'ios'\) \{[\s\S]*DeviceMotion\.requestPermissionsAsync\(\)[\s\S]*\}/,
    /voiceInputService\.getAvailability\(\)/,
    /voiceInputService\.requestMicrophonePermission\(\)/,
  ]);
  assert.doesNotMatch(source, /expo-sensors\/build\//);
  assertSourceContract(source, {
    includes: [/prepareOfflineModel/],
  });
  assert.doesNotMatch(source, /Proximity|proximity/);
});
