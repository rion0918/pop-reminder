import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionOptions,
  ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';

import type {
  VoiceInputError,
  VoiceInputEvent,
  VoiceInputPermissionResponse,
  VoiceInputService,
} from './voiceInputTypes';

export const VOICE_INPUT_LOCALE = 'ja-JP';
type Subscription = { remove(): void };
type VoiceNativeEventName = 'start' | 'end' | 'result' | 'error' | 'nomatch' | 'volumechange';

export type NativeSpeechRecognitionModule = {
  isRecognitionAvailable(): boolean;
  supportsOnDeviceRecognition(): boolean;
  getMicrophonePermissionsAsync(): Promise<VoiceInputPermissionResponse>;
  requestMicrophonePermissionsAsync(): Promise<VoiceInputPermissionResponse>;
  start(options: ExpoSpeechRecognitionOptions): void;
  stop(): void;
  abort(): void;
  addListener(eventName: VoiceNativeEventName, listener: (event: unknown) => void): Subscription;
};

type PlatformInfo = {
  os: 'ios' | 'android' | 'web' | 'windows' | 'macos';
  apiLevel: number;
};

function normalizeSpeechRecognitionError(error: string): VoiceInputError {
  if (error === 'not-allowed' || error === 'service-not-allowed') return 'not-allowed';
  if (error === 'no-speech') return 'no-speech';
  if (error === 'aborted') return 'aborted';
  if (error === 'interrupted' || error === 'audio-capture') return 'interrupted';
  if (error === 'language-not-supported' || error === 'language-unavailable') {
    return 'model-unavailable';
  }
  return 'unknown';
}

export function createVoiceInputService(
  speechRecognition: NativeSpeechRecognitionModule,
  platform: PlatformInfo,
) {
  const service: VoiceInputService = {
    async getAvailability() {
      if (
        !speechRecognition.isRecognitionAvailable() ||
        !speechRecognition.supportsOnDeviceRecognition()
      ) {
        return { status: 'unsupported', canAskAgain: false };
      }

      const permission = await speechRecognition.getMicrophonePermissionsAsync();
      if (!permission.granted) {
        if (permission.canAskAgain) {
          return { status: 'permission-required', canAskAgain: true };
        }
        return { status: 'permission-denied', canAskAgain: false };
      }

      return { status: 'ready', canAskAgain: true };
    },

    requestMicrophonePermission() {
      return speechRecognition.requestMicrophonePermissionsAsync();
    },

    async start() {
      const options: ExpoSpeechRecognitionOptions = {
        lang: VOICE_INPUT_LOCALE,
        interimResults: true,
        maxAlternatives: 1,
        continuous: true,
        requiresOnDeviceRecognition: true,
        recordingOptions: { persist: false },
        volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
        ...(platform.os === 'ios' ? { iosTaskHint: 'search' as const } : {}),
      };
      speechRecognition.start(options);
    },

    stop() {
      speechRecognition.stop();
    },

    abort() {
      speechRecognition.abort();
    },

    subscribe(listener: (event: VoiceInputEvent) => void) {
      const subscriptions = [
        speechRecognition.addListener('start', () => listener({ type: 'start' })),
        speechRecognition.addListener('end', () => listener({ type: 'end' })),
        speechRecognition.addListener('nomatch', () => listener({ type: 'nomatch' })),
        speechRecognition.addListener('result', (event) => {
          const result = event as ExpoSpeechRecognitionResultEvent;
          listener({
            type: 'result',
            transcript: result.results[0]?.transcript ?? '',
            isFinal: result.isFinal,
          });
        }),
        speechRecognition.addListener('error', (event) => {
          const error = event as ExpoSpeechRecognitionErrorEvent;
          listener({
            type: 'error',
            error: normalizeSpeechRecognitionError(error.error),
            message: error.message,
          });
        }),
        speechRecognition.addListener('volumechange', (event) => {
          listener({ type: 'volume', value: (event as { value: number }).value });
        }),
      ];

      return {
        remove() {
          for (const subscription of subscriptions) subscription.remove();
        },
      };
    },
  };

  return service;
}

export type { VoiceInputEvent, VoiceInputService } from './voiceInputTypes';
