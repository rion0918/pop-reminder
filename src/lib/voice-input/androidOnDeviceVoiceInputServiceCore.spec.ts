import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createAndroidOnDeviceVoiceInputService,
  type AndroidOnDeviceSpeechRecognitionModule,
} from './androidOnDeviceVoiceInputServiceCore';

function makeNative(installedLocales: string[] = ['ja-JP']) {
  const starts: Record<string, unknown>[] = [];
  const listeners = new Map<string, (event: unknown) => void>();
  const calls = { supportedLocales: 0, download: 0, abort: 0 };
  const native: AndroidOnDeviceSpeechRecognitionModule = {
    isRecognitionAvailable: () => true,
    supportsOnDeviceRecognition: () => true,
    getMicrophonePermissionsAsync: async () => ({
      granted: true,
      status: 'granted',
      canAskAgain: true,
      expires: 'never' as const,
    }),
    requestMicrophonePermissionsAsync: async () => ({
      granted: true,
      status: 'granted',
      canAskAgain: true,
      expires: 'never' as const,
    }),
    async getSupportedLocales() {
      calls.supportedLocales += 1;
      return { locales: ['ja-JP'], installedLocales };
    },
    async androidTriggerOfflineModelDownload() {
      calls.download += 1;
      return { status: 'download_success', message: 'ok' };
    },
    start(options) {
      starts.push(options as Record<string, unknown>);
      listeners.get('start')?.(null);
    },
    stop() {},
    abort() {
      calls.abort += 1;
    },
    addListener(eventName, listener) {
      listeners.set(eventName, listener);
      return { remove: () => listeners.delete(eventName) };
    },
  };
  return { native, starts, calls };
}

test('Android on-device provider requires Android 13 and an installed Japanese locale', async () => {
  const oldAndroid = makeNative();
  assert.deepEqual(
    await createAndroidOnDeviceVoiceInputService({
      native: oldAndroid.native,
      apiLevel: 32,
    }).getAvailability(),
    { status: 'unsupported', canAskAgain: false },
  );

  const missingLocale = makeNative([]);
  assert.deepEqual(
    await createAndroidOnDeviceVoiceInputService({
      native: missingLocale.native,
      apiLevel: 35,
    }).getAvailability(),
    { status: 'model-unavailable', canAskAgain: false },
  );
});

test('Android on-device provider can prepare a missing locale and starts final-only', async () => {
  const missing = makeNative([]);
  const missingService = createAndroidOnDeviceVoiceInputService({
    native: missing.native,
    apiLevel: 35,
  });

  await missingService.prepareOfflineModel();
  await missingService.prepareOfflineModel();
  assert.equal(missing.calls.download, 1);

  const ready = makeNative(['ja-JP']);
  const service = createAndroidOnDeviceVoiceInputService({
    native: ready.native,
    apiLevel: 35,
  });

  await service.start();
  assert.deepEqual(ready.starts[0], {
    lang: 'ja-JP',
    interimResults: false,
    maxAlternatives: 1,
    continuous: false,
    requiresOnDeviceRecognition: true,
    recordingOptions: { persist: false },
    volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
  });
});

test('Android on-device provider coalesces concurrent offline model downloads', async () => {
  const missing = makeNative([]);
  let resolveDownload: ((result: { status: string; message: string }) => void) | undefined;
  missing.native.androidTriggerOfflineModelDownload = async () => {
    missing.calls.download += 1;
    return new Promise((resolve) => {
      resolveDownload = resolve;
    });
  };
  const service = createAndroidOnDeviceVoiceInputService({
    native: missing.native,
    apiLevel: 35,
  });

  const first = service.prepareOfflineModel();
  const second = service.prepareOfflineModel();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(missing.calls.download, 1);

  resolveDownload?.({ status: 'download_success', message: 'ok' });
  await Promise.all([first, second]);
});

test('Android on-device provider accepts Android locale spellings', async () => {
  const native = makeNative(['ja_JP']);
  const service = createAndroidOnDeviceVoiceInputService({ native: native.native, apiLevel: 35 });

  assert.deepEqual(await service.getAvailability(), { status: 'ready', canAskAgain: true });
});
