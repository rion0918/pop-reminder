import { AppState, PermissionsAndroid, Platform } from 'react-native';
import * as Vosk from 'react-native-vosk';

import { createVoskVoiceInputService, type VoskNativeModule } from './voskVoiceInputServiceCore';
import type { VoiceInputPermissionResponse, VoiceInputService } from './voiceInputTypes';

const MODEL_NAME = 'model-ja-jp';
const RECOGNITION_TIMEOUT_MS = 30_000;
const recordAudioPermission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
let canAskForMicrophonePermissionAgain = true;

const voskModule: VoskNativeModule = {
  loadModel: Vosk.loadModel,
  start: Vosk.start,
  stop: Vosk.stop,
  unload: Vosk.unload,
  onPartialResult: Vosk.onPartialResult,
  onResult: Vosk.onResult,
  onFinalResult: Vosk.onFinalResult,
  onError: Vosk.onError,
  onTimeout(listener) {
    return Vosk.onTimeout(() => listener(undefined));
  },
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

const androidVoiceInputService = createVoskVoiceInputService({
  vosk: voskModule,
  permissions,
  apiLevel: Number.isFinite(platformVersion) ? platformVersion : 0,
  modelName: MODEL_NAME,
  timeoutMs: RECOGNITION_TIMEOUT_MS,
});

AppState.addEventListener('change', (nextState) => {
  if (nextState !== 'active') androidVoiceInputService.releaseForBackground();
});

export const voiceInputService: VoiceInputService = androidVoiceInputService;
