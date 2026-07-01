export type WidgetLayoutReminder = {
  id: string;
  title: string;
  targetAt?: string;
};

export type WidgetBubbleDimensions = {
  width: number;
  height: number;
};

export type WidgetBubbleLayout = WidgetBubbleDimensions & {
  left: number;
  top: number;
  zIndex: number;
};

type WidgetLayoutSlot = {
  x: number;
  y: number;
};

type PlacedWidgetBubble = {
  size: number;
  centerX: number;
  centerY: number;
};

type WidgetBubbleCandidate = WidgetBubbleDimensions & {
  left: number;
  top: number;
  centerX: number;
  centerY: number;
  score: number;
};

type WidgetRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export const WIDGET_SURFACE_PADDING = 12;
export const WIDGET_PLUS_TOUCH_WIDTH = 44;
export const WIDGET_PLUS_TOUCH_HEIGHT = 40;
export const WIDGET_MAX_VISIBLE_BUBBLES = 8;
export const WIDGET_DUE_LEGEND_HEIGHT = 42;

const WIDGET_LAYOUT_CANDIDATE_SLOTS: WidgetLayoutSlot[] = [
  { x: 0.14, y: 0.16 },
  { x: 0.82, y: 0.18 },
  { x: 0.18, y: 0.5 },
  { x: 0.76, y: 0.5 },
  { x: 0.38, y: 0.3 },
  { x: 0.28, y: 0.86 },
  { x: 0.7, y: 0.84 },
  { x: 0.52, y: 0.66 },
  { x: 0.5, y: 0.12 },
  { x: 0.92, y: 0.36 },
  { x: 0.08, y: 0.78 },
  { x: 0.62, y: 0.32 },
  { x: 0.9, y: 0.68 },
  { x: 0.36, y: 0.62 },
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

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

function getEdgePadding() {
  return WIDGET_SURFACE_PADDING + 4;
}

function getLegendReserve() {
  return WIDGET_DUE_LEGEND_HEIGHT + WIDGET_SURFACE_PADDING;
}

function getAddButtonRect(widgetWidth: number): WidgetRect {
  return {
    left: widgetWidth - WIDGET_SURFACE_PADDING - WIDGET_PLUS_TOUCH_WIDTH,
    top: WIDGET_SURFACE_PADDING,
    right: widgetWidth - WIDGET_SURFACE_PADDING,
    bottom: WIDGET_SURFACE_PADDING + WIDGET_PLUS_TOUCH_HEIGHT,
  };
}

function rectsIntersect(first: WidgetRect, second: WidgetRect) {
  return (
    first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top
  );
}

function getTitleVisualLength(title: string) {
  return Array.from(title.trim()).reduce((length, character) => {
    if (character.trim().length === 0) {
      return length + 0.35;
    }

    return length + (character.charCodeAt(0) <= 0x007f ? 0.62 : 1);
  }, 0);
}

export function getWidgetTitleVisualLength(title: string) {
  return getTitleVisualLength(title);
}

export function getWidgetBubbleDimensions(
  reminder: WidgetLayoutReminder,
  index: number,
  visibleCount: number,
  widgetWidth: number,
  widgetHeight: number,
): WidgetBubbleDimensions {
  const titleVisualLength = getTitleVisualLength(reminder.title);
  const areaMeasure = Math.sqrt(widgetWidth * widgetHeight);
  const densityScale =
    visibleCount <= 2 ? 1.06 : visibleCount <= 4 ? 1 : visibleCount <= 6 ? 0.9 : 0.82;
  const baseHeight = clamp(
    Math.min(widgetHeight * 0.38, widgetWidth * 0.3, areaMeasure * 0.42) * densityScale,
    56,
    98,
  );
  const indexScale = index === 0 ? 1 : index === 1 ? 0.96 : index === 2 ? 0.92 : 0.86;
  const titleScale = titleVisualLength >= 24 ? 1.08 : titleVisualLength >= 16 ? 1.02 : 1;
  const height = Math.round(clamp(baseHeight * indexScale * titleScale, 54, 100));
  const aspectRatio = titleVisualLength >= 24 ? 1.34 : titleVisualLength >= 16 ? 1.18 : 1;
  const maxWidth = clamp(widgetWidth * (visibleCount <= 3 ? 0.38 : 0.32), 62, 128);
  const width = Math.round(clamp(height * aspectRatio, 54, maxWidth));

  return {
    width,
    height,
  };
}

export function getWidgetBubbleCapacity(widgetWidth: number, widgetHeight: number) {
  const area = widgetWidth * widgetHeight;

  if (area < 38000) {
    return 2;
  }

  if (area < 62000) {
    return 3;
  }

  if (area < 90000) {
    return 5;
  }

  if (area < 125000) {
    return 6;
  }

  if (area < 165000) {
    return 7;
  }

  return WIDGET_MAX_VISIBLE_BUBBLES;
}

function getPreferredSlotDistance(slotIndex: number, preferredSlotIndex: number) {
  const directDistance = Math.abs(slotIndex - preferredSlotIndex);

  return Math.min(directDistance, WIDGET_LAYOUT_CANDIDATE_SLOTS.length - directDistance);
}

function getCenterBandPenalty(
  candidate: WidgetBubbleCandidate,
  widgetWidth: number,
  widgetHeight: number,
) {
  const centerXRatio = candidate.centerX / widgetWidth;
  const centerYRatio = candidate.centerY / widgetHeight;

  return centerXRatio >= 0.35 &&
    centerXRatio <= 0.65 &&
    centerYRatio >= 0.28 &&
    centerYRatio <= 0.72
    ? 140
    : 0;
}

function getOverlapPenalty(candidate: WidgetBubbleCandidate, placedBubbles: PlacedWidgetBubble[]) {
  const candidateSize = Math.max(candidate.width, candidate.height);

  return placedBubbles.reduce((penalty, placedBubble) => {
    const distance = Math.hypot(
      candidate.centerX - placedBubble.centerX,
      candidate.centerY - placedBubble.centerY,
    );
    const radiusSum = (candidateSize + placedBubble.size) / 2;
    const overlap = Math.max(0, radiusSum - distance);
    const minComfortableDistance = Math.min(candidateSize, placedBubble.size) * 0.72;
    const closeness = Math.max(0, minComfortableDistance - distance);

    return penalty + overlap * 240 + closeness * 80 + (overlap > 8 ? 5000 : 0);
  }, 0);
}

function makeCandidateLayout(
  slot: WidgetLayoutSlot,
  slotIndex: number,
  seed: number,
  dimensions: WidgetBubbleDimensions,
  widgetWidth: number,
  widgetHeight: number,
): WidgetBubbleCandidate {
  const edgePadding = getEdgePadding();
  const legendReserve = getLegendReserve();
  const maxLeft = Math.max(edgePadding, widgetWidth - edgePadding - dimensions.width);
  const maxTop = Math.max(
    edgePadding,
    widgetHeight - edgePadding - legendReserve - dimensions.height,
  );
  const jitterRangeX = clamp(widgetWidth * 0.11, 18, 44);
  const jitterRangeY = clamp(widgetHeight * 0.09, 14, 34);
  const jitterX = (unitFromHash(seed, slotIndex + 20) - 0.5) * jitterRangeX;
  const jitterY = (unitFromHash(seed, slotIndex + 60) - 0.5) * jitterRangeY;
  const layoutWidth = widgetWidth;
  const layoutHeight = Math.max(0, widgetHeight - legendReserve);
  const left = clamp(slot.x * layoutWidth - dimensions.width / 2 + jitterX, edgePadding, maxLeft);
  const top = clamp(slot.y * layoutHeight - dimensions.height / 2 + jitterY, edgePadding, maxTop);

  return {
    ...dimensions,
    left,
    top,
    centerX: left + dimensions.width / 2,
    centerY: top + dimensions.height / 2,
    score: 0,
  };
}

function makeWidgetBubbleLayout(
  reminder: WidgetLayoutReminder,
  index: number,
  visibleCount: number,
  widgetWidth: number,
  widgetHeight: number,
  placedBubbles: PlacedWidgetBubble[],
): WidgetBubbleLayout {
  const dimensions = getWidgetBubbleDimensions(
    reminder,
    index,
    visibleCount,
    widgetWidth,
    widgetHeight,
  );
  const seed = hashString(`${reminder.id}-${index}-${visibleCount}`);
  const preferredSlotIndex = (index * 3) % WIDGET_LAYOUT_CANDIDATE_SLOTS.length;
  const addButtonRect = getAddButtonRect(widgetWidth);
  const bestCandidate = WIDGET_LAYOUT_CANDIDATE_SLOTS.reduce<WidgetBubbleCandidate | null>(
    (best, slot, slotIndex) => {
      const candidate = makeCandidateLayout(
        slot,
        slotIndex,
        seed,
        dimensions,
        widgetWidth,
        widgetHeight,
      );
      const candidateRect = {
        left: candidate.left,
        top: candidate.top,
        right: candidate.left + candidate.width,
        bottom: candidate.top + candidate.height,
      };
      const addButtonPenalty = rectsIntersect(candidateRect, addButtonRect) ? 100000 : 0;
      const score =
        getPreferredSlotDistance(slotIndex, preferredSlotIndex) * 22 +
        unitFromHash(seed, slotIndex + 5) * 12 +
        getOverlapPenalty(candidate, placedBubbles) +
        getCenterBandPenalty(candidate, widgetWidth, widgetHeight) +
        addButtonPenalty;
      const scoredCandidate = {
        ...candidate,
        score,
      };

      if (!best || scoredCandidate.score < best.score) {
        return scoredCandidate;
      }

      return best;
    },
    null,
  );
  const layout =
    bestCandidate ??
    makeCandidateLayout(
      WIDGET_LAYOUT_CANDIDATE_SLOTS[0],
      0,
      seed,
      dimensions,
      widgetWidth,
      widgetHeight,
    );

  placedBubbles.push({
    size: Math.max(layout.width, layout.height),
    centerX: layout.centerX,
    centerY: layout.centerY,
  });

  return {
    width: layout.width,
    height: layout.height,
    left: Math.round(layout.left),
    top: Math.round(layout.top),
    zIndex: WIDGET_MAX_VISIBLE_BUBBLES - index,
  };
}

export function getWidgetBubbleLayout(
  reminder: WidgetLayoutReminder,
  index: number,
  visibleCount: number,
  widgetWidth: number,
  widgetHeight: number,
): WidgetBubbleLayout {
  return makeWidgetBubbleLayout(reminder, index, visibleCount, widgetWidth, widgetHeight, []);
}

export function getWidgetBubbleLayouts(
  reminders: WidgetLayoutReminder[],
  widgetWidth: number,
  widgetHeight: number,
): WidgetBubbleLayout[] {
  const placedBubbles: PlacedWidgetBubble[] = [];

  return reminders.map((reminder, index) =>
    makeWidgetBubbleLayout(
      reminder,
      index,
      reminders.length,
      widgetWidth,
      widgetHeight,
      placedBubbles,
    ),
  );
}
