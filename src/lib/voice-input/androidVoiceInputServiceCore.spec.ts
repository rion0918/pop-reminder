import assert from 'node:assert/strict';
import { test } from 'node:test';

import type {
  VoiceInputAvailability,
  VoiceInputEvent,
  VoiceInputPermissionResponse,
} from './voiceInputTypes';
import {
  createAndroidHybridVoiceInputService,
  type AndroidVoiceInputProvider,
} from './androidVoiceInputServiceCore';

const grantedPermission: VoiceInputPermissionResponse = {
  granted: true,
  status: 'granted',
  canAskAgain: true,
  expires: 'never',
};

function makeProvider(availability: VoiceInputAvailability, options: { startError?: Error } = {}) {
  const listeners = new Set<(event: VoiceInputEvent) => void>();
  const calls = { start: 0, stop: 0, abort: 0, release: 0, requestPermission: 0 };
  const provider: AndroidVoiceInputProvider = {
    async getAvailability() {
      return availability;
    },
    async requestMicrophonePermission() {
      calls.requestPermission += 1;
      return grantedPermission;
    },
    async start() {
      calls.start += 1;
      if (options.startError) throw options.startError;
      emit({ type: 'start' });
    },
    stop() {
      calls.stop += 1;
    },
    abort() {
      calls.abort += 1;
      emit({ type: 'error', error: 'aborted', message: 'Voice input was cancelled' });
      emit({ type: 'end' });
    },
    subscribe(listener) {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
    releaseForBackground() {
      calls.release += 1;
    },
  };

  function emit(event: VoiceInputEvent) {
    for (const listener of listeners) listener(event);
  }

  return { provider, calls, emit };
}

function makeService(primary: AndroidVoiceInputProvider, fallback: AndroidVoiceInputProvider) {
  return createAndroidHybridVoiceInputService({ primary, fallback });
}

test('Android chooses the on-device provider when it is ready', async () => {
  const primary = makeProvider({ status: 'ready', canAskAgain: true });
  const fallback = makeProvider({ status: 'ready', canAskAgain: true });
  const service = makeService(primary.provider, fallback.provider);
  const events: VoiceInputEvent[] = [];
  service.subscribe((event) => events.push(event));

  assert.deepEqual(await service.getAvailability(), { status: 'ready', canAskAgain: true });
  await service.start();

  assert.equal(primary.calls.start, 1);
  assert.equal(fallback.calls.start, 0);
  assert.deepEqual(events, [{ type: 'start' }]);
});

test('Android test injection can force the bundled provider without a product setting', async () => {
  const primary = makeProvider({ status: 'ready', canAskAgain: true });
  const fallback = makeProvider({ status: 'ready', canAskAgain: true });
  const service = createAndroidHybridVoiceInputService({
    primary: primary.provider,
    fallback: fallback.provider,
    providerOverride: () => 'fallback',
  });

  await service.start();

  assert.equal(primary.calls.start, 0);
  assert.equal(fallback.calls.start, 1);
});

test('Android falls back to the bundled provider when on-device recognition is unavailable', async () => {
  const primary = makeProvider({ status: 'unsupported', canAskAgain: false });
  const fallback = makeProvider({ status: 'ready', canAskAgain: true });
  const service = makeService(primary.provider, fallback.provider);
  const events: VoiceInputEvent[] = [];
  service.subscribe((event) => events.push(event));

  await service.start();
  fallback.emit({ type: 'result', transcript: '牛乳を買う', isFinal: false });
  fallback.emit({ type: 'result', transcript: '牛乳を買う', isFinal: true });
  fallback.emit({ type: 'end' });

  assert.equal(primary.calls.start, 0);
  assert.equal(fallback.calls.start, 1);
  assert.deepEqual(events, [
    { type: 'start' },
    { type: 'result', transcript: '牛乳を買う', isFinal: true },
    { type: 'end' },
  ]);
});

test('Android keeps the selected provider for the session and waits for final output on stop', async () => {
  const primary = makeProvider({ status: 'ready', canAskAgain: true });
  const fallback = makeProvider({ status: 'ready', canAskAgain: true });
  const service = makeService(primary.provider, fallback.provider);
  const events: VoiceInputEvent[] = [];
  service.subscribe((event) => events.push(event));

  await service.start();
  service.stop();
  primary.emit({ type: 'result', transcript: '薬を飲む', isFinal: true });
  primary.emit({ type: 'end' });

  assert.equal(primary.calls.stop, 1);
  assert.equal(fallback.calls.stop, 0);
  assert.deepEqual(events, [
    { type: 'start' },
    { type: 'result', transcript: '薬を飲む', isFinal: true },
    { type: 'end' },
  ]);
});

test('Android switches to Moonshine on the next session after an OS runtime error', async () => {
  const primary = makeProvider({ status: 'ready', canAskAgain: true });
  const fallback = makeProvider({ status: 'ready', canAskAgain: true });
  const service = makeService(primary.provider, fallback.provider);
  const events: VoiceInputEvent[] = [];
  service.subscribe((event) => events.push(event));

  await service.start();
  primary.emit({ type: 'error', error: 'interrupted', message: 'OS recognizer failed' });
  await service.start();

  assert.equal(primary.calls.start, 1);
  assert.equal(fallback.calls.start, 1);
  assert.deepEqual(events, [
    { type: 'start' },
    { type: 'error', error: 'interrupted', message: 'OS recognizer failed' },
    { type: 'end' },
    { type: 'start' },
  ]);
});

test('Android abort discards the active provider and releases both providers in the background', async () => {
  const primary = makeProvider({ status: 'ready', canAskAgain: true });
  const fallback = makeProvider({ status: 'ready', canAskAgain: true });
  const service = makeService(primary.provider, fallback.provider);
  const events: VoiceInputEvent[] = [];
  service.subscribe((event) => events.push(event));

  await service.start();
  service.abort();
  service.releaseForBackground();

  assert.equal(primary.calls.abort, 1);
  assert.equal(primary.calls.release, 1);
  assert.equal(fallback.calls.release, 1);
  assert.deepEqual(events, [
    { type: 'start' },
    { type: 'error', error: 'aborted', message: 'Voice input was cancelled' },
    { type: 'end' },
  ]);
});

test('Android reports permission and model failures from both providers', async () => {
  const permissionRequired = makeProvider({ status: 'permission-required', canAskAgain: true });
  const fallbackUnavailable = makeProvider({ status: 'model-unavailable', canAskAgain: false });
  const service = makeService(permissionRequired.provider, fallbackUnavailable.provider);

  assert.deepEqual(await service.getAvailability(), {
    status: 'permission-required',
    canAskAgain: true,
  });

  const denied = makeProvider({ status: 'permission-denied', canAskAgain: false });
  const unavailable = makeProvider({ status: 'unsupported', canAskAgain: false });
  assert.deepEqual(await makeService(denied.provider, unavailable.provider).getAvailability(), {
    status: 'permission-denied',
    canAskAgain: false,
  });

  const fallbackReady = makeProvider({ status: 'ready', canAskAgain: true });
  const serviceWithReadyFallback = makeService(denied.provider, fallbackReady.provider);
  await serviceWithReadyFallback.start();
  assert.equal(fallbackReady.calls.start, 1);
});

test('Android reports the bundled model failure when the OS provider is unsupported', async () => {
  const primary = makeProvider({ status: 'unsupported', canAskAgain: false });
  const fallback = makeProvider({ status: 'model-unavailable', canAskAgain: false });

  assert.deepEqual(await makeService(primary.provider, fallback.provider).getAvailability(), {
    status: 'model-unavailable',
    canAskAgain: false,
  });
});

test('Android requests microphone permission from Moonshine when the OS provider is unavailable', async () => {
  const primary = makeProvider({ status: 'unsupported', canAskAgain: false });
  const fallback = makeProvider({ status: 'permission-required', canAskAgain: true });
  const service = makeService(primary.provider, fallback.provider);

  assert.deepEqual(await service.getAvailability(), {
    status: 'permission-required',
    canAskAgain: true,
  });
  await service.requestMicrophonePermission();

  assert.equal(primary.calls.requestPermission, 0);
  assert.equal(fallback.calls.requestPermission, 1);
});
