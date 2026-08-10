export const RAISE_TO_SPEAK_UPDATE_INTERVAL_MS = 50;
export const RAISE_TO_SPEAK_ACCELERATION_THRESHOLD = 0.9;
export const RAISE_TO_SPEAK_MAX_ROTATION_RATE = 45;
export const RAISE_TO_SPEAK_ARM_WINDOW_MS = 1_200;
export const RAISE_TO_SPEAK_NEAR_HOLD_MS = 200;
export const RAISE_TO_SPEAK_POSE_HOLD_MS = 300;
export const RAISE_TO_SPEAK_FAR_HOLD_MS = 350;
export const RAISE_TO_SPEAK_COOLDOWN_MS = 1_500;
export const RAISE_TO_SPEAK_MAX_LISTENING_MS = 30_000;

type RaiseToSpeakPhase = 'idle' | 'armed' | 'listening' | 'cooldown';
type RaiseToSpeakActivation = 'proximity' | 'pose';

export type RaiseToSpeakDetectorState = {
  phase: RaiseToSpeakPhase;
  liftDetectedAt: number | null;
  nearSince: number | null;
  speakingPoseSince: number | null;
  farSince: number | null;
  listeningStartedAt: number | null;
  cooldownUntil: number | null;
  activation: RaiseToSpeakActivation | null;
};

export type RaiseToSpeakSample = {
  timestamp: number;
  upwardAcceleration: number;
  motionAcceleration: number;
  rotationRate: number;
  orientation: number;
  near: boolean;
  speakingPose: boolean;
};

export type RaiseToSpeakAction = 'none' | 'start' | 'stop';

export function createRaiseToSpeakDetectorState(): RaiseToSpeakDetectorState {
  return {
    phase: 'idle',
    liftDetectedAt: null,
    nearSince: null,
    speakingPoseSince: null,
    farSince: null,
    listeningStartedAt: null,
    cooldownUntil: null,
    activation: null,
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
    if (state.cooldownUntil !== null && sample.timestamp >= state.cooldownUntil && !sample.near) {
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

    const remainsRaised = state.activation === 'proximity' ? sample.near : sample.speakingPose;
    const farSince = remainsRaised ? null : (state.farSince ?? sample.timestamp);
    if (farSince !== null && sample.timestamp - farSince >= RAISE_TO_SPEAK_FAR_HOLD_MS) {
      return { state: enterCooldown(sample.timestamp), action: 'stop' };
    }

    return { state: { ...state, farSince }, action: 'none' };
  }

  if (state.phase === 'armed') {
    if (
      state.liftDetectedAt === null ||
      sample.timestamp - state.liftDetectedAt > RAISE_TO_SPEAK_ARM_WINDOW_MS
    ) {
      return { state: createRaiseToSpeakDetectorState(), action: 'none' };
    }

    const nearSince = sample.near ? (state.nearSince ?? sample.timestamp) : null;
    const speakingPoseSince = sample.speakingPose
      ? (state.speakingPoseSince ?? sample.timestamp)
      : null;
    const isStableNear =
      nearSince !== null && sample.timestamp - nearSince >= RAISE_TO_SPEAK_NEAR_HOLD_MS;
    const isStableSpeakingPose =
      speakingPoseSince !== null &&
      sample.timestamp - speakingPoseSince >= RAISE_TO_SPEAK_POSE_HOLD_MS;

    if (
      (isStableNear || isStableSpeakingPose) &&
      sample.rotationRate <= RAISE_TO_SPEAK_MAX_ROTATION_RATE
    ) {
      return {
        state: {
          ...state,
          phase: 'listening',
          nearSince,
          speakingPoseSince,
          farSince: null,
          listeningStartedAt: sample.timestamp,
          activation: isStableNear ? 'proximity' : 'pose',
        },
        action: 'start',
      };
    }

    return { state: { ...state, nearSince, speakingPoseSince }, action: 'none' };
  }

  const motionAcceleration = Math.max(
    Math.abs(sample.upwardAcceleration),
    sample.motionAcceleration,
  );
  const isValidLift =
    sample.orientation === 0 && motionAcceleration >= RAISE_TO_SPEAK_ACCELERATION_THRESHOLD;

  if (!isValidLift) {
    return { state, action: 'none' };
  }

  return {
    state: {
      ...createRaiseToSpeakDetectorState(),
      phase: 'armed',
      liftDetectedAt: sample.timestamp,
      nearSince: sample.near ? sample.timestamp : null,
      speakingPoseSince: sample.speakingPose ? sample.timestamp : null,
    },
    action: 'none',
  };
}
