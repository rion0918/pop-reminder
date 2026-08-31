import type {
  VoiceInputEvent,
  VoiceInputPermissionResponse,
  VoiceInputService,
} from './voiceInputTypes';

type Subscription = { remove(): void };

export type MoonshineSttEngine = {
  transcribeSamples(samples: number[], sampleRate: number): Promise<{ text?: string }>;
  destroy(): Promise<void>;
};

export type MoonshinePcmStream = {
  start(): Promise<void>;
  stop(): Promise<void>;
  onData(callback: (samples: Float32Array, sampleRate: number) => void): () => void;
  onError(callback: (message: string) => void): () => void;
};

export type MoonshineNativeModule = {
  createEngine(): Promise<MoonshineSttEngine>;
  createPcmLiveStream(): MoonshinePcmStream;
};

type PermissionGateway = {
  get(): Promise<VoiceInputPermissionResponse>;
  request(): Promise<VoiceInputPermissionResponse>;
};

type MoonshineServiceOptions = {
  native: MoonshineNativeModule;
  permissions: PermissionGateway;
  apiLevel: number;
  sampleRate?: number;
  maxDurationMs?: number;
};

type SessionState = 'idle' | 'starting' | 'listening' | 'stopping';

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : 'Moonshine recognition failed';
}

function reportModelLoadError(error: unknown) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn('[VoiceInput] Moonshine model initialization failed', error);
  }
}

function calculateVolume(samples: Float32Array) {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / samples.length);
}

