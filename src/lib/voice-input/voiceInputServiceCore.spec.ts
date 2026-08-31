import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createVoiceInputService,
  type NativeSpeechRecognitionModule,
} from './voiceInputServiceCore';

function makeModule(overrides: Partial<NativeSpeechRecognitionModule> = {}) {
  const starts: Record<string, unknown>[] = [];
  const calls = { requestMicrophone: 0, stop: 0, abort: 0 };
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

test('iOS voice input starts Japanese on-device recognition without persisting audio', async () => {
  const fake = makeModule();
  const service = createVoiceInputService(fake.module, { os: 'ios', apiLevel: 18 });

  await service.start();

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

test('Android platform recognizer can be configured for final-only short utterances', async () => {
  const fake = makeModule();
  const service = createVoiceInputService(
    fake.module,
    { os: 'android', apiLevel: 35 },
    { interimResults: false, continuous: false },
  );

  await service.start();

  assert.deepEqual(fake.starts[0], {
    lang: 'ja-JP',
    interimResults: false,
    maxAlternatives: 1,
    continuous: false,
    requiresOnDeviceRecognition: true,
    recordingOptions: { persist: false },
    volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
  });
});

test('iOS availability distinguishes permission and unsupported states', async () => {
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

  const unsupported = makeModule({ supportsOnDeviceRecognition: () => false });
  assert.deepEqual(
    await createVoiceInputService(unsupported.module, {
      os: 'ios',
      apiLevel: 18,
    }).getAvailability(),
    { status: 'unsupported', canAskAgain: false },
  );
});

test('iOS voice input normalizes results, lifecycle events, and public errors', () => {
  const fake = makeModule();
  const service = createVoiceInputService(fake.module, { os: 'ios', apiLevel: 18 });
  const events: unknown[] = [];
  const subscription = service.subscribe((event) => events.push(event));

  fake.emit('start');
  fake.emit('result', { results: [{ transcript: '買い物' }], isFinal: false });
  fake.emit('nomatch');
  fake.emit('error', { error: 'language-unavailable', message: 'model missing' });
  fake.emit('end');

  assert.deepEqual(events, [
    { type: 'start' },
    { type: 'result', transcript: '買い物', isFinal: false },
    { type: 'nomatch' },
    { type: 'error', error: 'model-unavailable', message: 'model missing' },
    { type: 'end' },
  ]);

  subscription.remove();
  fake.emit('start');
  assert.equal(events.length, 5);
});

test('iOS preparation requests microphone permission and preserves stop and abort', async () => {
  const fake = makeModule();
  const service = createVoiceInputService(fake.module, { os: 'ios', apiLevel: 18 });

  await service.requestMicrophonePermission();
  service.stop();
  service.abort();

  assert.deepEqual(fake.calls, {
    requestMicrophone: 1,
    stop: 1,
    abort: 1,
  });
});
