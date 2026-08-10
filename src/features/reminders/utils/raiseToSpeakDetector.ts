export const RAISE_TO_SPEAK_UPDATE_INTERVAL_MS = 50;
export const RAISE_TO_SPEAK_RIGHT_TILT_HOLD_MS = 200;
export const RAISE_TO_SPEAK_PORTRAIT_HOLD_MS = 350;
export const RAISE_TO_SPEAK_COOLDOWN_MS = 1_500;
export const RAISE_TO_SPEAK_MAX_LISTENING_MS = 30_000;

const RIGHT_TILT_GRAVITY_RATIO = 0.64;

type RaiseToSpeakPhase = 'idle' | 'listening' | 'cooldown';

export type RaiseToSpeakDetectorState = {
  phase: RaiseToSpeakPhase;
  rightTiltedSince: number | null;
  portraitSince: number | null;
  listeningStartedAt: number | null;
  cooldownUntil: number | null;
};

export type RaiseToSpeakSample = {
  timestamp: number;
  rightTilted: boolean;
};

export type RaiseToSpeakAction = 'none' | 'start' | 'stop';

export function isRightTiltedVoicePose(
  gravity: { x: number; y: number; z: number } | null | undefined,
) {
  if (!gravity) return false;

  const magnitude = Math.sqrt(gravity.x ** 2 + gravity.y ** 2 + gravity.z ** 2);
  if (magnitude < 1) return false;

  const horizontalRatio = gravity.x / magnitude;
  const verticalRatio = gravity.y / magnitude;
  return horizontalRatio >= RIGHT_TILT_GRAVITY_RATIO && horizontalRatio >= Math.abs(verticalRatio);
}

export function createRaiseToSpeakDetectorState(): RaiseToSpeakDetectorState {
  return {
    phase: 'idle',
    rightTiltedSince: null,
    portraitSince: null,
    listeningStartedAt: null,
    cooldownUntil: null,
  };
}

function enterCooldown(timestamp: number): RaiseToSpeakDetectorState {
  return {
    ...createRaiseToSpeakDetectorState(),
    phase: 'cooldown',
    cooldownUntil: timestamp + RAISE_TO_SPEAK_COOLDOWN_MS,
  };
}

export function reduceRaiseToSpeakDetector(
  state: RaiseToSpeakDetectorState,
  sample: RaiseToSpeakSample,
): { state: RaiseToSpeakDetectorState; action: RaiseToSpeakAction } {
  if (state.phase === 'cooldown') {
    if (
      state.cooldownUntil !== null &&
      sample.timestamp >= state.cooldownUntil &&
      !sample.rightTilted
    ) {
      return { state: createRaiseToSpeakDetectorState(), action: 'none' };
    }
    return { state, action: 'none' };
  }

  if (state.phase === 'listening') {
    if (
      state.listeningStartedAt !== null &&
      sample.timestamp - state.listeningStartedAt >= RAISE_TO_SPEAK_MAX_LISTENING_MS
    ) {
      return { state: enterCooldown(sample.timestamp), action: 'stop' };
    }

    const portraitSince = sample.rightTilted ? null : (state.portraitSince ?? sample.timestamp);
    if (
      portraitSince !== null &&
      sample.timestamp - portraitSince >= RAISE_TO_SPEAK_PORTRAIT_HOLD_MS
    ) {
      return { state: enterCooldown(sample.timestamp), action: 'stop' };
    }

    return { state: { ...state, portraitSince }, action: 'none' };
  }

  const rightTiltedSince = sample.rightTilted ? (state.rightTiltedSince ?? sample.timestamp) : null;
  if (
    rightTiltedSince !== null &&
    sample.timestamp - rightTiltedSince >= RAISE_TO_SPEAK_RIGHT_TILT_HOLD_MS
  ) {
    return {
      state: {
        ...state,
        phase: 'listening',
        rightTiltedSince,
        portraitSince: null,
        listeningStartedAt: sample.timestamp,
      },
      action: 'start',
    };
  }

  return { state: { ...state, rightTiltedSince }, action: 'none' };
}