export function createMoonshineVoiceInputService(
  options: MoonshineServiceOptions,
): VoiceInputService & { releaseForBackground(): void } {
  const { native, permissions, apiLevel, sampleRate = 16_000, maxDurationMs = 8_000 } = options;
  const listeners = new Set<(event: VoiceInputEvent) => void>();
  const maxSamples = Math.floor((sampleRate * maxDurationMs) / 1_000);
  let state: SessionState = 'idle';
  let engine: MoonshineSttEngine | null = null;
  let engineLoadPromise: Promise<MoonshineSttEngine> | null = null;
  let retiredEnginePromise: Promise<void> | null = null;
  let stream: MoonshinePcmStream | null = null;
  let streamSubscriptions: (() => void)[] = [];
  let samples: number[] = [];
  let sessionSequence = 0;
  let activeSessionId: number | null = null;
  let lifecycleGeneration = 0;
  let inFlightTranscription: Promise<{ text?: string }> | null = null;

  function emit(event: VoiceInputEvent) {
    for (const listener of listeners) listener(event);
  }

  function removeStreamSubscriptions() {
    for (const unsubscribe of streamSubscriptions) unsubscribe();
    streamSubscriptions = [];
  }

  function isActive(sessionId: number) {
    return activeSessionId === sessionId && state !== 'idle';
  }

  function cleanupSession() {
    removeStreamSubscriptions();
    stream = null;
    samples = [];
    activeSessionId = null;
    state = 'idle';
  }

  function retireEngineAfterTranscription() {
    const currentEngine = engine;
    if (!currentEngine) return;
    engine = null;

    const destroy = () => currentEngine.destroy().catch(() => {});
    if (!inFlightTranscription) {
      void destroy();
      return;
    }

    const retirement = inFlightTranscription.then(destroy, destroy);
    retiredEnginePromise = retirement;
    void retirement.finally(() => {
      if (retiredEnginePromise === retirement) retiredEnginePromise = null;
    });
  }

  function emitErrorAndEnd(sessionId: number, error: Extract<VoiceInputEvent, { type: 'error' }>) {
    if (!isActive(sessionId)) return;
    cleanupSession();
    emit(error);
    emit({ type: 'end' });
  }

  async function ensureEngineLoaded() {
    if (engine) return engine;
    if (retiredEnginePromise) await retiredEnginePromise;
    if (engine) return engine;
    if (!engineLoadPromise) {
      const requestedGeneration = lifecycleGeneration;
      engineLoadPromise = native
        .createEngine()
        .then(async (createdEngine) => {
          if (requestedGeneration !== lifecycleGeneration) {
            await createdEngine.destroy().catch(() => {});
            throw new Error('Voice input was interrupted while loading the model');
          }
          engine = createdEngine;
          return createdEngine;
        })
        .finally(() => {
          engineLoadPromise = null;
        });
    }
    return engineLoadPromise;
  }

  async function finishSession(sessionId: number) {
    if (!isActive(sessionId) || !stream) return;
    const currentStream = stream;
    const currentSamples = samples;
    const currentEngine = engine;
    removeStreamSubscriptions();
    stream = null;
    samples = [];

    try {
      // Snapshotting the PCM above detaches recognition from the native capture lifecycle.
      // Some Android AudioRecord implementations take a while to resolve stop(); waiting for
      // that promise would leave the quick-add sheet stuck in "文字にしています…" before the
      // actual inference even starts.
      void currentStream.stop().catch(() => {});
      if (!isActive(sessionId) || !currentEngine) return;
      const transcription = currentEngine.transcribeSamples(currentSamples, sampleRate);
      inFlightTranscription = transcription;
      const result = await transcription;
      if (inFlightTranscription === transcription) inFlightTranscription = null;
      if (!isActive(sessionId)) return;
      const transcript = typeof result.text === 'string' ? result.text.trim() : '';
      if (transcript) {
        emit({ type: 'result', transcript, isFinal: true });
      } else {
        emit({ type: 'nomatch' });
      }
      cleanupSession();
      emit({ type: 'end' });
    } catch (error) {
      inFlightTranscription = null;
      if (!isActive(sessionId)) return;
      emitErrorAndEnd(sessionId, {
        type: 'error',
        error: 'unknown',
        message: errorMessage(error),
      });
    }
  }

  const service: VoiceInputService & { releaseForBackground(): void } = {
    async getAvailability() {
      if (apiLevel < 28) return { status: 'unsupported', canAskAgain: false };

      const permission = await permissions.get();
      if (!permission.granted) {
        return permission.canAskAgain
          ? { status: 'permission-required', canAskAgain: true }
          : { status: 'permission-denied', canAskAgain: false };
      }

      try {
        await ensureEngineLoaded();
        return { status: 'ready', canAskAgain: true };
      } catch (error) {
        reportModelLoadError(error);
        return { status: 'model-unavailable', canAskAgain: false };
      }
    },

    requestMicrophonePermission() {
      return permissions.request();
    },

    async start() {
      if (state !== 'idle') throw new Error('Voice recognizer is already active');
      const availability = await service.getAvailability();
      if (availability.status !== 'ready') {
        throw new Error(`Voice input is unavailable: ${availability.status}`);
      }

      const sessionId = ++sessionSequence;
      activeSessionId = sessionId;
      state = 'starting';
      samples = [];
      const currentStream = native.createPcmLiveStream();
      stream = currentStream;
      const dataUnsubscribe = currentStream.onData((chunk, chunkSampleRate) => {
        if (!isActive(sessionId)) return;
        if (chunkSampleRate !== sampleRate) return;
        const remaining = maxSamples - samples.length;
        if (remaining > 0) samples.push(...Array.from(chunk.slice(0, remaining)));
        emit({ type: 'volume', value: calculateVolume(chunk) });
        if (samples.length >= maxSamples) service.stop();
      });
      const errorUnsubscribe = currentStream.onError((message) => {
        if (!isActive(sessionId)) return;
        void currentStream.stop().catch(() => {});
        emitErrorAndEnd(sessionId, { type: 'error', error: 'interrupted', message });
      });
      if (!isActive(sessionId)) {
        dataUnsubscribe();
        errorUnsubscribe();
        return;
      }
      streamSubscriptions = [dataUnsubscribe, errorUnsubscribe];

      try {
        await currentStream.start();
        if (!isActive(sessionId)) return;
        state = 'listening';
        emit({ type: 'start' });
      } catch (error) {
        emitErrorAndEnd(sessionId, {
          type: 'error',
          error: 'interrupted',
          message: errorMessage(error),
        });
        throw error;
      }
    },

    stop() {
      if (activeSessionId === null || state === 'idle' || state === 'stopping') return;
      state = 'stopping';
      void finishSession(activeSessionId);
    },

    abort() {
      if (activeSessionId === null || state === 'idle') return;
      const currentStream = stream;
      cleanupSession();
      if (currentStream) void currentStream.stop().catch(() => {});
      if (inFlightTranscription) retireEngineAfterTranscription();
      emit({ type: 'error', error: 'aborted', message: 'Voice input was cancelled' });
      emit({ type: 'end' });
    },

    subscribe(listener) {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },

    releaseForBackground() {
      lifecycleGeneration += 1;
      service.abort();
      retireEngineAfterTranscription();
    },
  };

  return service;
}

export type { Subscription };
