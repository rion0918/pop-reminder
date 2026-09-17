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

type BubbleLayoutItem = {
  id: string;
  dimensions: BubbleDimensions;
};

// Reserve space for the independent idle motion of adjacent bubbles.
const BUBBLE_MOTION_GAP = 10;

export function makeFittingBubbleLayout(
  items: readonly BubbleLayoutItem[],
  boardSize: BoardSize,
  verticalLayoutMode: BubbleVerticalLayoutMode,
): FloatingItemLayout[] | null {
  const horizontalInset = getEdgeClearance(boardSize);
  const verticalInset = getVerticalEdgeClearance(boardSize, verticalLayoutMode, items.length);
  const availableWidth = boardSize.width - horizontalInset * 2;
  const availableHeight = boardSize.height - verticalInset * 2;
  if (
    items.some(
      ({ dimensions }) => dimensions.width > availableWidth || dimensions.height > availableHeight,
    )
  ) {
    return null;
  }

  const placed: PlacedBubble[] = [];
  const preferred = items.map(({ id, dimensions }, index) =>
    makeLayoutForItem(
      id,
      dimensions,
      boardSize,
      placed,
      hashString(id) % 97,
      index,
      items.length,
      verticalLayoutMode,
    ),
  );
  const allowedOverlap = items.length > 7 ? MAX_DENSE_SOFT_OVERLAP_RATIO : MAX_SOFT_OVERLAP_RATIO;
  const fits = preferred.every((layout, index) => {
    if (
      verticalLayoutMode === 'homeTimeline' &&
      index > 0 &&
      layout.centerY < preferred[index - 1].centerY
    )
      return false;
    return preferred.slice(0, index).every((other, otherIndex) => {
      const size = items[index].dimensions.collisionSize;
      const otherSize = items[otherIndex].dimensions.collisionSize;
      const minimumDistance =
        (size + otherSize) / 2 - Math.min(size, otherSize) * allowedOverlap + BUBBLE_MOTION_GAP;
      return (
        Math.hypot(layout.centerX - other.centerX, layout.centerY - other.centerY) >=
        minimumDistance
      );
    });
  });
  if (fits) return preferred;

  // Find the shortest stack of rows while preserving reminder order. Each row
  // can use the full measured width, including on landscape and tablet boards.
  const heights = Array<number>(items.length + 1).fill(Number.POSITIVE_INFINITY);
  const rowStarts = Array<number>(items.length + 1).fill(0);
  heights[0] = 0;
  for (let end = 1; end <= items.length; end += 1) {
    let rowWidth = 0;
    let rowHeight = 0;
    for (let start = end - 1; start >= 0; start -= 1) {
      rowWidth += items[start].dimensions.width + (start < end - 1 ? BUBBLE_MOTION_GAP : 0);
      if (rowWidth > availableWidth) break;
      rowHeight = Math.max(rowHeight, items[start].dimensions.height);
      const height = heights[start] + rowHeight + (start > 0 ? BUBBLE_MOTION_GAP : 0);
      if (height < heights[end]) {
        heights[end] = height;
        rowStarts[end] = start;
      }
    }
  }
  if (heights[items.length] > availableHeight) return null;

  const rows: BubbleLayoutItem[][] = [];
  for (let end = items.length; end > 0; end = rowStarts[end]) {
    rows.unshift(items.slice(rowStarts[end], end));
  }
  // Use only spare space to break row/column alignment, so floating offsets
  // never reduce capacity or consume the gap reserved for idle motion.
  const spareHeight = availableHeight - heights[items.length];
  const verticalSpread = Math.min(32, spareHeight / Math.max(1, rows.length));
  const freeHeight = spareHeight - verticalSpread * rows.length;
  const rowGap = BUBBLE_MOTION_GAP + Math.min(24, freeHeight / Math.max(1, rows.length - 1));
  let top = verticalInset + (freeHeight - (rowGap - BUBBLE_MOTION_GAP) * (rows.length - 1)) / 2;
  return rows.flatMap((row) => {
    const rowHeight = Math.max(...row.map(({ dimensions }) => dimensions.height));
    const rowWidth =
      row.reduce((sum, { dimensions }) => sum + dimensions.width, 0) +
      BUBBLE_MOTION_GAP * (row.length - 1);
    const seed = hashString(row.map(({ id }) => id).join(':'));
    const reverseRow = unitFromHash(seed, 120) > 0.5;
    const gapWeights = Array.from(
      { length: row.length + 1 },
      (_, index) => 0.4 + unitFromHash(seed, index + 100),
    );
    const weightTotal = gapWeights.reduce((sum, weight) => sum + weight, 0);
    const freeWidth = availableWidth - rowWidth;
    let left = horizontalInset + (freeWidth * gapWeights[0]) / weightTotal;
    const layouts = row.map(({ id, dimensions }, index) => {
      const variation = unitFromHash(hashString(id), 110);
      const offsetY =
        verticalSpread *
        (verticalLayoutMode === 'homeTimeline'
          ? (index + 0.15 + variation * 0.7) / row.length
          : variation);
      const bubbleLeft = reverseRow ? boardSize.width - left - dimensions.width : left;
      const layout = {
        left: bubbleLeft,
        top: top + (rowHeight - dimensions.height) / 2 + offsetY,
        centerX: bubbleLeft + dimensions.width / 2,
        centerY: top + rowHeight / 2 + offsetY,
      };
      left +=
        dimensions.width + BUBBLE_MOTION_GAP + (freeWidth * gapWeights[index + 1]) / weightTotal;
      return layout;
    });
    top += rowHeight + verticalSpread + rowGap;
    return layouts;
  });
}

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

