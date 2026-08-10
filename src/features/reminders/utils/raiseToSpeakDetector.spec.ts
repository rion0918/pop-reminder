import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createRaiseToSpeakDetectorState,
  reduceRaiseToSpeakDetector,
} from './raiseToSpeakDetector';

function sample(
  timestamp: number,
  overrides: Partial<{
    upwardAcceleration: number;
    motionAcceleration: number;
    rotationRate: number;
    orientation: number;
    near: boolean;
    speakingPose: boolean;
  }> = {},
) {
  return {
    timestamp,
    upwardAcceleration: 0,
    motionAcceleration: 0,
    rotationRate: 0,
    orientation: 0,
    near: false,
    speakingPose: false,
    ...overrides,
  };
}

test('raise-to-speak starts only after a stable near signal follows a valid lift', () => {
  let state = createRaiseToSpeakDetectorState();

  ({ state } = reduceRaiseToSpeakDetector(state, sample(0, { upwardAcceleration: 1.3 })));
  assert.equal(state.phase, 'armed');

  let result = reduceRaiseToSpeakDetector(state, sample(500, { near: true }));
  state = result.state;
  assert.equal(result.action, 'none');

  result = reduceRaiseToSpeakDetector(state, sample(700, { near: true }));
  assert.equal(result.action, 'start');
  assert.equal(result.state.phase, 'listening');
});

test('proximity alone and motion alone never start listening', () => {
  let state = createRaiseToSpeakDetectorState();

  let result = reduceRaiseToSpeakDetector(state, sample(0, { near: true }));
  state = result.state;
  result = reduceRaiseToSpeakDetector(state, sample(500, { near: true }));
  assert.equal(result.action, 'none');
  assert.equal(result.state.phase, 'idle');

  state = createRaiseToSpeakDetectorState();
  ({ state } = reduceRaiseToSpeakDetector(state, sample(0, { upwardAcceleration: 1.3 })));
  result = reduceRaiseToSpeakDetector(state, sample(1_201));
  assert.equal(result.action, 'none');
  assert.equal(result.state.phase, 'idle');
});

test('raise-to-speak starts from a stable speaking pose when bottom-up use leaves proximity far', () => {
  let state = createRaiseToSpeakDetectorState();

  ({ state } = reduceRaiseToSpeakDetector(state, sample(0, { motionAcceleration: 1.3 })));
  assert.equal(state.phase, 'armed');

  let result = reduceRaiseToSpeakDetector(state, sample(300, { speakingPose: true }));
  state = result.state;
  assert.equal(result.action, 'none');

  result = reduceRaiseToSpeakDetector(state, sample(650, { speakingPose: true }));
  assert.equal(result.action, 'start');
  assert.equal(result.state.phase, 'listening');
  assert.equal(result.state.activation, 'pose');
});

test('pose-triggered listening stops after the phone is lowered away from speaking pose', () => {
  let state = createRaiseToSpeakDetectorState();
  ({ state } = reduceRaiseToSpeakDetector(state, sample(0, { motionAcceleration: 1.3 })));
  ({ state } = reduceRaiseToSpeakDetector(state, sample(200, { speakingPose: true })));
  ({ state } = reduceRaiseToSpeakDetector(state, sample(550, { speakingPose: true })));

  let result = reduceRaiseToSpeakDetector(state, sample(800, { speakingPose: false }));
  state = result.state;
  assert.equal(result.action, 'none');

  result = reduceRaiseToSpeakDetector(state, sample(1_150, { speakingPose: false }));
  assert.equal(result.action, 'stop');
  assert.equal(result.state.phase, 'cooldown');
});

test('unstable proximity and excessive rotation cancel the pending trigger', () => {
  let state = createRaiseToSpeakDetectorState();

  ({ state } = reduceRaiseToSpeakDetector(state, sample(0, { upwardAcceleration: 1.3 })));
  ({ state } = reduceRaiseToSpeakDetector(state, sample(300, { near: true })));
  ({ state } = reduceRaiseToSpeakDetector(state, sample(400, { near: false })));

  const bounced = reduceRaiseToSpeakDetector(state, sample(500, { near: true }));
  assert.equal(bounced.action, 'none');

  const rotating = reduceRaiseToSpeakDetector(
    bounced.state,
    sample(700, { near: true, rotationRate: 46 }),
  );
  assert.equal(rotating.action, 'none');
});

test('lowering stops listening after hysteresis and cooldown prevents duplicate starts', () => {
  let state = createRaiseToSpeakDetectorState();
  ({ state } = reduceRaiseToSpeakDetector(state, sample(0, { upwardAcceleration: 1.3 })));
  ({ state } = reduceRaiseToSpeakDetector(state, sample(100, { near: true })));
  ({ state } = reduceRaiseToSpeakDetector(state, sample(300, { near: true })));

  let result = reduceRaiseToSpeakDetector(state, sample(500, { near: false }));
  state = result.state;
  assert.equal(result.action, 'none');

  result = reduceRaiseToSpeakDetector(state, sample(850, { near: false }));
  state = result.state;
  assert.equal(result.action, 'stop');
  assert.equal(state.phase, 'cooldown');

  result = reduceRaiseToSpeakDetector(state, sample(900, { upwardAcceleration: 2, near: true }));
  assert.equal(result.action, 'none');
  assert.equal(result.state.phase, 'cooldown');

  result = reduceRaiseToSpeakDetector(result.state, sample(2_350, { near: false }));
  assert.equal(result.state.phase, 'idle');
});

test('listening stops at the safety timeout and reset drops all pending state', () => {
  let state = createRaiseToSpeakDetectorState();
  ({ state } = reduceRaiseToSpeakDetector(state, sample(0, { upwardAcceleration: 1.3 })));
  ({ state } = reduceRaiseToSpeakDetector(state, sample(100, { near: true })));
  ({ state } = reduceRaiseToSpeakDetector(state, sample(300, { near: true })));

  const result = reduceRaiseToSpeakDetector(state, sample(30_300, { near: true }));
  assert.equal(result.action, 'stop');
  assert.equal(result.state.phase, 'cooldown');

  assert.deepEqual(createRaiseToSpeakDetectorState(), {
    phase: 'idle',
    liftDetectedAt: null,
    nearSince: null,
    speakingPoseSince: null,
    farSince: null,
    listeningStartedAt: null,
    cooldownUntil: null,
    activation: null,
  });
});
