import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createVoskVoiceInputService,
  parseVoskTranscript,
  type VoskNativeModule,
} from './voskVoiceInputServiceCore';

type NativeEventName = 'partial' | 'result' | 'final' | 'error' | 'timeout';

function makeVosk(overrides: Partial<VoskNativeModule> = {}) {
  const calls = { loadModel: 0, start: 0, stop: 0, unload: 0 };
  const listeners = new Map<NativeEventName, Set<(event: unknown) => void>>();
  let loadedModel: string | null = null;
  let startOptions: { timeout?: number } | undefined;

  function on(eventName: NativeEventName, listener: (event: unknown) => void) {
    const eventListeners = listeners.get(eventName) ?? new Set();
    eventListeners.add(listener);
    listeners.set(eventName, eventListeners);
    return { remove: () => eventListeners.delete(listener) };
  }

  const module: VoskNativeModule = {
    async loadModel(modelName) {
      calls.loadModel += 1;
      loadedModel = modelName;
    },
    async start(options) {
      calls.start += 1;
      startOptions = options;
    },
    stop() {
      calls.stop += 1;
    },
    unload() {
      calls.unload += 1;
    },
    onPartialResult: (listener) => on('partial', listener),
    onResult: (listener) => on('result', listener),
    onFinalResult: (listener) => on('final', listener),
    onError: (listener) => on('error', listener),
    onTimeout: (listener) => on('timeout', listener),
    ...overrides,
  };

  return {
    module,
    calls,
    get loadedModel() {
      return loadedModel;
    },
    get startOptions() {
      return startOptions;
    },
    emit(eventName: NativeEventName, event: unknown = '') {
      for (const listener of listeners.get(eventName) ?? []) listener(event);
    },
    captureListeners(eventName: NativeEventName) {
      return [...(listeners.get(eventName) ?? [])];
    },
  };
}

function makeService(
  vosk = makeVosk(),
  options: {
    apiLevel?: number;
    granted?: boolean;
    canAskAgain?: boolean;
  } = {},
) {
  const permission = {
    granted: options.granted ?? true,
    status: options.granted === false ? 'denied' : 'granted',
    canAskAgain: options.canAskAgain ?? true,
    expires: 'never' as const,
  };
  const service = createVoskVoiceInputService({
    vosk: vosk.module,
    apiLevel: options.apiLevel ?? 35,
    modelName: 'model-ja-jp',
    timeoutMs: 30_000,
    permissions: {
      get: async () => permission,
      request: async () => permission,
    },
  });
  return { service, vosk };
}

test('Vosk result parser accepts plain strings and native JSON payloads', () => {
  assert.equal(parseVoskTranscript(' 買い物 '), '買い物');
  assert.equal(parseVoskTranscript('{"partial":" 明日の会議 "}'), '明日の会議');
  assert.equal(parseVoskTranscript('{"text":"薬を受け取る"}'), '薬を受け取る');
  assert.equal(parseVoskTranscript('{broken'), '');
  assert.equal(parseVoskTranscript({ text: '牛乳を買う' }), '牛乳を買う');
  assert.equal(parseVoskTranscript({}), '');
});

test('Android 9 is the voice-input minimum and permission states remain actionable', async () => {
  const oldAndroid = makeService(makeVosk(), { apiLevel: 27 });
  assert.deepEqual(await oldAndroid.service.getAvailability(), {
    status: 'unsupported',
    canAskAgain: false,
  });

  const permissionRequired = makeService(makeVosk(), { granted: false, canAskAgain: true });
  assert.deepEqual(await permissionRequired.service.getAvailability(), {
    status: 'permission-required',
    canAskAgain: true,
  });

  const permissionDenied = makeService(makeVosk(), { granted: false, canAskAgain: false });
  assert.deepEqual(await permissionDenied.service.getAvailability(), {
    status: 'permission-denied',
    canAskAgain: false,
  });
});

