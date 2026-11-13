import assert from 'node:assert/strict';
import { test } from 'node:test';

import { REMINDER_CONTEXTUAL_STRINGS } from './orcaSpeechPipeline';
import {
  createVoiceInputService,
  type NativeSpeechRecognitionModule,
} from './voiceInputServiceCore';

function makeModule(overrides: Partial<NativeSpeechRecognitionModule> = {}) {
  const starts: Record<string, unknown>[] = [];
  const calls = { requestCombined: 0, requestMicrophone: 0, stop: 0, abort: 0 };
  const listeners = new Map<string, (event: unknown) => void>();
  const module: NativeSpeechRecognitionModule = {
    isRecognitionAvailable: () => true,
    supportsOnDeviceRecognition: () => true,
    getPermissionsAsync: async () => ({
      granted: true,
      status: 'granted',
      canAskAgain: true,
      expires: 'never',
    }),
    requestPermissionsAsync: async () => {
      calls.requestCombined += 1;
      return { granted: true, status: 'granted', canAskAgain: true, expires: 'never' };
    },
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

test('iOS voice input starts Japanese hybrid dictation recognition with contextual biasing without persisting audio', async () => {
  const fake = makeModule();
  const service = createVoiceInputService(fake.module, { os: 'ios', apiLevel: 18 });

  await service.start();

  assert.deepEqual(fake.starts, [
    {
      lang: 'ja-JP',
      interimResults: true,
      maxAlternatives: 1,
      continuous: true,
      requiresOnDeviceRecognition: false,
      addsPunctuation: true,
      contextualStrings: [...REMINDER_CONTEXTUAL_STRINGS],
      recordingOptions: { persist: false },
      volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
      iosTaskHint: 'dictation',
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
    requiresOnDeviceRecognition: false,
    addsPunctuation: true,
    contextualStrings: [...REMINDER_CONTEXTUAL_STRINGS],
    recordingOptions: { persist: false },
    volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
  });
});

test('iOS availability distinguishes permission and unsupported states', async () => {
  const permissionRequired = makeModule({
    getPermissionsAsync: async () => ({
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
    getPermissionsAsync: async () => ({
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

  const noRecognition = makeModule({ isRecognitionAvailable: () => false });
  assert.deepEqual(
    await createVoiceInputService(noRecognition.module, {
      os: 'ios',
      apiLevel: 18,
    }).getAvailability(),
    { status: 'unsupported', canAskAgain: false },
  );

  const hybridWhenOnDeviceUnsupported = makeModule({ supportsOnDeviceRecognition: () => false });
  assert.deepEqual(
    await createVoiceInputService(hybridWhenOnDeviceUnsupported.module, {
      os: 'ios',
      apiLevel: 18,
    }).getAvailability(),
    { status: 'ready', canAskAgain: true },
  );

  assert.deepEqual(
    await createVoiceInputService(
      hybridWhenOnDeviceUnsupported.module,
      { os: 'ios', apiLevel: 18 },
      { requiresOnDeviceRecognition: true },
    ).getAvailability(),
    { status: 'unsupported', canAskAgain: false },
  );
});

test('iOS voice input normalizes results, cleans Japanese fillers, and handles lifecycle events', () => {
  const fake = makeModule();
  const service = createVoiceInputService(fake.module, { os: 'ios', apiLevel: 18 });
  const events: unknown[] = [];
  const subscription = service.subscribe((event) => events.push(event));

  fake.emit('start');
  fake.emit('result', { results: [{ transcript: 'えーと、買い物' }], isFinal: false });
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

test('iOS preparation requests combined speech permission in hybrid mode and preserves stop and abort', async () => {
  const fake = makeModule();
  const service = createVoiceInputService(fake.module, { os: 'ios', apiLevel: 18 });

  await service.requestMicrophonePermission();
  service.stop();
  service.abort();

  assert.deepEqual(fake.calls, {
    requestCombined: 1,
    requestMicrophone: 0,
    stop: 1,
    abort: 1,
  });

  const onDeviceService = createVoiceInputService(
    fake.module,
    { os: 'ios', apiLevel: 18 },
    { requiresOnDeviceRecognition: true },
  );
  await onDeviceService.requestMicrophonePermission();
  assert.equal(fake.calls.requestMicrophone, 1);
});
