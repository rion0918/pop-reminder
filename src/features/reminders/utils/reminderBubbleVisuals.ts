export type ReminderBubbleTypography = {
  titleFontSize: number;
  titleLineCount: number;
  titleLineHeight: number;
  titleMinFontScale: number;
  titleAdjustsFontSizeToFit: boolean;
  titleEllipsizeMode: 'clip';
  timeFontSize: number;
  timeMarginTop: number;
  bubblePadding: number;
};

export type ReminderBubbleDimensions = {
  width: number;
  height: number;
  collisionSize: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getReminderTitleVisualLength(title: string) {
  return Array.from(title.trim()).reduce((length, character) => {
    if (character.trim().length === 0) {
      return length + 0.35;
    }

    return length + (character.charCodeAt(0) <= 0x007f ? 0.62 : 1);
  }, 0);
}

function getTitleBucket(titleVisualLength: number) {
  if (titleVisualLength <= 4) return 'short';
  if (titleVisualLength <= 12) return 'medium';
  if (titleVisualLength <= 24) return 'long';
  return 'veryLong';
}

export function getReminderBubbleDimensions(
  titleVisualLength: number,
  boardWidth: number,
  boardHeight: number,
  measuredTitleHeight?: number,
): ReminderBubbleDimensions {
  const bucket = getTitleBucket(titleVisualLength);
  const baseSize =
    bucket === 'short' ? 96 : bucket === 'medium' ? 112 : bucket === 'long' ? 128 : 148;
  const titleFontSize = bucket === 'short' ? 20 : bucket === 'medium' ? 18 : 16;
  const titleLineHeight = titleFontSize + 4;
  const titleLineCount =
    bucket === 'short' ? 1 : bucket === 'medium' ? 2 : bucket === 'long' ? 4 : 5;
  const measuredTextHeight = measuredTitleHeight ?? titleLineHeight * titleLineCount;
  const contentHeight = measuredTextHeight + 36 + 6 + 20;
  const edgeClearance = Math.min(boardWidth, boardHeight) * 0.055;
  const height = Math.round(
    clamp(
      Math.max(baseSize, contentHeight),
      88,
      Math.max(88, Math.min(boardHeight - edgeClearance * 2, 180)),
    ),
  );
  const aspectRatio =
    bucket === 'short' || bucket === 'medium' ? 1 : bucket === 'long' ? 1.1 : 1.15;
  const widthHint =
    bucket === 'short' ? 80 : bucket === 'medium' ? 112 : bucket === 'long' ? 128 : 148;
  const width = Math.round(
    clamp(
      Math.max(widthHint, height * aspectRatio),
      Math.min(88, boardWidth),
      Math.max(Math.min(boardWidth - edgeClearance * 2, 180), Math.min(88, boardWidth)),
    ),
  );

  return {
    width,
    height,
    collisionSize: Math.max(width, height),
  };
}

export function getReminderBubbleTypography(
  width: number,
  height: number,
  titleVisualLength: number,
): ReminderBubbleTypography {
  const isShortTitle = titleVisualLength <= 4;
  const isMediumTitle = titleVisualLength <= 12;
  const isLongTitle = titleVisualLength > 24;
  const titleLineCount = isShortTitle ? 1 : isMediumTitle ? 2 : isLongTitle ? 5 : 4;
  const titleFontSize = isShortTitle ? 20 : isMediumTitle ? 18 : 16;
  const timeFontSize = 12;
  const baseBubblePadding = clamp(Math.min(height, width) * 0.1, 10, 14);

  return {
    titleFontSize: Math.round(titleFontSize),
    titleLineCount,
    titleLineHeight: titleFontSize + 4,
    titleMinFontScale: 1,
    titleAdjustsFontSizeToFit: false,
    titleEllipsizeMode: 'clip',
    timeFontSize,
    timeMarginTop: 6,
    bubblePadding: Math.round(baseBubblePadding),
  };
}
