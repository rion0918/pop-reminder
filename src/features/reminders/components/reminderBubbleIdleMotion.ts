export type ReminderBubbleIdleMotionConfig = {
  delay: number;
  duration: number;
  amplitudeX: number;
  amplitudeY: number;
  rotateDeg: number;
};

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function unitFromHash(seed: number, salt: number) {
  let hash = seed ^ Math.imul(salt + 1, 0x9e3779b9);
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295;
}

export function makeReminderBubbleIdleMotionConfig(
  id: string,
  index: number,
): ReminderBubbleIdleMotionConfig {
  const seed = hashString(`${id}-${index}`);

  return {
    delay: Math.round(unitFromHash(seed, 1) * 1200),
    duration: Math.round(4600 + unitFromHash(seed, 2) * 2600),
    amplitudeX: unitFromHash(seed, 3) * 2.4,
    amplitudeY: 2.2 + unitFromHash(seed, 4) * 2.2,
    rotateDeg: 0.35 + unitFromHash(seed, 5) * 0.35,
  };
}
