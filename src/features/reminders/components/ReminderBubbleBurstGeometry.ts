export type BubbleBurstPoint = {
  x: number;
  y: number;
};

export type BubbleMembraneFragment = {
  id: string;
  points: [BubbleBurstPoint, BubbleBurstPoint, BubbleBurstPoint];
  origin: BubbleBurstPoint;
  travelX: number;
  travelY: number;
  rotation: number;
  delay: number;
};

export type BubbleBurstDroplet = {
  id: string;
  origin: BubbleBurstPoint;
  radius: number;
  travelX: number;
  travelY: number;
  gravity: number;
  delay: number;
};

export type BubbleBurstGeometry = {
  canvasWidth: number;
  canvasHeight: number;
  overscan: number;
  cornerRadius: number;
  maxHoleRadius: number;
  holePoints: BubbleBurstPoint[];
  bubbleCenter: BubbleBurstPoint;
  rupturePoint: BubbleBurstPoint;
  membraneFragments: BubbleMembraneFragment[];
  droplets: BubbleBurstDroplet[];
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

// Intersect a ray with the capsule used by borderRadius: min(width, height) / 2.
function outlinePoint(center: BubbleBurstPoint, width: number, height: number, angle: number) {
  const vertical = height > width;
  const dx = vertical ? Math.sin(angle) : Math.cos(angle);
  const dy = vertical ? Math.cos(angle) : Math.sin(angle);
  const radius = Math.max(0.1, Math.min(width, height) / 2 - 1);
  const straight = Math.abs(width - height) / 2;
  const flatDistance = radius / Math.max(0.00001, Math.abs(dy));
  const distance =
    Math.abs(flatDistance * dx) <= straight
      ? flatDistance
      : straight * Math.abs(dx) + Math.sqrt(Math.max(0, radius ** 2 - straight ** 2 * dy ** 2));
  return { x: center.x + Math.cos(angle) * distance, y: center.y + Math.sin(angle) * distance };
}

export function createBubbleBurstGeometry(
  reminderId: string,
  bubbleWidth: number,
  bubbleHeight: number,
): BubbleBurstGeometry {
  const width = Math.max(1, bubbleWidth);
  const height = Math.max(1, bubbleHeight);
  const visualSize = Math.min(width, height);
  const overscan = visualSize * 0.25 + 3;
  const bubbleCenter = { x: overscan + width / 2, y: overscan + height / 2 };
  const seed = hashString(reminderId);
  const ruptureAngle = Math.PI * (1.08 + unitFromHash(seed, 1) * 0.84);
  const rupturePoint = {
    x: bubbleCenter.x + Math.cos(ruptureAngle) * visualSize * 0.18,
    y: bubbleCenter.y + Math.sin(ruptureAngle) * visualSize * 0.18,
  };
  const maxHoleRadius =
    Math.hypot(
      width / 2 + Math.abs(rupturePoint.x - bubbleCenter.x),
      height / 2 + Math.abs(rupturePoint.y - bubbleCenter.y),
    ) * 1.08;
  const holePoints = Array.from({ length: 24 }, (_, index) => {
    const angle = (index / 24) * Math.PI * 2;
    const radius = 0.97 + unitFromHash(seed, 400 + index) * 0.06;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
  const membraneCount = 6 + Math.min(2, Math.floor(unitFromHash(seed, 3) * 3));
  const membraneFragments = Array.from({ length: membraneCount }, (_, index) => {
    const angle =
      (Math.PI * 2 * (index + 0.12 + unitFromHash(seed, 10 + index) * 0.12)) / membraneCount;
    const span = (Math.PI * 2 * (0.28 + unitFromHash(seed, 30 + index) * 0.16)) / membraneCount;
    const start = outlinePoint(bubbleCenter, width, height, angle);
    const end = outlinePoint(bubbleCenter, width, height, angle + span);
    const origin = outlinePoint(bubbleCenter, width, height, angle + span / 2);
    const control = {
      x: origin.x * 2 - (start.x + end.x) / 2,
      y: origin.y * 2 - (start.y + end.y) / 2,
    };
    const travel = visualSize * (0.03 + unitFromHash(seed, 90 + index) * 0.05);
    const arrival =
      55 + (75 * Math.hypot(origin.x - rupturePoint.x, origin.y - rupturePoint.y)) / maxHoleRadius;
    return {
      id: `${reminderId}-membrane-${index}`,
      points: [start, control, end],
      origin,
      travelX: Math.cos(angle + span / 2) * travel,
      travelY: Math.sin(angle + span / 2) * travel,
      rotation: (unitFromHash(seed, 130 + index) - 0.5) * 0.24,
      delay: Math.max(90, Math.min(130, arrival)) / 380,
    } satisfies BubbleMembraneFragment;
  });
  const dropletCount = 8 + Math.min(4, Math.floor(unitFromHash(seed, 4) * 5));
  const droplets = Array.from({ length: dropletCount }, (_, index) => {
    const angle = (Math.PI * 2 * (index + unitFromHash(seed, 200 + index) * 0.5)) / dropletCount;
    const origin = outlinePoint(bubbleCenter, width, height, angle);
    const travel = visualSize * (0.08 + unitFromHash(seed, 260 + index) * 0.12);
    const arrival =
      (75 * Math.hypot(origin.x - rupturePoint.x, origin.y - rupturePoint.y)) / maxHoleRadius;
    return {
      id: `${reminderId}-droplet-${index}`,
      origin,
      radius: 0.5 + unitFromHash(seed, 290 + index),
      travelX: Math.cos(angle) * travel,
      travelY: Math.sin(angle) * travel,
      gravity: visualSize * (0.01 + unitFromHash(seed, 320 + index) * 0.02),
      delay: Math.max(110, Math.min(180, 75 + arrival)) / 380,
    } satisfies BubbleBurstDroplet;
  });
  return {
    canvasWidth: width + overscan * 2,
    canvasHeight: height + overscan * 2,
    overscan,
    cornerRadius: visualSize / 2,
    maxHoleRadius,
    holePoints,
    bubbleCenter,
    rupturePoint,
    membraneFragments,
    droplets,
  };
}
