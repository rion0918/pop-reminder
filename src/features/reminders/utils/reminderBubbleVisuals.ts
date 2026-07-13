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

export function getReminderBubbleTypography(
  width: number,
  height: number,
  titleVisualLength: number,
): ReminderBubbleTypography {
  const isShortTitle = titleVisualLength <= 8;
  const isMediumTitle = titleVisualLength <= 16;
  const isLongTitle = titleVisualLength > 24;
  const textMeasure = Math.min(height, width / 1.45);
  const titleLineCount = isShortTitle ? 1 : isMediumTitle ? 2 : isLongTitle ? 4 : 3;
  const titleFontSize = isShortTitle
    ? clamp(textMeasure * 0.16, 16, 24)
    : isMediumTitle
      ? clamp(textMeasure * 0.13, 14, 21)
      : isLongTitle
        ? clamp(textMeasure * 0.082, 11, 14)
        : clamp(textMeasure * 0.108, 13, 18);
  const timeFontSize = isShortTitle
    ? clamp(textMeasure * 0.095, 12, 16)
    : isLongTitle
      ? clamp(textMeasure * 0.072, 10, 12)
      : clamp(textMeasure * 0.085, 11, 14);
  const baseBubblePadding = clamp(textMeasure * 0.14, 12, 23);

  return {
    titleFontSize: Math.round(titleFontSize),
    titleLineCount,
    titleLineHeight: Math.round(titleFontSize + (isShortTitle ? 5 : isLongTitle ? 2 : 4)),
    titleMinFontScale: isShortTitle ? 1 : isLongTitle ? 0.72 : 0.9,
    titleAdjustsFontSizeToFit: !isShortTitle,
    titleEllipsizeMode: 'clip',
    timeFontSize: Math.round(timeFontSize),
    timeMarginTop: isShortTitle
      ? Math.round(clamp(textMeasure * 0.045, 5, 9))
      : isLongTitle
        ? 2
        : 4,
    bubblePadding: Math.round(
      isShortTitle ? baseBubblePadding : Math.max(10, baseBubblePadding - (isLongTitle ? 5 : 3)),
    ),
  };
}
