import { requireOptionalNativeModule } from 'expo';
import { AppState, PermissionsAndroid, Platform } from 'react-native';

import { createAndroidHybridVoiceInputService } from './androidVoiceInputServiceCore';
import {
  createAndroidOnDeviceVoiceInputService,
  type AndroidOnDeviceSpeechRecognitionModule,
} from './androidOnDeviceVoiceInputServiceCore';
import {
  createMoonshineVoiceInputService,
  type MoonshineNativeModule,
} from './moonshineVoiceInputServiceCore';
import { removeIncompleteMoonshineModelCache } from './moonshineModelCache';
import type { VoiceInputPermissionResponse, VoiceInputService } from './voiceInputTypes';

const MOONSHINE_MODEL_PATH = 'models/moonshine-tiny-ja';
const SAMPLE_RATE = 16_000;
const RECORDING_MAX_DURATION_MS = 8_000;
const recordAudioPermission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
let canAskForMicrophonePermissionAgain = true;
let forcedVoiceInputEngine: 'os' | 'moonshine' | null = null;

type SherpaOnnxBindings = Pick<
  typeof import('react-native-sherpa-onnx/audio'),
  'createPcmLiveStream'
> &
  Pick<typeof import('react-native-sherpa-onnx/stt'), 'createSTT'>;

let sherpaOnnxBindings: SherpaOnnxBindings | null | undefined;

function loadSherpaOnnxBindings(): SherpaOnnxBindings | null {
  if (sherpaOnnxBindings !== undefined) return sherpaOnnxBindings;

  try {
    sherpaOnnxBindings = {
      createPcmLiveStream: require('react-native-sherpa-onnx/audio').createPcmLiveStream,
      createSTT: require('react-native-sherpa-onnx/stt').createSTT,
    };
  } catch {
    sherpaOnnxBindings = null;
  }

  return sherpaOnnxBindings;
}

const unavailablePermission: VoiceInputPermissionResponse = {
  granted: false,
  status: 'denied',
  canAskAgain: false,
  expires: 'never',
};

const optionalSpeechRecognition =
  requireOptionalNativeModule<AndroidOnDeviceSpeechRecognitionModule>('ExpoSpeechRecognition');

const nativeSpeechRecognition: AndroidOnDeviceSpeechRecognitionModule =
  optionalSpeechRecognition ?? {
    isRecognitionAvailable: () => false,
    supportsOnDeviceRecognition: () => false,
    getMicrophonePermissionsAsync: async () => unavailablePermission,
    requestMicrophonePermissionsAsync: async () => unavailablePermission,
    getSupportedLocales: async () => ({ locales: [], installedLocales: [] }),
    androidTriggerOfflineModelDownload: async () => ({
      status: 'unavailable',
      message: 'Android on-device recognition is unavailable',
    }),
    start() {},
    stop() {},
    abort() {},
    addListener: () => ({ remove() {} }),
  };

function permissionResponse(
  granted: boolean,
  status: string,
  canAskAgain: boolean,
): VoiceInputPermissionResponse {
  return { granted, status, canAskAgain, expires: 'never' };
}

const permissions = {
  async get() {
    const granted = await PermissionsAndroid.check(recordAudioPermission);
    return permissionResponse(
      granted,
      granted ? PermissionsAndroid.RESULTS.GRANTED : PermissionsAndroid.RESULTS.DENIED,
      granted || canAskForMicrophonePermissionAgain,
    );
  },
  async request() {
    const status = await PermissionsAndroid.request(recordAudioPermission);
    const granted = status === PermissionsAndroid.RESULTS.GRANTED;
    canAskForMicrophonePermissionAgain = status !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
    return permissionResponse(granted, status, granted || canAskForMicrophonePermissionAgain);
  },
};

const platformVersion =
  typeof Platform.Version === 'number' ? Platform.Version : Number.parseInt(Platform.Version, 10);
const apiLevel = Number.isFinite(platformVersion) ? platformVersion : 0;

const primaryVoiceInputService = createAndroidOnDeviceVoiceInputService({
  native: nativeSpeechRecognition,
  apiLevel,
});

const moonshineNative: MoonshineNativeModule = {
  createEngine() {
    const bindings = loadSherpaOnnxBindings();
    if (!bindings) {
      return Promise.reject(new Error('SherpaOnnx native module is unavailable'));
    }

    return removeIncompleteMoonshineModelCache().then(() =>
      bindings.createSTT({
        modelPath: { type: 'asset', path: MOONSHINE_MODEL_PATH },
        modelType: 'auto',
        debug: typeof __DEV__ !== 'undefined' && __DEV__,
        preferInt8: true,
        numThreads: 2,
      }),
    );
  },
  createPcmLiveStream() {
    const bindings = loadSherpaOnnxBindings();
    if (!bindings) {
      throw new Error('SherpaOnnx native module is unavailable');
    }

    return bindings.createPcmLiveStream({ sampleRate: SAMPLE_RATE, channelCount: 1 });
  },
};

const fallbackVoiceInputService = createMoonshineVoiceInputService({
  native: moonshineNative,
  permissions,
  apiLevel,
  sampleRate: SAMPLE_RATE,
  maxDurationMs: RECORDING_MAX_DURATION_MS,
});

const androidVoiceInputService = createAndroidHybridVoiceInputService({
  primary: primaryVoiceInputService,
  fallback: fallbackVoiceInputService,
  providerOverride: () =>
    forcedVoiceInputEngine === 'moonshine'
      ? 'fallback'
      : forcedVoiceInputEngine === 'os'
        ? 'primary'
        : null,
});

AppState.addEventListener('change', (nextState) => {
  if (nextState !== 'active') androidVoiceInputService.releaseForBackground();
});

export const voiceInputService: VoiceInputService & {
  prepareOfflineModel(): Promise<void>;
} = androidVoiceInputService;

/** Test-only engine override for development builds; product UI has no engine setting. */
export function setAndroidVoiceInputEngineForTesting(engine: 'os' | 'moonshine' | null) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) forcedVoiceInputEngine = engine;
}
