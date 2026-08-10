import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createRaiseToSpeakDetectorState,
  isSideTiltedVoicePose,
  reduceRaiseToSpeakDetector,
} from './raiseToSpeakDetector';

function sample(timestamp: number, sideTilted = false) {
  return { timestamp, sideTilted };
}

test('either side tilt starts voice input after the orientation is briefly stable', () => {
  let state = createRaiseToSpeakDetectorState();

  let result = reduceRaiseToSpeakDetector(state, sample(0, true));
  state = result.state;
  assert.equal(result.action, 'none');

  result = reduceRaiseToSpeakDetector(state, sample(199, true));
  state = result.state;
  assert.equal(result.action, 'none');

  result = reduceRaiseToSpeakDetector(state, sample(200, true));
  assert.equal(result.action, 'start');
  assert.equal(result.state.phase, 'listening');
});

test('voice pose accepts left and right rotation symmetrically', () => {
  assert.equal(isSideTiltedVoicePose(undefined), false);
  assert.equal(isSideTiltedVoicePose({ x: 0, y: -9.8, z: 0 }), false);
  assert.equal(isSideTiltedVoicePose({ x: 7.2, y: -6.8, z: 0 }), true);
  assert.equal(isSideTiltedVoicePose({ x: 9.8, y: 0, z: 0 }), true);
  assert.equal(isSideTiltedVoicePose({ x: -7.2, y: -6.8, z: 0 }), true);
  assert.equal(isSideTiltedVoicePose({ x: -9.8, y: 0, z: 0 }), true);
  assert.equal(isSideTiltedVoicePose({ x: 7, y: 0, z: 8 }), false);
  assert.equal(isSideTiltedVoicePose({ x: 0, y: -7, z: -7 }), false);
  assert.equal(isSideTiltedVoicePose({ x: 0, y: 0, z: -9.8 }), false);
});

test('portrait and a brief side-tilt bounce never start voice input', () => {
  let state = createRaiseToSpeakDetectorState();

  ({ state } = reduceRaiseToSpeakDetector(state, sample(0, false)));
  let result = reduceRaiseToSpeakDetector(state, sample(500, false));
  assert.equal(result.action, 'none');
  assert.equal(result.state.phase, 'idle');

  state = createRaiseToSpeakDetectorState();
  ({ state } = reduceRaiseToSpeakDetector(state, sample(0, true)));
  ({ state } = reduceRaiseToSpeakDetector(state, sample(150, false)));
  ({ state } = reduceRaiseToSpeakDetector(state, sample(200, true)));
  result = reduceRaiseToSpeakDetector(state, sample(399, true));
  assert.equal(result.action, 'none');

  result = reduceRaiseToSpeakDetector(result.state, sample(400, true));
  assert.equal(result.action, 'start');
});

test('returning to portrait stops listening after hysteresis', () => {
  let state = createRaiseToSpeakDetectorState();
  ({ state } = reduceRaiseToSpeakDetector(state, sample(0, true)));
  ({ state } = reduceRaiseToSpeakDetector(state, sample(200, true)));

  let result = reduceRaiseToSpeakDetector(state, sample(500, false));
  state = result.state;
  assert.equal(result.action, 'none');

  result = reduceRaiseToSpeakDetector(state, sample(849, false));
  state = result.state;
  assert.equal(result.action, 'none');

  result = reduceRaiseToSpeakDetector(state, sample(850, false));
  assert.equal(result.action, 'stop');
  assert.equal(result.state.phase, 'cooldown');
});

test('cooldown prevents a duplicate start until the phone returns to portrait', () => {
  let state = createRaiseToSpeakDetectorState();
  ({ state } = reduceRaiseToSpeakDetector(state, sample(0, true)));
  ({ state } = reduceRaiseToSpeakDetector(state, sample(200, true)));
  ({ state } = reduceRaiseToSpeakDetector(state, sample(500, false)));
  ({ state } = reduceRaiseToSpeakDetector(state, sample(850, false)));

  let result = reduceRaiseToSpeakDetector(state, sample(2_350, true));
  state = result.state;
  assert.equal(result.action, 'none');
  assert.equal(state.phase, 'cooldown');

  result = reduceRaiseToSpeakDetector(state, sample(2_400, false));
  state = result.state;
  assert.equal(state.phase, 'idle');

  ({ state } = reduceRaiseToSpeakDetector(state, sample(2_500, true)));
  result = reduceRaiseToSpeakDetector(state, sample(2_700, true));
  assert.equal(result.action, 'start');
});

test('listening stops at the safety timeout and reset drops all pending state', () => {
  let state = createRaiseToSpeakDetectorState();
  ({ state } = reduceRaiseToSpeakDetector(state, sample(0, true)));
  ({ state } = reduceRaiseToSpeakDetector(state, sample(200, true)));

  const result = reduceRaiseToSpeakDetector(state, sample(30_200, true));
  assert.equal(result.action, 'stop');
  assert.equal(result.state.phase, 'cooldown');

  assert.deepEqual(createRaiseToSpeakDetectorState(), {
    phase: 'idle',
    sideTiltedSince: null,
    portraitSince: null,
    listeningStartedAt: null,
    cooldownUntil: null,
  });
});
