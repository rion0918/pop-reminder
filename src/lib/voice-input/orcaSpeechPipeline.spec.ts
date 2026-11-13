import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  encodePcmToWav,
  findQuietSplitIndex,
  REMINDER_CONTEXTUAL_STRINGS,
  removeJapaneseFillerWords,
  trimSilenceWithPreroll,
} from './orcaSpeechPipeline';

test('removeJapaneseFillerWords strips elongated and delimited Japanese fillers without damaging normal words', () => {
  assert.equal(removeJapaneseFillerWords('えーっと、明日の15時に歯医者'), '明日の15時に歯医者');
  assert.equal(
    removeJapaneseFillerWords('あのー明日の午前9時にゴミ出し'),
    '明日の午前9時にゴミ出し',
  );
  assert.equal(
    removeJapaneseFillerWords('うーん、やっぱり明後日に買い物、えーと'),
    'やっぱり明後日に買い物',
  );
  assert.equal(removeJapaneseFillerWords('運動する'), '運動する');
  assert.equal(removeJapaneseFillerWords('ええとこの寿司を買う'), 'ええとこの寿司を買う');
});

test('findQuietSplitIndex chooses the lowest-energy window near the chunk boundary', () => {
  const sampleRate = 100;
  // 35 seconds at 100Hz = 3500 samples; quiet region at 27.0s..27.5s (2700..2750)
  const samples = new Float32Array(3_500).fill(0.5);
  for (let i = 2_700; i < 2_750; i += 1) {
    samples[i] = 0.001;
  }

  const splitIndex = findQuietSplitIndex(samples, sampleRate, 30, 5, 0.1);
  assert.ok(splitIndex >= 2_700 && splitIndex <= 2_750, `Expected quiet split, got ${splitIndex}`);
});

test('trimSilenceWithPreroll keeps pre-roll and post-roll around active speech', () => {
  const sampleRate = 1_000;
  // 2s total: 0..800ms silence, 800..1100ms speech, 1100..2000ms silence
  const samples = new Float32Array(2_000).fill(0);
  for (let i = 800; i < 1_100; i += 1) {
    samples[i] = 0.25;
  }

  const trimmed = trimSilenceWithPreroll(samples, sampleRate, {
    frameMs: 20,
    prerollMs: 400,
    postrollMs: 600,
  });

  // 800 - 400 = 400 start; 1100 + 600 = 1700 end -> 1300 samples
  assert.equal(trimmed.length, 1_300);
});

test('encodePcmToWav produces a valid 16-bit mono RIFF WAVE header and payload', () => {
  const wav = encodePcmToWav([0, 1, -1], 16_000);
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);

  assert.equal(wav.byteLength, 44 + 6);
  assert.equal(String.fromCharCode(...wav.slice(0, 4)), 'RIFF');
  assert.equal(String.fromCharCode(...wav.slice(8, 12)), 'WAVE');
  assert.equal(view.getUint32(24, true), 16_000);
  assert.equal(view.getInt16(44, true), 0);
  assert.equal(view.getInt16(46, true), 32_767);
  assert.equal(view.getInt16(48, true), -32_768);
  assert.ok(REMINDER_CONTEXTUAL_STRINGS.includes('明日'));
});
