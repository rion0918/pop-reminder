export const RAISE_TO_SPEAK_UPDATE_INTERVAL_MS = 50;
export const RAISE_TO_SPEAK_SIDE_TILT_HOLD_MS = 200;
export const RAISE_TO_SPEAK_PORTRAIT_HOLD_MS = 350;
export const RAISE_TO_SPEAK_COOLDOWN_MS = 1_500;
export const RAISE_TO_SPEAK_MAX_LISTENING_MS = 30_000;

const SIDE_TILT_ANGLE_DEGREES = 40;
const SIDE_TILT_UPRIGHT_PLANE_RATIO = 0.7;
const MIN_GRAVITY_MAGNITUDE = 0.5;
const MAX_GRAVITY_MAGNITUDE = 20;

type RaiseToSpeakPhase = 'idle' | 'listening' | 'cooldown';

export type RaiseToSpeakDetectorState = {
  phase: RaiseToSpeakPhase;
  sideTiltedSince: number | null;
  portraitSince: number | null;
  listeningStartedAt: number | null;
  cooldownUntil: number | null;
};

export type RaiseToSpeakSample = {
  timestamp: number;
  sideTilted: boolean;
};

export type RaiseToSpeakAction = 'none' | 'start' | 'stop';

export type SideTiltMeasurement = {
  sideTilted: boolean;
  progress: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function isValidGravityVector(
  gravity: { x: number; y: number; z: number } | null | undefined,
): gravity is { x: number; y: number; z: number } {
  if (
    !gravity ||
    !Number.isFinite(gravity.x) ||
    !Number.isFinite(gravity.y) ||
    !Number.isFinite(gravity.z)
  ) {
    return false;
  }

  const magnitude = Math.sqrt(gravity.x ** 2 + gravity.y ** 2 + gravity.z ** 2);
  return (
    Number.isFinite(magnitude) &&
    magnitude >= MIN_GRAVITY_MAGNITUDE &&
    magnitude <= MAX_GRAVITY_MAGNITUDE
  );
}

export function getSideTiltMeasurement(
  gravity: { x: number; y: number; z: number } | null | undefined,
): SideTiltMeasurement {
  if (!isValidGravityVector(gravity)) return { sideTilted: false, progress: 0 };

  const magnitude = Math.sqrt(gravity.x ** 2 + gravity.y ** 2 + gravity.z ** 2);

  const uprightPlaneMagnitude = Math.sqrt(gravity.x ** 2 + gravity.y ** 2);
  const uprightPlaneRatio = uprightPlaneMagnitude / magnitude;
  if (!Number.isFinite(uprightPlaneRatio) || uprightPlaneRatio < SIDE_TILT_UPRIGHT_PLANE_RATIO) {
    return { sideTilted: false, progress: 0 };
  }

  const rollAngleDegrees = (Math.atan2(Math.abs(gravity.x), Math.abs(gravity.y)) * 180) / Math.PI;
  const signedRollAngleDegrees = (Math.atan2(gravity.x, Math.abs(gravity.y)) * 180) / Math.PI;
  const progress = clamp(signedRollAngleDegrees / SIDE_TILT_ANGLE_DEGREES, -1, 1);

  return {
    sideTilted: rollAngleDegrees >= SIDE_TILT_ANGLE_DEGREES,
    progress,
  };
}

export function isSideTiltedVoicePose(
  gravity: { x: number; y: number; z: number } | null | undefined,
) {
  return getSideTiltMeasurement(gravity).sideTilted;
}

export function createRaiseToSpeakDetectorState(): RaiseToSpeakDetectorState {
  return {
    phase: 'idle',
    sideTiltedSince: null,
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
      !sample.sideTilted
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

    const portraitSince = sample.sideTilted ? null : (state.portraitSince ?? sample.timestamp);
    if (
      portraitSince !== null &&
      sample.timestamp - portraitSince >= RAISE_TO_SPEAK_PORTRAIT_HOLD_MS
    ) {
      return { state: enterCooldown(sample.timestamp), action: 'stop' };
    }

    return { state: { ...state, portraitSince }, action: 'none' };
  }

  const sideTiltedSince = sample.sideTilted ? (state.sideTiltedSince ?? sample.timestamp) : null;
  if (
    sideTiltedSince !== null &&
    sample.timestamp - sideTiltedSince >= RAISE_TO_SPEAK_SIDE_TILT_HOLD_MS
  ) {
    return {
      state: {
        ...state,
        phase: 'listening',
        sideTiltedSince,
        portraitSince: null,
        listeningStartedAt: sample.timestamp,
      },
      action: 'start',
    };
  }

  return { state: { ...state, sideTiltedSince }, action: 'none' };
}
