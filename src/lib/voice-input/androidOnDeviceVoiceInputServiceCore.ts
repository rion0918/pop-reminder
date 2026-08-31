import {
  createVoiceInputService,
  type NativeSpeechRecognitionModule,
  VOICE_INPUT_LOCALE,
} from './voiceInputServiceCore';
import type { VoiceInputAvailability, VoiceInputService } from './voiceInputTypes';

type SupportedLocales = {
  locales: string[];
  installedLocales: string[];
};

export type AndroidOnDeviceSpeechRecognitionModule = NativeSpeechRecognitionModule & {
  getSupportedLocales(options: {
    androidRecognitionServicePackage?: string;
  }): Promise<SupportedLocales>;
  androidTriggerOfflineModelDownload(options: {
    locale: string;
  }): Promise<{ status: string; message: string }>;
};

type AndroidOnDeviceVoiceInputOptions = {
  native: AndroidOnDeviceSpeechRecognitionModule;
  apiLevel: number;
  recognitionServicePackage?: string;
};

type AndroidOnDeviceVoiceInputService = VoiceInputService & {
  prepareOfflineModel(): Promise<void>;
  releaseForBackground(): void;
};

function hasLocale(locales: string[], locale: string) {
  const normalizedLocale = locale.toLowerCase().replace('_', '-');
  return locales.some((candidate) => {
    const normalizedCandidate = candidate.toLowerCase().replace('_', '-');
    return (
      normalizedCandidate === normalizedLocale ||
      normalizedCandidate === normalizedLocale.split('-')[0]
    );
  });
}

export function createAndroidOnDeviceVoiceInputService(
  options: AndroidOnDeviceVoiceInputOptions,
): AndroidOnDeviceVoiceInputService {
  const { native, apiLevel, recognitionServicePackage = 'com.google.android.as' } = options;
  const speechService = createVoiceInputService(
    native,
    { os: 'android', apiLevel },
    { interimResults: false, continuous: false },
  );
  let active = false;
  let offlineModelDownloadRequested = false;

  async function getInstalledLocales(): Promise<SupportedLocales | null> {
    if (apiLevel < 33) return null;
    try {
      return await native.getSupportedLocales({
        androidRecognitionServicePackage: recognitionServicePackage,
      });
    } catch {
      return null;
    }
  }

  async function getAvailability(): Promise<VoiceInputAvailability> {
    if (apiLevel < 33) return { status: 'unsupported', canAskAgain: false };

    const baseAvailability = await speechService.getAvailability();
    if (baseAvailability.status !== 'ready') return baseAvailability;

    const supportedLocales = await getInstalledLocales();
    if (!supportedLocales) return { status: 'unsupported', canAskAgain: false };
    if (!hasLocale(supportedLocales.locales, VOICE_INPUT_LOCALE)) {
      return { status: 'unsupported', canAskAgain: false };
    }
    if (!hasLocale(supportedLocales.installedLocales, VOICE_INPUT_LOCALE)) {
      return { status: 'model-unavailable', canAskAgain: false };
    }
    return { status: 'ready', canAskAgain: true };
  }

  const service: AndroidOnDeviceVoiceInputService = {
    ...speechService,

    getAvailability,

    async prepareOfflineModel() {
      if (
        apiLevel < 33 ||
        !native.isRecognitionAvailable() ||
        !native.supportsOnDeviceRecognition()
      ) {
        return;
      }

      if (offlineModelDownloadRequested) return;

      const supportedLocales = await getInstalledLocales();
      if (
        !supportedLocales ||
        !hasLocale(supportedLocales.locales, VOICE_INPUT_LOCALE) ||
        hasLocale(supportedLocales.installedLocales, VOICE_INPUT_LOCALE)
      ) {
        return;
      }

      offlineModelDownloadRequested = true;
      try {
        await native.androidTriggerOfflineModelDownload({ locale: VOICE_INPUT_LOCALE });
      } catch {
        // The bundled Moonshine provider remains available if the system model
        // is unavailable or the user cancels its one-time download.
      }
    },

    subscribe(listener) {
      return speechService.subscribe((event) => {
        if (event.type === 'start') active = true;
        if (event.type === 'end' || event.type === 'error') active = false;
        listener(event);
      });
    },

    releaseForBackground() {
      if (active) speechService.abort();
      active = false;
    },
  };

  return service;
}

export type { VoiceInputPermissionResponse } from './voiceInputTypes';
