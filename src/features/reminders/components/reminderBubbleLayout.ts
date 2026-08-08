export const MAX_SOFT_OVERLAP_RATIO = 0.12;
export const MAX_DENSE_SOFT_OVERLAP_RATIO = 0.16;
export const MIN_EDGE_CLEARANCE = 18;

export const FLOATING_SLOTS = [
  { x: 0.5, y: 0.16 },
  { x: 0.18, y: 0.31 },
  { x: 0.82, y: 0.31 },
  { x: 0.34, y: 0.52 },
  { x: 0.17, y: 0.64 },
  { x: 0.82, y: 0.64 },
  { x: 0.48, y: 0.68 },
  { x: 0.68, y: 0.54 },
];

export const DENSE_FLOATING_SLOTS = [
  { x: 0.28, y: 0.15 },
  { x: 0.62, y: 0.15 },
  { x: 0.82, y: 0.28 },
  { x: 0.15, y: 0.32 },
  { x: 0.48, y: 0.34 },
  { x: 0.72, y: 0.43 },
  { x: 0.26, y: 0.52 },
  { x: 0.58, y: 0.58 },
  { x: 0.84, y: 0.64 },
  { x: 0.16, y: 0.66 },
  { x: 0.44, y: 0.68 },
  { x: 0.72, y: 0.68 },
  { x: 0.62, y: 0.66 },
];

export type BoardSize = {
  width: number;
  height: number;
};

export type BubbleVerticalLayoutMode = 'natural' | 'homeTimeline';

export type BubbleDimensions = {
  width: number;
  height: number;
  collisionSize: number;
};

export type PlacedBubble = {
  size: number;
  centerX: number;
  centerY: number;
};

export type LayoutSlot = {
  x: number;
  y: number;
  temporal: boolean;
  slotIndex: number;
};

export type FloatingItemLayout = {
  left: number;
  top: number;
  centerX: number;
  centerY: number;
};

type BoardSizeMeasurementOptions = {
  freezeLayout: boolean;
  contentModeChanged: boolean;
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function unitFromHash(seed: number, salt: number) {
  let hash = seed ^ Math.imul(salt + 1, 0x9e3779b9);
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295;
}

export function getEdgeClearance(boardSize: BoardSize) {
  return Math.round(
    clamp(Math.min(boardSize.width, boardSize.height) * 0.055, MIN_EDGE_CLEARANCE, 30),
  );
}

export function resolveBoardSizeMeasurement(
  current: BoardSize,
  measured: BoardSize,
  { freezeLayout, contentModeChanged }: BoardSizeMeasurementOptions,
) {
  if (current.width === measured.width && current.height === measured.height) {
    return current;
  }

  if (freezeLayout && current.width > 0 && current.height > 0 && !contentModeChanged) {
    return current;
  }

  return measured;
}

export function getTemporalYRatio(
  index: number,
  count: number,
  verticalLayoutMode: BubbleVerticalLayoutMode = 'natural',
) {
  if (verticalLayoutMode === 'homeTimeline') {
    if (count <= 1) {
      return 0.5;
    }

    const startY = Math.max(0.18, 0.35 - (count - 2) * 0.025);
    const endY = Math.min(0.68, 0.65 + (count - 2) * 0.01);
    const ratio = startY + (index / (count - 1)) * (endY - startY);

    return Math.round(ratio * 1000) / 1000;
  }

  if (count <= 1) {
    return 0.36;
  }

  const maxSpan = Math.min(0.48, 0.28 + (count - 2) * 0.04);
  const startY = 0.22 - Math.min(0.04, (count - 2) * 0.008);
  return startY + (index / (count - 1)) * maxSpan;
}

export function makeGridSlots(isDenseLayout: boolean): LayoutSlot[] {
  const columns = isDenseLayout ? 3 : 3;
  const rows = isDenseLayout ? 5 : 3;

  return Array.from({ length: columns * rows }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const rowProgress = rows <= 1 ? 0 : row / (rows - 1);
    const stagger = row % 2 === 0 ? -0.02 : 0.02;

    return {
      x: clamp((column + 0.5) / columns + stagger, 0.14, 0.86),
      y: clamp(0.14 + rowProgress * 0.54, 0.14, 0.68),
      temporal: isDenseLayout,
      slotIndex: index,
    };
  });
}

