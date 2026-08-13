import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

import {
  createVoiceInputService,
  type NativeSpeechRecognitionModule,
} from './voiceInputServiceCore';
import type { VoiceInputService } from './voiceInputTypes';

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
  start() {},
  stop() {},
  abort() {},
  addListener: () => ({ remove() {} }),
};

const platformVersion =
  typeof Platform.Version === 'number' ? Platform.Version : Number.parseInt(Platform.Version, 10);

export const voiceInputService: VoiceInputService = createVoiceInputService(
  nativeSpeechRecognition,
  {
    os: 'ios',
    apiLevel: Number.isFinite(platformVersion) ? platformVersion : 0,
  },
);