export function getVerticalEdgeClearance(
  boardSize: BoardSize,
  verticalLayoutMode: BubbleVerticalLayoutMode,
  temporalCount: number,
) {
  if (verticalLayoutMode === 'homeTimeline' && temporalCount >= 5) {
    return Math.round(clamp(Math.min(boardSize.width, boardSize.height) * 0.025, 6, 14));
  }

  return getEdgeClearance(boardSize);
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

    const baseStartY = Math.max(0.18, 0.35 - (count - 2) * 0.025);
    const baseEndY = Math.min(0.68, 0.65 + (count - 2) * 0.01);
    const fillProgress = clamp((count - 4) / 4, 0, 1);
    const startY = baseStartY * (1 - fillProgress);
    const endY = baseEndY + (1 - baseEndY) * fillProgress;
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
  const horizontalEdgeClearance = getEdgeClearance(boardSize);
  const verticalEdgeClearance = getVerticalEdgeClearance(
    boardSize,
    verticalLayoutMode,
    temporalCount,
  );
  const maxLeft = Math.max(
    horizontalEdgeClearance,
    boardSize.width - width - horizontalEdgeClearance,
  );
  const maxTop = Math.max(verticalEdgeClearance, boardSize.height - height - verticalEdgeClearance);
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
      y: clamp(
        temporalYRatio + verticalNudge,
        verticalLayoutMode === 'homeTimeline' ? 0 : 0.14,
        verticalLayoutMode === 'homeTimeline' ? 1 : 0.68,
      ),
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
    const left = clamp(
      slot.x * boardSize.width - width / 2 + jitterX,
      horizontalEdgeClearance,
      maxLeft,
    );
    const top = clamp(
      slot.y * boardSize.height - height / 2 + jitterY,
      verticalEdgeClearance,
      maxTop,
    );
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
      top <= verticalEdgeClearance + 2 || left <= horizontalEdgeClearance + 2 || left >= maxLeft - 2
        ? 28
        : 0;
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
    left: horizontalEdgeClearance,
    top: verticalEdgeClearance,
    centerX: horizontalEdgeClearance + width / 2,
    centerY: verticalEdgeClearance + height / 2,
    score: 0,
  };

  placedBubbles.push({
    size: collisionSize,
    centerX: layout.centerX,
    centerY: layout.centerY,
  });

  return layout;
}
