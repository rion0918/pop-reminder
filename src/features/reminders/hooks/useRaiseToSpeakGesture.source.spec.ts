import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './useRaiseToSpeakGesture.ts');

test('raise-to-speak sensors run only on the focused foreground home screen and reset on exit', () => {
  assertSourceIncludes(source, [
    /from 'expo-sensors\/build\/DeviceMotion'/,
    /useFocusEffect\(/,
    /AppState\.addEventListener\('change', setAppState\)/,
    /enabled && !blocked && isFocused && appState === 'active'/,
    /DeviceMotion\.setUpdateInterval\(RAISE_TO_SPEAK_UPDATE_INTERVAL_MS\)/,
    /DeviceMotion\.addListener/,
    /rightTilted: isRightTiltedVoicePose\(gravity\)/,
    /if \(detectorRef\.current\.phase === 'listening'\) onStopRef\.current\(\);/,
    /detectorRef\.current = createRaiseToSpeakDetectorState\(\);/,
    /motionSubscription\.remove\(\);/,
  ]);
  assert.doesNotMatch(source, /Proximity|proximity|nearRef/);
});