test('bundled Japanese model loads once per foreground lifecycle', async () => {
  const { service, vosk } = makeService();

  assert.deepEqual(await service.getAvailability(), { status: 'ready', canAskAgain: true });
  assert.deepEqual(await service.getAvailability(), { status: 'ready', canAskAgain: true });
  assert.equal(vosk.calls.loadModel, 1);
  assert.equal(vosk.loadedModel, 'model-ja-jp');

  service.releaseForBackground();
  assert.equal(vosk.calls.unload, 1);

  assert.deepEqual(await service.getAvailability(), { status: 'ready', canAskAgain: true });
  assert.equal(vosk.calls.loadModel, 2);
});

test('model load failure has a distinct availability state and can be retried', async () => {
  let attempts = 0;
  const vosk = makeVosk({
    async loadModel() {
      attempts += 1;
      throw new Error('model missing');
    },
  });
  const { service } = makeService(vosk);

  assert.deepEqual(await service.getAvailability(), {
    status: 'model-unavailable',
    canAskAgain: false,
  });
  assert.deepEqual(await service.getAvailability(), {
    status: 'model-unavailable',
    canAskAgain: false,
  });
  assert.equal(attempts, 2);
});

test('Vosk emits partial and final text, suppressing the duplicated stream-final result', async () => {
  const { service, vosk } = makeService();
  const events: unknown[] = [];
  service.subscribe((event) => events.push(event));

  await service.start();
  vosk.emit('partial', '{"partial":"牛乳"}');
  vosk.emit('result', '{"text":"牛乳を買う"}');
  vosk.emit('final', '{"text":"牛乳を買う"}');

  assert.equal(vosk.startOptions?.timeout, 30_000);
  assert.deepEqual(events, [
    { type: 'start' },
    { type: 'result', transcript: '牛乳', isFinal: false },
    { type: 'result', transcript: '牛乳を買う', isFinal: true },
    { type: 'end' },
  ]);
});

test('stop waits for the native final result before ending the public session', async () => {
  const { service, vosk } = makeService();
  const events: unknown[] = [];
  service.subscribe((event) => events.push(event));

  await service.start();
  service.stop();
  vosk.emit('final', '明日の会議');

  assert.equal(vosk.calls.stop, 1);
  assert.deepEqual(events, [
    { type: 'start' },
    { type: 'result', transcript: '明日の会議', isFinal: true },
    { type: 'end' },
  ]);
});

test('abort discards late native results and reports an intentional cancellation once', async () => {
  const { service, vosk } = makeService();
  const events: unknown[] = [];
  service.subscribe((event) => events.push(event));

  await service.start();
  const staleResults = vosk.captureListeners('result');
  service.abort();
  for (const listener of staleResults) listener('保存してはいけない');

  assert.equal(vosk.calls.stop, 1);
  assert.deepEqual(events, [
    { type: 'start' },
    { type: 'error', error: 'aborted', message: 'Voice input was cancelled' },
    { type: 'end' },
  ]);
});

test('timeout releases the session and becomes no-speech when nothing was recognized', async () => {
  const { service, vosk } = makeService();
  const events: unknown[] = [];
  service.subscribe((event) => events.push(event));

  await service.start();
  vosk.emit('timeout');

  assert.equal(vosk.calls.stop, 1);
  assert.deepEqual(events, [{ type: 'start' }, { type: 'nomatch' }, { type: 'end' }]);
});

test('background release aborts an active recognizer before unloading the model', async () => {
  const { service, vosk } = makeService();
  await service.start();

  service.releaseForBackground();

  assert.equal(vosk.calls.stop, 1);
  assert.equal(vosk.calls.unload, 1);
});

test('background release invalidates a model load that is still in flight', async () => {
  let finishLoading: (() => void) | undefined;
  const vosk = makeVosk({
    loadModel: () =>
      new Promise<void>((resolve) => {
        finishLoading = resolve;
      }),
  });
  const { service } = makeService(vosk);
  const availability = service.getAvailability();

  await Promise.resolve();
  service.releaseForBackground();
  finishLoading?.();

  assert.deepEqual(await availability, { status: 'model-unavailable', canAskAgain: false });
  assert.equal(vosk.calls.unload, 1);
});
