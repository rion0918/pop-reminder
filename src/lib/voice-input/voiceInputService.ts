import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

import {
  createVoiceInputService,
  type NativeSpeechRecognitionModule,
} from './voiceInputServiceCore';

const optionalSpeechRecognition =
  requireOptionalNativeModule<NativeSpeechRecognitionModule>('ExpoSpeechRecognition');

const unavailablePermission = {
  granted: false,
  status: 'denied' as const,
  canAskAgain: false,
  expires: 'never' as const,
};

const nativeSpeechRecognition: NativeSpeechRecognitionModule = optionalSpeechRecognition ?? {
  isRecognitionAvailable: () => false,
  supportsOnDeviceRecognition: () => false,
  getMicrophonePermissionsAsync: async () => unavailablePermission,
  requestMicrophonePermissionsAsync: async () => unavailablePermission,
  getSupportedLocales: async () => ({ locales: [], installedLocales: [] }),
  androidTriggerOfflineModelDownload: async () => ({
    status: 'download_canceled',
    message: 'Speech recognition is unavailable',
  }),
  start() {},
  stop() {},
  abort() {},
  addListener: () => ({ remove() {} }),
};

const platformVersion =
  typeof Platform.Version === 'number' ? Platform.Version : Number.parseInt(Platform.Version, 10);

export const voiceInputService = createVoiceInputService(nativeSpeechRecognition, {
  os: Platform.OS,
  apiLevel: Number.isFinite(platformVersion) ? platformVersion : 0,
});
