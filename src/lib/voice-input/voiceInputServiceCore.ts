import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionOptions,
  ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';

import { REMINDER_CONTEXTUAL_STRINGS, removeJapaneseFillerWords } from './orcaSpeechPipeline';
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
  getPermissionsAsync?(): Promise<VoiceInputPermissionResponse>;
  requestPermissionsAsync?(): Promise<VoiceInputPermissionResponse>;
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

export type VoiceInputStartOptions = {
  interimResults?: boolean;
  continuous?: boolean;
  requiresOnDeviceRecognition?: boolean;
  addsPunctuation?: boolean;
  contextualStrings?: readonly string[];
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
  startOptions: VoiceInputStartOptions = {},
) {
  const requiresCombinedSpeechPermission =
    platform.os === 'ios' && !(startOptions.requiresOnDeviceRecognition ?? false);

  const service: VoiceInputService = {
    async getAvailability() {
      if (
        !speechRecognition.isRecognitionAvailable() ||
        (Boolean(startOptions.requiresOnDeviceRecognition) &&
          !speechRecognition.supportsOnDeviceRecognition())
      ) {
        return { status: 'unsupported', canAskAgain: false };
      }

      const permission = await (requiresCombinedSpeechPermission &&
      speechRecognition.getPermissionsAsync
        ? speechRecognition.getPermissionsAsync()
        : speechRecognition.getMicrophonePermissionsAsync());
      if (!permission.granted) {
        if (permission.canAskAgain) {
          return { status: 'permission-required', canAskAgain: true };
        }
        return { status: 'permission-denied', canAskAgain: false };
      }

      return { status: 'ready', canAskAgain: true };
    },

    requestMicrophonePermission() {
      if (requiresCombinedSpeechPermission && speechRecognition.requestPermissionsAsync) {
        return speechRecognition.requestPermissionsAsync();
      }
      return speechRecognition.requestMicrophonePermissionsAsync();
    },

    async start() {
      const options: ExpoSpeechRecognitionOptions = {
        lang: VOICE_INPUT_LOCALE,
        interimResults: startOptions.interimResults ?? true,
        maxAlternatives: 1,
        continuous: startOptions.continuous ?? true,
        requiresOnDeviceRecognition: startOptions.requiresOnDeviceRecognition ?? false,
        addsPunctuation: startOptions.addsPunctuation ?? true,
        contextualStrings: [...(startOptions.contextualStrings ?? REMINDER_CONTEXTUAL_STRINGS)],
        recordingOptions: { persist: false },
        volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
        ...(platform.os === 'ios' ? { iosTaskHint: 'dictation' as const } : {}),
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
          const rawTranscript = result.results[0]?.transcript ?? '';
          listener({
            type: 'result',
            transcript: removeJapaneseFillerWords(rawTranscript),
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
