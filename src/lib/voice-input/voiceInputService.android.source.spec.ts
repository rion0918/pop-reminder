import { test } from 'node:test';

import { assertSourceContract, readSource } from '../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './voiceInputService.android.ts');

test('Android voice input uses on-device recognition with a local Moonshine fallback', () => {
  assertSourceContract(source, {
    includes: [
      /androidVoiceInputServiceCore/,
      /androidOnDeviceVoiceInputServiceCore/,
      /moonshineVoiceInputServiceCore/,
      /requireOptionalNativeModule<AndroidOnDeviceSpeechRecognitionModule>/,
      /PermissionsAndroid\.check\(recordAudioPermission\)/,
      /PermissionsAndroid\.request\(recordAudioPermission\)/,
      /PermissionsAndroid\.RESULTS\.NEVER_ASK_AGAIN/,
      /createPcmLiveStream\(\{ sampleRate: SAMPLE_RATE, channelCount: 1 \}\)/,
      /getMoonshineModelAssetPaths\(MOONSHINE_MODEL_PATH\)/,
      /bindings\.resolveModelPath\(\{ type: 'asset', path: assetPath \}\)/,
      /modelPath: \{ type: 'asset', path: MOONSHINE_MODEL_PATH \}/,
      /const RECORDING_MAX_DURATION_MS = 8_000/,
      /primaryVoiceInputService/,
      /providerOverride/,
      /setAndroidVoiceInputEngineForTesting/,
      /AppState\.addEventListener\('change'/,
      /releaseForBackground\(\)/,
    ],
    excludes: [/react-native-vosk/, /Vosk/, /model-ja-jp/],
  });
});

test('Android startup defers Sherpa loading until the Moonshine fallback is used', () => {
  assertSourceContract(source, {
    includes: [
      /function loadSherpaOnnxBindings\(\)/,
      /require\('react-native-sherpa-onnx\/audio'\)/,
      /require\('react-native-sherpa-onnx\/stt'\)/,
      /require\('react-native-sherpa-onnx'\)\.resolveModelPath/,
    ],
    excludes: [
      /import \{ createPcmLiveStream \} from 'react-native-sherpa-onnx\/audio';/,
      /import \{ createSTT \} from 'react-native-sherpa-onnx\/stt';/,
    ],
  });
});
