import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createMoonshineVoiceInputService,
  type MoonshineNativeModule,
  type MoonshinePcmStream,
} from './moonshineVoiceInputServiceCore';
import type { VoiceInputEvent } from './voiceInputTypes';

function makeNative() {
  const listeners = new Set<(samples: Float32Array, sampleRate: number) => void>();
  const errorListeners = new Set<(message: string) => void>();
  const calls = { createEngine: 0, createStream: 0, start: 0, stop: 0, transcribe: 0, destroy: 0 };
  let transcript = '牛乳を買う';
  let streamError: string | null = null;

  const stream: MoonshinePcmStream = {
    async start() {
      calls.start += 1;
    },
    async stop() {
      calls.stop += 1;
    },
    onData(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onError(listener) {
      errorListeners.add(listener);
      if (streamError) listener(streamError);
      return () => errorListeners.delete(listener);
    },
  };

  const native: MoonshineNativeModule = {
    async createEngine() {
      calls.createEngine += 1;
      return {
        async transcribeSamples(samples, sampleRate) {
          calls.transcribe += 1;
          assert.equal(sampleRate, 16_000);
          assert.equal(samples.length, 2);
          assert.ok(Math.abs(samples[0] - 0.1) < 0.001);
          assert.ok(Math.abs(samples[1] - 0.2) < 0.001);
          return { text: transcript };
        },
        async destroy() {
          calls.destroy += 1;
        },
      };
    },
    createPcmLiveStream() {
      calls.createStream += 1;
      return stream;
    },
  };

  return {
    native,
    calls,
    emit(samples: number[], sampleRate = 16_000) {
      for (const listener of listeners) listener(Float32Array.from(samples), sampleRate);
    },
    setTranscript(value: string) {
      transcript = value;
    },
    setStreamError(value: string) {
      streamError = value;
    },
    emitError(message: string) {
      for (const listener of errorListeners) listener(message);
    },
  };
}

function makeService(native: MoonshineNativeModule, apiLevel = 35, maxDurationMs?: number) {
  return createMoonshineVoiceInputService({
    native,
    apiLevel,
    maxDurationMs,
    permissions: {
      get: async () => ({
        granted: true,
        status: 'granted',
        canAskAgain: true,
        expires: 'never' as const,
      }),
      request: async () => ({
        granted: true,
        status: 'granted',
        canAskAgain: true,
        expires: 'never' as const,
      }),
    },
  });
}

test('Moonshine is unavailable below the Android voice-input API level', async () => {
  const fake = makeNative();
  assert.deepEqual(await makeService(fake.native, 27).getAvailability(), {
    status: 'unsupported',
    canAskAgain: false,
  });
  assert.equal(fake.calls.createEngine, 0);
});

test('Moonshine loads lazily, records PCM, and emits one final result after stop', async () => {
  const fake = makeNative();
  const service = makeService(fake.native);
  const events: VoiceInputEvent[] = [];
  service.subscribe((event) => events.push(event));

  assert.deepEqual(await service.getAvailability(), { status: 'ready', canAskAgain: true });
  assert.equal(fake.calls.createEngine, 1);

  await service.start();
  fake.emit([0.1, 0.2]);
  service.stop();
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(
    events.filter((event) => event.type !== 'volume'),
    [
      { type: 'start' },
      { type: 'result', transcript: '牛乳を買う', isFinal: true },
      { type: 'end' },
    ],
  );
  assert.equal(fake.calls.transcribe, 1);
  assert.equal(fake.calls.stop, 1);
});

test('Moonshine clips PCM at the duration limit and finalizes only once', async () => {
  const fake = makeNative();
  let capturedSamples: number[] = [];
  fake.native.createEngine = async () => ({
    async transcribeSamples(samples, sampleRate) {
      assert.equal(sampleRate, 16_000);
      fake.calls.transcribe += 1;
      capturedSamples = samples;
      return { text: '薬を飲む' };
    },
    async destroy() {},
  });
  const service = makeService(fake.native, 35, 1);
  const events: VoiceInputEvent[] = [];
  service.subscribe((event) => events.push(event));

  await service.start();
  fake.emit(Array.from({ length: 20 }, (_, index) => index / 100));
  fake.emit([0.9, 0.8]);
  service.stop();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(capturedSamples.length, 16);
  assert.equal(fake.calls.stop, 1);
  assert.equal(fake.calls.transcribe, 1);
  assert.deepEqual(
    events.filter((event) => event.type !== 'volume'),
    [{ type: 'start' }, { type: 'result', transcript: '薬を飲む', isFinal: true }, { type: 'end' }],
  );
});

test('Moonshine starts transcription without waiting for the PCM stream stop promise', async () => {
  const dataListeners = new Set<(samples: Float32Array, sampleRate: number) => void>();
  let resolveStreamStop: (() => void) | undefined;
  let transcriptionStarted = false;
  let resolveTranscription: ((result: { text: string }) => void) | undefined;
  const native: MoonshineNativeModule = {
    async createEngine() {
      return {
        transcribeSamples: async () => {
          transcriptionStarted = true;
          return new Promise<{ text: string }>((resolve) => {
            resolveTranscription = resolve;
          });
        },
        async destroy() {},
      };
    },
    createPcmLiveStream() {
      return {
        async start() {},
        stop: () =>
          new Promise<void>((resolve) => {
            resolveStreamStop = resolve;
          }),
        onData(listener) {
          dataListeners.add(listener);
          return () => dataListeners.delete(listener);
        },
        onError() {
          return () => {};
        },
      };
    },
  };
  const service = makeService(native);
  const events: VoiceInputEvent[] = [];
  service.subscribe((event) => events.push(event));

  await service.start();
  for (const listener of dataListeners) listener(Float32Array.from([0.1, 0.2]), 16_000);
  service.stop();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(transcriptionStarted, true);
  resolveTranscription?.({ text: '薬を飲む' });
  resolveStreamStop?.();
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(
    events.filter((event) => event.type !== 'volume'),
    [{ type: 'start' }, { type: 'result', transcript: '薬を飲む', isFinal: true }, { type: 'end' }],
  );
});

test('Moonshine emits an end event when the recognition engine is unavailable at stop', async () => {
  const fake = makeNative();
  fake.native.createEngine = async () => null as never;
  const service = makeService(fake.native);
  const events: VoiceInputEvent[] = [];
  service.subscribe((event) => events.push(event));

  await service.start();
  service.stop();
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(
    events.filter((event) => event.type !== 'volume'),
    [
      { type: 'start' },
      { type: 'error', error: 'interrupted', message: 'Voice recognition engine was released' },
      { type: 'end' },
    ],
  );
  assert.equal(fake.calls.stop, 1);
});

test('Moonshine reports a PCM sample-rate mismatch instead of silently discarding audio', async () => {
  const fake = makeNative();
  const service = makeService(fake.native);
  const events: VoiceInputEvent[] = [];
  service.subscribe((event) => events.push(event));

  await service.start();
  fake.emit([0.1, 0.2], 8_000);
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(
    events.filter((event) => event.type !== 'volume'),
    [
      { type: 'start' },
      { type: 'error', error: 'interrupted', message: 'Unexpected PCM sample rate: 8000' },
      { type: 'end' },
    ],
  );
  assert.equal(fake.calls.transcribe, 0);
  assert.equal(fake.calls.stop, 1);
});

test('Moonshine does not reuse a model while an aborted transcription is still running', async () => {
  const fake = makeNative();
  let engineCount = 0;
  let resolveFirstTranscription: ((result: { text: string }) => void) | undefined;
  fake.native.createEngine = async () => {
    const engineId = ++engineCount;
    return {
      transcribeSamples: () =>
        engineId === 1
          ? new Promise<{ text: string }>((resolve) => {
              resolveFirstTranscription = resolve;
            })
          : Promise.resolve({ text: '' }),
      async destroy() {},
    };
  };
  const service = makeService(fake.native);

  await service.start();
  fake.emit([0.1, 0.2]);
  service.stop();
  await new Promise((resolve) => setImmediate(resolve));

  service.abort();
  const nextStart = service.start();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(engineCount, 1);

  resolveFirstTranscription?.({ text: '牛乳を買う' });
  await nextStart;
  assert.equal(engineCount, 2);
  service.abort();
});

test('Moonshine abort drops captured samples and releases the engine', async () => {
  const fake = makeNative();
  const service = makeService(fake.native);
  const events: VoiceInputEvent[] = [];
  service.subscribe((event) => events.push(event));

  await service.start();
  fake.emit([0.1, 0.2]);
  service.abort();
  service.releaseForBackground();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(fake.calls.transcribe, 0);
  assert.equal(fake.calls.destroy, 1);
  assert.deepEqual(
    events.filter((event) => event.type !== 'volume'),
    [
      { type: 'start' },
      { type: 'error', error: 'aborted', message: 'Voice input was cancelled' },
      { type: 'end' },
    ],
  );
});

test('Moonshine reports an empty recognition as nomatch', async () => {
  const fake = makeNative();
  fake.setTranscript('');
  const service = makeService(fake.native);
  const events: VoiceInputEvent[] = [];
  service.subscribe((event) => events.push(event));

  await service.start();
  fake.emit([0.1, 0.2]);
  service.stop();
  await new Promise((resolve) => setImmediate(resolve));

  assert.ok(events.some((event) => event.type === 'nomatch'));
  assert.ok(events.some((event) => event.type === 'end'));
});

test('Moonshine ends an interrupted session when the PCM stream fails', async () => {
  const fake = makeNative();
  const service = makeService(fake.native);
  const events: VoiceInputEvent[] = [];
  service.subscribe((event) => events.push(event));

  await service.start();
  fake.emitError('audio input failed');
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(
    events.filter((event) => event.type !== 'volume'),
    [
      { type: 'start' },
      { type: 'error', error: 'interrupted', message: 'audio input failed' },
      { type: 'end' },
    ],
  );
});

test('Moonshine releases an engine only after an in-flight transcription settles', async () => {
  const fake = makeNative();
  let resolveTranscription: ((result: { text: string }) => void) | undefined;
  let destroyCalls = 0;
  fake.native.createEngine = async () => ({
    transcribeSamples: () =>
      new Promise<{ text: string }>((resolve) => {
        resolveTranscription = resolve;
      }),
    async destroy() {
      destroyCalls += 1;
    },
  });
  const service = makeService(fake.native);

  await service.start();
  fake.emit([0.1, 0.2]);
  service.stop();
  await new Promise((resolve) => setImmediate(resolve));

  service.releaseForBackground();
  assert.equal(destroyCalls, 0);
  resolveTranscription?.({ text: '牛乳を買う' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(destroyCalls, 1);
});

test('Moonshine destroys a model that finishes loading after background release', async () => {
  const fake = makeNative();
  let resolveEngine:
    ((engine: Awaited<ReturnType<MoonshineNativeModule['createEngine']>>) => void) | undefined;
  let destroyCalls = 0;
  fake.native.createEngine = () =>
    new Promise((resolve) => {
      resolveEngine = resolve;
    });
  const service = makeService(fake.native);

  const availability = service.getAvailability();
  await new Promise((resolve) => setImmediate(resolve));
  service.releaseForBackground();
  resolveEngine?.({
    async transcribeSamples() {
      return { text: '' };
    },
    async destroy() {
      destroyCalls += 1;
    },
  });

  assert.deepEqual(await availability, { status: 'model-unavailable', canAskAgain: false });
  assert.equal(destroyCalls, 1);
});
