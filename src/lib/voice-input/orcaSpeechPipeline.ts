export const REMINDER_CONTEXTUAL_STRINGS: readonly string[] = [
  '今日',
  '明日',
  '明後日',
  '来週',
  '午前',
  '午後',
  '終日',
  '一日中',
  '30分後',
  '1時間後',
  'リマインド',
  '通知',
  '忘れないように',
  '買い物',
  '病院',
  '歯医者',
  '会議',
  '提出',
  '電話',
  '薬',
];

const ELONGATED_JA_FILLER = '(?:え[ーっ]+と|えっ+と|えー{2,}|あのー+|うー+ん|んー+)';
const DELIMITED_JA_FILLER = '(?:え[ーえっ]*と|えー+|あのー+|うー+ん|んー+)';
const PHRASE_BOUNDARY_PREFIX = '(?:^|(?<=[\\s,，、。！？!?…]))';
const PAUSE_SUFFIX = '(?:\\s*(?:[,，、…]|\\.{2,}))?\\s*';

const LEADING_ELONGATED_FILLER_REGEX = new RegExp(
  `${PHRASE_BOUNDARY_PREFIX}${ELONGATED_JA_FILLER}${PAUSE_SUFFIX}`,
  'gu',
);

const DELIMITED_FILLER_REGEX = new RegExp(
  `${PHRASE_BOUNDARY_PREFIX}${DELIMITED_JA_FILLER}(?=(?:\\s*[,，、。！？!?…]|\\s+|$))${PAUSE_SUFFIX}`,
  'gu',
);

/**
 * Removes Japanese conversational fillers (such as "えーっと", "あのー", "うーん")
 * and trailing pause punctuation using Orca's filler-removal rules adapted for
 * Japanese continuous text.
 */
export function removeJapaneseFillerWords(input: string): string {
  if (!input) return '';

  let current = input;
  for (let previous = ''; previous !== current;) {
    previous = current;
    current = current
      .replace(DELIMITED_FILLER_REGEX, '')
      .replace(LEADING_ELONGATED_FILLER_REGEX, '');
  }

  return current
    .replace(/^[\s,，、…]+/u, '')
    .replace(/[\s,，、]+$/u, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Finds the lowest-energy split index near the end of a PCM chunk, matching
 * Orca's `stt-offline-audio-chunker` algorithm so long recordings never split mid-word.
 */
export function findQuietSplitIndex(
  samples: ArrayLike<number>,
  sampleRate: number,
  chunkSeconds = 30,
  splitSearchSeconds = 5,
  energyWindowSeconds = 0.1,
): number {
  const chunkSampleLimit = Math.max(1, Math.round(chunkSeconds * sampleRate));
  const splitSearchSamples = Math.round(splitSearchSeconds * sampleRate);
  const energyWindowSamples = Math.max(1, Math.round(energyWindowSeconds * sampleRate));
  const limit = Math.min(chunkSampleLimit, samples.length);
  const searchStart = Math.max(0, limit - splitSearchSamples);
  const step = Math.max(1, Math.floor(energyWindowSamples / 2));

  let bestIndex = limit;
  let minEnergy = Number.POSITIVE_INFINITY;

  for (let start = searchStart; start + energyWindowSamples <= limit; start += step) {
    let energy = 0;
    for (let i = start; i < start + energyWindowSamples; i += 1) {
      const sample = samples[i];
      energy += sample * sample;
    }
    if (energy < minEnergy) {
      minEnergy = energy;
      bestIndex = start + Math.floor(energyWindowSamples / 2);
    }
  }

  return Math.max(1, bestIndex);
}

/**
 * Trims leading and trailing dead silence while preserving a pre-roll and post-roll
 * buffer (inspired by Orca's 0.4s VAD pre-roll and 0.6s pause window) so offline
 * STT engines do not clip initial consonants or hallucinate on long silence.
 */
export function trimSilenceWithPreroll(
  samples: ArrayLike<number>,
  sampleRate: number,
  options: {
    rmsThreshold?: number;
    frameMs?: number;
    prerollMs?: number;
    postrollMs?: number;
  } = {},
): number[] {
  const total = samples.length;
  if (total === 0 || sampleRate <= 0) return [];

  const { rmsThreshold = 0.008, frameMs = 20, prerollMs = 400, postrollMs = 600 } = options;
  const frameSamples = Math.max(1, Math.round((sampleRate * frameMs) / 1_000));
  const prerollSamples = Math.max(0, Math.round((sampleRate * prerollMs) / 1_000));
  const postrollSamples = Math.max(0, Math.round((sampleRate * postrollMs) / 1_000));
  const minEnergySquare = rmsThreshold * rmsThreshold;

  let firstActiveSample = -1;
  let lastActiveSample = -1;

  for (let offset = 0; offset < total; offset += frameSamples) {
    const end = Math.min(total, offset + frameSamples);
    let sumSquares = 0;
    for (let i = offset; i < end; i += 1) {
      const value = samples[i];
      sumSquares += value * value;
    }
    const meanSquare = sumSquares / (end - offset);
    if (meanSquare >= minEnergySquare) {
      if (firstActiveSample === -1) firstActiveSample = offset;
      lastActiveSample = end;
    }
  }

  if (firstActiveSample === -1 || lastActiveSample === -1) {
    return Array.from(samples);
  }

  const start = Math.max(0, firstActiveSample - prerollSamples);
  const end = Math.min(total, lastActiveSample + postrollSamples);
  const result = new Array<number>(end - start);
  for (let i = start; i < end; i += 1) {
    result[i - start] = samples[i];
  }
  return result;
}

/**
 * Encodes Float32/number PCM samples in [-1, 1] into a 16-bit mono RIFF WAVE byte array,
 * matching Orca's `rCn` WAV encoder for Whisper / OpenAI-compatible transcription endpoints.
 */
export function encodePcmToWav(samples: ArrayLike<number>, sampleRate = 16_000): Uint8Array {
  const dataByteLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  function writeAscii(offset: number, text: string) {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  }

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataByteLength, true);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const pcm16 = clamped < 0 ? clamped * 32_768 : clamped * 32_767;
    view.setInt16(44 + i * 2, Math.round(pcm16), true);
  }

  return new Uint8Array(buffer);
}