export function makeLayoutForItem(
  id: string,
  dimensions: BubbleDimensions,
  boardSize: BoardSize,
  placedBubbles: PlacedBubble[],
  preferredSlotIndex: number,
  temporalIndex: number,
  temporalCount: number,
  verticalLayoutMode: BubbleVerticalLayoutMode = 'natural',
): FloatingItemLayout {
  const seed = hashString(id);
  const { width, height, collisionSize } = dimensions;
  const edgeClearance = getEdgeClearance(boardSize);
  const maxLeft = Math.max(edgeClearance, boardSize.width - width - edgeClearance);
  const maxTop = Math.max(edgeClearance, boardSize.height - height - edgeClearance);
  const isDenseLayout = temporalCount > 7;
  const activeFloatingSlots = isDenseLayout ? DENSE_FLOATING_SLOTS : FLOATING_SLOTS;
  const preferredSlot = isDenseLayout
    ? temporalIndex % activeFloatingSlots.length
    : preferredSlotIndex % activeFloatingSlots.length;
  const temporalYRatio =
    isDenseLayout && verticalLayoutMode === 'natural'
      ? (activeFloatingSlots[preferredSlot]?.y ?? getTemporalYRatio(temporalIndex, temporalCount))
      : getTemporalYRatio(temporalIndex, temporalCount, verticalLayoutMode);
  const jitterRangeX = clamp(
    boardSize.width * (isDenseLayout ? 0.045 : 0.06),
    10,
    isDenseLayout ? 20 : 30,
  );
  const jitterRangeY =
    verticalLayoutMode === 'homeTimeline'
      ? 0
      : clamp(boardSize.height * (isDenseLayout ? 0.034 : 0.045), 9, isDenseLayout ? 18 : 26);
  const temporalLaneRatios = [0.5, 0.2, 0.8, 0.34, 0.66, 0.18, 0.82];
  const laneOffset = Math.floor(unitFromHash(seed, 80) * temporalLaneRatios.length);
  const temporalSlots = temporalLaneRatios.map((xRatio, index) => {
    const verticalNudge = verticalLayoutMode === 'homeTimeline' ? 0 : ((index % 3) - 1) * 0.025;

    return {
      x: temporalLaneRatios[(index + laneOffset) % temporalLaneRatios.length] ?? xRatio,
      y: clamp(temporalYRatio + verticalNudge, 0.14, 0.68),
      temporal: true,
      slotIndex: index,
    };
  });
  const gridSlots = makeGridSlots(isDenseLayout);
  const slotCandidates =
    verticalLayoutMode === 'homeTimeline'
      ? temporalSlots
      : isDenseLayout
        ? [
            ...DENSE_FLOATING_SLOTS.map((slot, index) => ({
              ...slot,
              temporal: true,
              slotIndex: index,
            })),
            ...gridSlots,
            ...FLOATING_SLOTS.map((slot, index) => ({
              ...slot,
              temporal: false,
              slotIndex: index,
            })),
          ]
        : [
            ...temporalSlots,
            ...FLOATING_SLOTS.map((slot, index) => ({
              ...slot,
              temporal: false,
              slotIndex: index,
            })),
            ...gridSlots,
          ];

  const bestLayout = slotCandidates.reduce<{
    score: number;
    left: number;
    top: number;
    centerX: number;
    centerY: number;
  } | null>((best, slot, slotIndex) => {
    const baseSlotIndex = slot.slotIndex % activeFloatingSlots.length;
    const distanceFromPreferred = Math.min(
      Math.abs(baseSlotIndex - preferredSlot),
      activeFloatingSlots.length - Math.abs(baseSlotIndex - preferredSlot),
    );
    const jitterX = (unitFromHash(seed, slotIndex + 30) - 0.5) * jitterRangeX;
    const jitterY = (unitFromHash(seed, slotIndex + 50) - 0.5) * jitterRangeY;
    const left = clamp(slot.x * boardSize.width - width / 2 + jitterX, edgeClearance, maxLeft);
    const top = clamp(slot.y * boardSize.height - height / 2 + jitterY, edgeClearance, maxTop);
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const overlapPenalty = placedBubbles.reduce((penalty, placed) => {
      const distance = Math.hypot(centerX - placed.centerX, centerY - placed.centerY);
      const radiusSum = (collisionSize + placed.size) / 2;
      const overlap = Math.max(0, radiusSum - distance);

      if (overlap <= 0) {
        return penalty;
      }

      const allowedOverlap =
        Math.min(collisionSize, placed.size) *
        (isDenseLayout ? MAX_DENSE_SOFT_OVERLAP_RATIO : MAX_SOFT_OVERLAP_RATIO);
      const excessOverlap = Math.max(0, overlap - allowedOverlap);
      const coverRiskDistance =
        Math.abs(collisionSize - placed.size) / 2 + Math.min(collisionSize, placed.size) * 0.28;
      const coverRiskPenalty = distance < coverRiskDistance ? 20000 : 0;
      const hardOverlapPenalty = excessOverlap > 0 ? 12000 : 0;

      return penalty + overlap * 2.4 + excessOverlap * 260 + hardOverlapPenalty + coverRiskPenalty;
    }, 0);
    const bottomBoundaryPenalty =
      centerY > boardSize.height * 0.66 ? ((centerY / boardSize.height - 0.66) * 10) ** 2 * 550 : 0;
    const lowerRightPenalty =
      centerX > boardSize.width * 0.64 && centerY > boardSize.height * 0.64
        ? isDenseLayout
          ? 320
          : 480
        : 0;
    const edgePenalty =
      top <= edgeClearance + 2 || left <= edgeClearance + 2 || left >= maxLeft - 2 ? 28 : 0;
    const temporalPenalty =
      Math.abs(centerY / boardSize.height - temporalYRatio) * (isDenseLayout ? 520 : 780);
    const floatingSlotPenalty = slot.temporal ? 0 : isDenseLayout ? 240 : 170;
    const score =
      distanceFromPreferred * 8 +
      unitFromHash(seed, slotIndex + 10) * 18 +
      overlapPenalty +
      bottomBoundaryPenalty +
      lowerRightPenalty +
      edgePenalty +
      temporalPenalty +
      floatingSlotPenalty;

    if (!best || score < best.score) {
      return {
        score,
        left,
        top,
        centerX,
        centerY,
      };
    }

    return best;
  }, null);

  const layout = bestLayout ?? {
    left: edgeClearance,
    top: edgeClearance,
    centerX: edgeClearance + width / 2,
    centerY: edgeClearance + height / 2,
    score: 0,
  };

  placedBubbles.push({
    size: collisionSize,
    centerX: layout.centerX,
    centerY: layout.centerY,
  });

  return layout;
}
