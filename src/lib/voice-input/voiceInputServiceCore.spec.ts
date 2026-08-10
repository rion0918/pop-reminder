import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createVoiceInputService,
  type NativeSpeechRecognitionModule,
} from './voiceInputServiceCore';

function makeModule(overrides: Partial<NativeSpeechRecognitionModule> = {}) {
  const starts: Record<string, unknown>[] = [];
  const calls = { requestMicrophone: 0, downloadModel: 0, stop: 0, abort: 0 };
  const listeners = new Map<string, (event: unknown) => void>();
  const module: NativeSpeechRecognitionModule = {
    isRecognitionAvailable: () => true,
    supportsOnDeviceRecognition: () => true,
    getMicrophonePermissionsAsync: async () => ({
      granted: true,
      status: 'granted',
      canAskAgain: true,
      expires: 'never',
    }),
    requestMicrophonePermissionsAsync: async () => {
      calls.requestMicrophone += 1;
      return { granted: true, status: 'granted', canAskAgain: true, expires: 'never' };
    },
    getSupportedLocales: async () => ({ locales: ['ja-JP'], installedLocales: ['ja-JP'] }),
    androidTriggerOfflineModelDownload: async () => {
      calls.downloadModel += 1;
      return { status: 'download_success', message: 'downloaded' };
    },
    start: (options) => starts.push(options as Record<string, unknown>),
    stop: () => {
      calls.stop += 1;
    },
    abort: () => {
      calls.abort += 1;
    },
    addListener: (eventName, listener) => {
      listeners.set(eventName, listener);
      return { remove: () => listeners.delete(eventName) };
    },
    ...overrides,
  };

  return {
    module,
    starts,
    calls,
    emit(eventName: string, event: unknown = {}) {
      listeners.get(eventName)?.(event);
    },
  };
}

test('voice input starts Japanese recognition on-device without persisting audio', () => {
  const fake = makeModule();
  const service = createVoiceInputService(fake.module, { os: 'ios', apiLevel: 18 });

  service.start();

  assert.deepEqual(fake.starts, [
    {
      lang: 'ja-JP',
      interimResults: true,
      maxAlternatives: 1,
      continuous: true,
      requiresOnDeviceRecognition: true,
      recordingOptions: { persist: false },
      volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
      iosTaskHint: 'search',
    },
  ]);
});

test('availability distinguishes permission, model, and unsupported states', async () => {
  const permissionRequired = makeModule({
    getMicrophonePermissionsAsync: async () => ({
      granted: false,
      status: 'undetermined',
      canAskAgain: true,
      expires: 'never',
    }),
  });
  assert.deepEqual(
    await createVoiceInputService(permissionRequired.module, {
      os: 'ios',
      apiLevel: 18,
    }).getAvailability(),
    { status: 'permission-required', canAskAgain: true },
  );

  const denied = makeModule({
    getMicrophonePermissionsAsync: async () => ({
      granted: false,
      status: 'denied',
      canAskAgain: false,
      expires: 'never',
    }),
  });
  assert.deepEqual(
    await createVoiceInputService(denied.module, { os: 'ios', apiLevel: 18 }).getAvailability(),
    { status: 'permission-denied', canAskAgain: false },
  );

  const missingModel = makeModule({
    getSupportedLocales: async () => ({ locales: ['ja-JP'], installedLocales: [] }),
  });
  assert.deepEqual(
    await createVoiceInputService(missingModel.module, {
      os: 'android',
      apiLevel: 34,
    }).getAvailability(),
    { status: 'model-download-required', canAskAgain: true },
  );

  const unsupported = makeModule({ supportsOnDeviceRecognition: () => false });
  assert.deepEqual(
    await createVoiceInputService(unsupported.module, {
      os: 'android',
      apiLevel: 34,
    }).getAvailability(),
    { status: 'unsupported', canAskAgain: false },
  );
});

test('older Android uses the platform recognizer without forcing the Android 13 service', () => {
  const fake = makeModule();
  const service = createVoiceInputService(fake.module, { os: 'android', apiLevel: 32 });

  service.start();

  assert.equal(fake.starts[0].continuous, false);
  assert.equal('androidRecognitionServicePackage' in fake.starts[0], false);
  assert.equal(fake.starts[0].requiresOnDeviceRecognition, true);
  assert.deepEqual(fake.starts[0].recordingOptions, { persist: false });
});

test('Android 13 avoids segmented continuous recording so stop can finish reliably', () => {
  const fake = makeModule();
  const service = createVoiceInputService(fake.module, { os: 'android', apiLevel: 33 });

  service.start();

  assert.equal(fake.starts[0].continuous, false);
  assert.equal(fake.starts[0].androidRecognitionServicePackage, 'com.google.android.as');
  assert.deepEqual(fake.starts[0].recordingOptions, { persist: false });
});

test('voice input normalizes no-match, interruption, result, and lifecycle events', () => {
  const fake = makeModule();
  const service = createVoiceInputService(fake.module, { os: 'ios', apiLevel: 18 });
  const events: unknown[] = [];
  const subscription = service.subscribe((event) => events.push(event));

  fake.emit('start');
  fake.emit('result', { results: [{ transcript: '買い物' }], isFinal: false });
  fake.emit('nomatch');
  fake.emit('error', { error: 'interrupted', message: 'phone call' });
  fake.emit('end');

  assert.deepEqual(events, [
    { type: 'start' },
    { type: 'result', transcript: '買い物', isFinal: false },
    { type: 'nomatch' },
    { type: 'error', error: 'interrupted', message: 'phone call' },
    { type: 'end' },
  ]);

  subscription.remove();
  fake.emit('start');
  assert.equal(events.length, 5);
});

test('preparation requests only microphone permission and exposes Android model download', async () => {
  const fake = makeModule();
  const service = createVoiceInputService(fake.module, { os: 'android', apiLevel: 34 });

  await service.requestMicrophonePermission();
  await service.downloadJapaneseModel();
  service.stop();
  service.abort();

  assert.deepEqual(fake.calls, {
    requestMicrophone: 1,
    downloadModel: 1,
    stop: 1,
    abort: 1,
  });
});
