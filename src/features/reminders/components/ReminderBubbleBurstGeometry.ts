export type BubbleBurstPoint = {
  x: number;
  y: number;
};

export type BubbleMembraneFragment = {
  id: string;
  points: [BubbleBurstPoint, BubbleBurstPoint, BubbleBurstPoint, BubbleBurstPoint];
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

function ellipsePoint(
  center: BubbleBurstPoint,
  radiusX: number,
  radiusY: number,
  angle: number,
  inset = 1,
): BubbleBurstPoint {
  return {
    x: center.x + Math.cos(angle) * radiusX * inset,
    y: center.y + Math.sin(angle) * radiusY * inset,
  };
}

export function createBubbleBurstGeometry(
  reminderId: string,
  bubbleWidth: number,
  bubbleHeight: number,
): BubbleBurstGeometry {
  const width = Math.max(1, bubbleWidth);
  const height = Math.max(1, bubbleHeight);
  const visualSize = Math.min(width, height);
  const overscan = visualSize * 0.72;
  const canvasWidth = width + overscan * 2;
  const canvasHeight = height + overscan * 2;
  const bubbleCenter = {
    x: overscan + width / 2,
    y: overscan + height / 2,
  };
  const radiusX = width / 2;
  const radiusY = height / 2;
  const seed = hashString(reminderId);
  const ruptureAngle = Math.PI * (1.08 + unitFromHash(seed, 1) * 0.84);
  const rupturePoint = ellipsePoint(
    bubbleCenter,
    radiusX,
    radiusY,
    ruptureAngle,
    0.68 + unitFromHash(seed, 2) * 0.14,
  );
  const membraneCount = 7 + Math.floor(unitFromHash(seed, 3) * 3);
  const membraneFragments = Array.from({ length: membraneCount }, (_, index) => {
    const startAngle =
      (Math.PI * 2 * index) / membraneCount + unitFromHash(seed, 10 + index) * 0.08;
    const span = (Math.PI * 2 * (0.7 + unitFromHash(seed, 30 + index) * 0.18)) / membraneCount;
    const outerStart = ellipsePoint(bubbleCenter, radiusX, radiusY, startAngle, 0.98);
    const outerEnd = ellipsePoint(bubbleCenter, radiusX, radiusY, startAngle + span, 0.98);
    const innerEnd = ellipsePoint(
      bubbleCenter,
      radiusX,
      radiusY,
      startAngle + span * 0.78,
      0.72 + unitFromHash(seed, 50 + index) * 0.09,
    );
    const innerStart = ellipsePoint(
      bubbleCenter,
      radiusX,
      radiusY,
      startAngle + span * 0.22,
      0.72 + unitFromHash(seed, 70 + index) * 0.09,
    );
    const middleAngle = startAngle + span / 2;
    const origin = ellipsePoint(bubbleCenter, radiusX, radiusY, middleAngle, 0.87);
    const travel = visualSize * (0.34 + unitFromHash(seed, 90 + index) * 0.4);
    const tangent = (unitFromHash(seed, 110 + index) - 0.5) * visualSize * 0.22;

    return {
      id: `${reminderId}-membrane-${index}`,
      points: [outerStart, outerEnd, innerEnd, innerStart],
      origin,
      travelX: Math.cos(middleAngle) * travel - Math.sin(middleAngle) * tangent,
      travelY: Math.sin(middleAngle) * travel + Math.cos(middleAngle) * tangent,
      rotation: (unitFromHash(seed, 130 + index) - 0.5) * 1.9,
      delay: 0.29 + unitFromHash(seed, 150 + index) * 0.11,
    } satisfies BubbleMembraneFragment;
  });
  const dropletCount = 12 + Math.floor(unitFromHash(seed, 4) * 7);
  const droplets = Array.from({ length: dropletCount }, (_, index) => {
    const angle = ruptureAngle - 1.3 + unitFromHash(seed, 200 + index) * 2.6;
    const originSpread = visualSize * unitFromHash(seed, 230 + index) * 0.08;
    const travel = visualSize * (0.34 + unitFromHash(seed, 260 + index) * 0.62);

    return {
      id: `${reminderId}-droplet-${index}`,
      origin: {
        x: rupturePoint.x + Math.cos(angle) * originSpread,
        y: rupturePoint.y + Math.sin(angle) * originSpread,
      },
      radius: visualSize * (0.012 + unitFromHash(seed, 290 + index) * 0.022),
      travelX: Math.cos(angle) * travel,
      travelY: Math.sin(angle) * travel,
      gravity: visualSize * (0.08 + unitFromHash(seed, 320 + index) * 0.16),
      delay: 0.29 + unitFromHash(seed, 350 + index) * 0.16,
    } satisfies BubbleBurstDroplet;
  });

  return {
    canvasWidth,
    canvasHeight,
    overscan,
    bubbleCenter,
    rupturePoint,
    membraneFragments,
    droplets,
  };
}
