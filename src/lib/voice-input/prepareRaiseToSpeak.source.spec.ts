import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './prepareRaiseToSpeak.ts');

test('side-tilt voice setup requests motion permission only on iOS', () => {
  assertSourceIncludes(source, [
    /import \{ Platform \} from 'react-native';/,
    /DeviceMotion\.isAvailableAsync\(\)/,
    /if \(Platform\.OS === 'ios'\) \{[\s\S]*DeviceMotion\.requestPermissionsAsync\(\)[\s\S]*\}/,
    /voiceInputService\.getAvailability\(\)/,
    /voiceInputService\.requestMicrophonePermission\(\)/,
  ]);
  assert.doesNotMatch(source, /Proximity|proximity/);
});
