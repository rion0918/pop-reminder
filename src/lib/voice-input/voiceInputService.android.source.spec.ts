import { test } from 'node:test';

import { assertSourceContract, readSource } from '../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './voiceInputService.android.ts');

test('Android voice input uses Vosk, explicit microphone permission, and foreground lifecycle', () => {
  assertSourceContract(source, {
    includes: [
      /from 'react-native-vosk'/,
      /PermissionsAndroid\.check\(recordAudioPermission\)/,
      /PermissionsAndroid\.request\(recordAudioPermission\)/,
      /PermissionsAndroid\.RESULTS\.NEVER_ASK_AGAIN/,
      /modelName: MODEL_NAME/,
      /timeoutMs: RECOGNITION_TIMEOUT_MS/,
      /AppState\.addEventListener\('change'/,
      /releaseForBackground\(\)/,
    ],
    excludes: [/expo-speech-recognition/, /RecognitionService/, /google\.android/],
  });
});
