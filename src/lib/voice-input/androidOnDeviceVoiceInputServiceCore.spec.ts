import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  type AndroidOnDeviceSpeechRecognitionModule,
  createAndroidOnDeviceVoiceInputService,
} from './androidOnDeviceVoiceInputServiceCore';
import { REMINDER_CONTEXTUAL_STRINGS } from './orcaSpeechPipeline';

function makeNative(installedLocales: string[] = ['ja-JP'], locales: string[] = ['ja-JP']) {
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
      return { locales, installedLocales };
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

test('Android OS provider supports hybrid recognition on Android 9+ and enforces installed locales only when strict on-device is requested', async () => {
  const unsupportedAndroid = makeNative();
  assert.deepEqual(
    await createAndroidOnDeviceVoiceInputService({
      native: unsupportedAndroid.native,
      apiLevel: 27,
    }).getAvailability(),
    { status: 'unsupported', canAskAgain: false },
  );

  const android12Hybrid = makeNative([]);
  assert.deepEqual(
    await createAndroidOnDeviceVoiceInputService({
      native: android12Hybrid.native,
      apiLevel: 32,
    }).getAvailability(),
    { status: 'ready', canAskAgain: true },
  );

  const missingOfflinePackHybrid = makeNative([]);
  assert.deepEqual(
    await createAndroidOnDeviceVoiceInputService({
      native: missingOfflinePackHybrid.native,
      apiLevel: 35,
    }).getAvailability(),
    { status: 'ready', canAskAgain: true },
  );

  assert.deepEqual(
    await createAndroidOnDeviceVoiceInputService({
      native: missingOfflinePackHybrid.native,
      apiLevel: 35,
      requiresOnDeviceRecognition: true,
    }).getAvailability(),
    { status: 'model-unavailable', canAskAgain: false },
  );

  const unsupportedLocale = makeNative([], ['en-US']);
  assert.deepEqual(
    await createAndroidOnDeviceVoiceInputService({
      native: unsupportedLocale.native,
      apiLevel: 35,
    }).getAvailability(),
    { status: 'unsupported', canAskAgain: false },
  );
});

test('Android OS provider can prepare a missing offline locale and starts final-only with contextual biasing', async () => {
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
    requiresOnDeviceRecognition: false,
    addsPunctuation: true,
    contextualStrings: [...REMINDER_CONTEXTUAL_STRINGS],
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
