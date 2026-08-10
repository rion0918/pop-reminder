import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './prepareRaiseToSpeak.ts');

test('right-tilt voice setup requires motion and on-device speech but not proximity', () => {
  assertSourceIncludes(source, [
    /DeviceMotion\.isAvailableAsync\(\)/,
    /DeviceMotion\.requestPermissionsAsync\(\)/,
    /voiceInputService\.getAvailability\(\)/,
    /voiceInputService\.requestMicrophonePermission\(\)/,
  ]);
  assert.doesNotMatch(source, /Proximity|proximity/);
});
