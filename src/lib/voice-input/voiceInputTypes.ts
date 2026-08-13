export type VoiceInputPermissionResponse = {
  granted: boolean;
  status: string;
  canAskAgain: boolean;
  expires: 'never' | number;
};

export type VoiceInputAvailability =
  | { status: 'ready'; canAskAgain: true }
  | { status: 'permission-required'; canAskAgain: true }
  | { status: 'permission-denied'; canAskAgain: boolean }
  | { status: 'model-unavailable'; canAskAgain: false }
  | { status: 'unsupported'; canAskAgain: false };

export type VoiceInputError =
  'not-allowed' | 'no-speech' | 'aborted' | 'interrupted' | 'model-unavailable' | 'unknown';

export type VoiceInputEvent =
  | { type: 'start' }
  | { type: 'end' }
  | { type: 'result'; transcript: string; isFinal: boolean }
  | { type: 'error'; error: VoiceInputError; message: string }
  | { type: 'nomatch' }
  | { type: 'volume'; value: number };

export type VoiceInputService = {
  getAvailability(): Promise<VoiceInputAvailability>;
  requestMicrophonePermission(): Promise<VoiceInputPermissionResponse>;
  start(): Promise<void>;
  stop(): void;
  abort(): void;
  subscribe(listener: (event: VoiceInputEvent) => void): { remove(): void };
};
