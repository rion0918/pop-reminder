import type {
  VoiceInputError,
  VoiceInputEvent,
  VoiceInputPermissionResponse,
  VoiceInputService,
} from './voiceInputTypes';

type Subscription = { remove(): void };

export type VoskNativeModule = {
  loadModel(modelName: string): Promise<void>;
  start(options?: { timeout?: number }): Promise<void>;
  stop(): void;
  unload(): void;
  onPartialResult(listener: (event: unknown) => void): Subscription;
  onResult(listener: (event: unknown) => void): Subscription;
  onFinalResult(listener: (event: unknown) => void): Subscription;
  onError(listener: (event: unknown) => void): Subscription;
  onTimeout(listener: (event: unknown) => void): Subscription;
};

type PermissionGateway = {
  get(): Promise<VoiceInputPermissionResponse>;
  request(): Promise<VoiceInputPermissionResponse>;
};

type VoskServiceOptions = {
  vosk: VoskNativeModule;
  permissions: PermissionGateway;
  apiLevel: number;
  modelName: string;
  timeoutMs: number;
};

type SessionState = 'idle' | 'starting' | 'listening' | 'stopping';

export function parseVoskTranscript(payload: unknown): string {
  if (typeof payload === 'string') {
    const value = payload.trim();
    if (!value) return '';
    if (!value.startsWith('{')) return value;
    try {
      return parseVoskTranscript(JSON.parse(value));
    } catch {
      return '';
    }
  }

  if (typeof payload !== 'object' || payload === null) return '';
  const result = payload as { partial?: unknown; text?: unknown };
  const value = typeof result.text === 'string' ? result.text : result.partial;
  return typeof value === 'string' ? value.trim() : '';
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : 'Voice recognition failed';
}

function normalizeVoskError(error: unknown): VoiceInputError {
  const message = errorMessage(error).toLowerCase();
  if (message.includes('permission') || message.includes('not granted')) return 'not-allowed';
  if (message.includes('model')) return 'model-unavailable';
  if (message.includes('abort') || message.includes('cancel')) return 'aborted';
  if (message.includes('interrupt') || message.includes('audio')) return 'interrupted';
  if (message.includes('no speech') || message.includes('no-speech')) return 'no-speech';
  return 'unknown';
}

export function createVoskVoiceInputService(options: VoskServiceOptions) {
  const { vosk, permissions, apiLevel, modelName, timeoutMs } = options;
  const listeners = new Set<(event: VoiceInputEvent) => void>();
  let modelLoaded = false;
  let modelLoadPromise: Promise<void> | null = null;
  let lifecycleGeneration = 0;
  let state: SessionState = 'idle';
  let sessionSequence = 0;
  let activeSessionId: number | null = null;
  let nativeSubscriptions: Subscription[] = [];
  let receivedText = false;
  let lastStreamResult = '';

  function emit(event: VoiceInputEvent) {
    for (const listener of listeners) listener(event);
  }

  function removeNativeSubscriptions() {
    for (const subscription of nativeSubscriptions) subscription.remove();
    nativeSubscriptions = [];
  }

  function isActive(sessionId: number) {
    return activeSessionId === sessionId && state !== 'idle';
  }

  function finishSession(sessionId: number) {
    if (!isActive(sessionId)) return;
    removeNativeSubscriptions();
    activeSessionId = null;
    state = 'idle';
    emit({ type: 'end' });
  }

  async function ensureModelLoaded() {
    if (modelLoaded) return;
    const requestedGeneration = lifecycleGeneration;
    if (!modelLoadPromise) {
      modelLoadPromise = vosk
        .loadModel(modelName)
        .then(() => {
          modelLoaded = true;
          if (requestedGeneration !== lifecycleGeneration) {
            vosk.unload();
            modelLoaded = false;
            throw new Error('Voice input was interrupted while loading the model');
          }
        })
        .finally(() => {
          modelLoadPromise = null;
        });
    }
    await modelLoadPromise;
  }

  function installNativeSubscriptions(sessionId: number) {
    removeNativeSubscriptions();
    nativeSubscriptions = [
      vosk.onPartialResult((payload) => {
        if (!isActive(sessionId)) return;
        const transcript = parseVoskTranscript(payload);
        if (!transcript) return;
        receivedText = true;
        emit({ type: 'result', transcript, isFinal: false });
      }),
      vosk.onResult((payload) => {
        if (!isActive(sessionId)) return;
        const transcript = parseVoskTranscript(payload);
        if (!transcript) return;
        receivedText = true;
        lastStreamResult = transcript;
        emit({ type: 'result', transcript, isFinal: true });
      }),
      vosk.onFinalResult((payload) => {
        if (!isActive(sessionId)) return;
        const transcript = parseVoskTranscript(payload);
        if (transcript && transcript !== lastStreamResult) {
          receivedText = true;
          emit({ type: 'result', transcript, isFinal: true });
        }
        finishSession(sessionId);
      }),
      vosk.onError((error) => {
        if (!isActive(sessionId)) return;
        emit({
          type: 'error',
          error: normalizeVoskError(error),
          message: errorMessage(error),
        });
        finishSession(sessionId);
      }),
      vosk.onTimeout(() => {
        if (!isActive(sessionId)) return;
        vosk.stop();
        if (!receivedText) emit({ type: 'nomatch' });
        finishSession(sessionId);
      }),
    ];
  }

  const service: VoiceInputService & {
    releaseForBackground(): void;
  } = {
    async getAvailability() {
      if (apiLevel < 28) return { status: 'unsupported', canAskAgain: false };

      const permission = await permissions.get();
      if (!permission.granted) {
        return permission.canAskAgain
          ? { status: 'permission-required', canAskAgain: true }
          : { status: 'permission-denied', canAskAgain: false };
      }

      try {
        await ensureModelLoaded();
        return { status: 'ready', canAskAgain: true };
      } catch {
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
      receivedText = false;
      lastStreamResult = '';
      installNativeSubscriptions(sessionId);

      try {
        await vosk.start({ timeout: timeoutMs });
        if (!isActive(sessionId)) return;
        state = 'listening';
        emit({ type: 'start' });
      } catch (error) {
        if (isActive(sessionId)) {
          emit({
            type: 'error',
            error: normalizeVoskError(error),
            message: errorMessage(error),
          });
          finishSession(sessionId);
        }
        throw error;
      }
    },

    stop() {
      if (activeSessionId === null || state === 'idle' || state === 'stopping') return;
      state = 'stopping';
      vosk.stop();
    },

    abort() {
      if (activeSessionId === null || state === 'idle') return;
      const sessionId = activeSessionId;
      removeNativeSubscriptions();
      activeSessionId = null;
      state = 'idle';
      vosk.stop();
      emit({ type: 'error', error: 'aborted', message: 'Voice input was cancelled' });
      emit({ type: 'end' });
      sessionSequence = Math.max(sessionSequence, sessionId);
    },

    subscribe(listener) {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },

    releaseForBackground() {
      lifecycleGeneration += 1;
      if (state !== 'idle') service.abort();
      if (!modelLoaded) return;
      vosk.unload();
      modelLoaded = false;
      modelLoadPromise = null;
    },
  };

  return service;
}
