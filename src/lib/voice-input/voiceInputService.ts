import type { VoiceInputService } from './voiceInputTypes';

const unavailablePermission = {
  granted: false,
  status: 'denied' as const,
  canAskAgain: false,
  expires: 'never' as const,
};

export const voiceInputService: VoiceInputService = {
  async getAvailability() {
    return { status: 'unsupported', canAskAgain: false };
  },
  async requestMicrophonePermission() {
    return unavailablePermission;
  },
  async start() {
    throw new Error('Voice input is unavailable on this platform');
  },
  stop() {},
  abort() {},
  subscribe() {
    return { remove() {} };
  },
};
