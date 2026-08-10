import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionOptions,
  ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';

export const VOICE_INPUT_LOCALE = 'ja-JP';
const ANDROID_ON_DEVICE_SERVICE = 'com.google.android.as';

type Subscription = { remove(): void };
type PermissionResponse = {
  granted: boolean;
  status: string;
  canAskAgain: boolean;
  expires: 'never' | number;
};
type VoiceNativeEventName = 'start' | 'end' | 'result' | 'error' | 'nomatch' | 'volumechange';

export type NativeSpeechRecognitionModule = {
  isRecognitionAvailable(): boolean;
  supportsOnDeviceRecognition(): boolean;
  getMicrophonePermissionsAsync(): Promise<PermissionResponse>;
  requestMicrophonePermissionsAsync(): Promise<PermissionResponse>;
  getSupportedLocales(options: {
    androidRecognitionServicePackage?: string;
  }): Promise<{ locales: string[]; installedLocales: string[] }>;
  androidTriggerOfflineModelDownload(options: {
    locale: string;
  }): Promise<{ status: string; message: string }>;
  start(options: ExpoSpeechRecognitionOptions): void;
  stop(): void;
  abort(): void;
  addListener(eventName: VoiceNativeEventName, listener: (event: unknown) => void): Subscription;
};

export type VoiceInputAvailability =
  | { status: 'ready'; canAskAgain: true }
  | { status: 'permission-required'; canAskAgain: true }
  | { status: 'permission-denied'; canAskAgain: boolean }
  | { status: 'model-download-required'; canAskAgain: true }
  | { status: 'unsupported'; canAskAgain: false };

export type VoiceInputEvent =
  | { type: 'start' }
  | { type: 'end' }
  | { type: 'result'; transcript: string; isFinal: boolean }
  | { type: 'error'; error: ExpoSpeechRecognitionErrorEvent['error']; message: string }
  | { type: 'nomatch' }
  | { type: 'volume'; value: number };

type PlatformInfo = {
  os: 'ios' | 'android' | 'web' | 'windows' | 'macos';
  apiLevel: number;
};

function hasJapaneseLocale(locales: string[]) {
  return locales.some((locale) => locale.toLowerCase() === VOICE_INPUT_LOCALE.toLowerCase());
}

export function createVoiceInputService(
  speechRecognition: NativeSpeechRecognitionModule,
  platform: PlatformInfo,
) {
  return {
    async getAvailability(): Promise<VoiceInputAvailability> {
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

      if (platform.os === 'android' && platform.apiLevel >= 33) {
        try {
          const locales = await speechRecognition.getSupportedLocales({
            androidRecognitionServicePackage: ANDROID_ON_DEVICE_SERVICE,
          });
          if (!hasJapaneseLocale(locales.locales)) {
            return { status: 'unsupported', canAskAgain: false };
          }
          if (!hasJapaneseLocale(locales.installedLocales)) {
            return { status: 'model-download-required', canAskAgain: true };
          }
        } catch {
          return { status: 'unsupported', canAskAgain: false };
        }
      }

      return { status: 'ready', canAskAgain: true };
    },

    requestMicrophonePermission() {
      return speechRecognition.requestMicrophonePermissionsAsync();
    },

    downloadJapaneseModel() {
      return speechRecognition.androidTriggerOfflineModelDownload({ locale: VOICE_INPUT_LOCALE });
    },

    start() {
      const options: ExpoSpeechRecognitionOptions = {
        lang: VOICE_INPUT_LOCALE,
        interimResults: true,
        maxAlternatives: 1,
        continuous: platform.os !== 'android',
        requiresOnDeviceRecognition: true,
        recordingOptions: { persist: false },
        volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
        ...(platform.os === 'ios'
          ? { iosTaskHint: 'search' as const }
          : platform.os === 'android' && platform.apiLevel >= 33
            ? { androidRecognitionServicePackage: ANDROID_ON_DEVICE_SERVICE }
            : {}),
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
          listener({ type: 'error', error: error.error, message: error.message });
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
}

export type VoiceInputService = ReturnType<typeof createVoiceInputService>;
