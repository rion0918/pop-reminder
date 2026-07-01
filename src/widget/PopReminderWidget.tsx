import React from 'react';
import {
  FlexWidget,
  OverlapWidget,
  SvgWidget,
  TextWidget,
  type ColorProp,
} from 'react-native-android-widget';

import { formatReminderBubbleDateTime } from '../features/reminders/utils/reminderDateFormat';
import { bubbleDueColors } from '../constants/colors';
import {
  getWidgetDueColor,
  homeVisualTokens,
  type WidgetDueColor,
  widgetTheme,
} from './widgetColors';
import {
  getWidgetBubbleCapacity,
  getWidgetBubbleLayouts,
  getWidgetTitleVisualLength,
  WIDGET_DUE_LEGEND_HEIGHT,
  WIDGET_PLUS_TOUCH_HEIGHT,
  WIDGET_PLUS_TOUCH_WIDTH,
  WIDGET_SURFACE_PADDING,
  type WidgetBubbleLayout,
} from './widgetBubbleLayout';

type WidgetReminder = {
  id: string;
  title: string;
  targetAt: string;
};

type PopReminderWidgetProps = {
  reminders: WidgetReminder[];
  widgetWidth?: number;
  widgetHeight?: number;
};

type SvgPaint = {
  hex: string;
  opacity: number;
};

type WidgetBubbleTypography = {
  titleFontSize: number;
  titleLineCount: number;
  titleAdjustsFontSizeToFit: boolean;
  timeFontSize: number;
  timeMarginTop: number;
  bubblePadding: number;
};

type WidgetIdleMotionConfig = {
  delay: number;
  duration: number;
  amplitudeX: number;
  amplitudeY: number;
  rotateDeg: number;
};

type WidgetMotionFrame = {
  translateX: number;
  translateY: number;
  rotation: number;
};

const WIDGET_DEFAULT_WIDTH = 250;
const WIDGET_DEFAULT_HEIGHT = 180;
const WIDGET_DUE_LEGEND_BUBBLE_SIZE = 14;

const WIDGET_DUE_LEGEND_ITEMS = [
  { id: 'today', label: '今日', color: bubbleDueColors.today },
  { id: 'tomorrow', label: '明日', color: bubbleDueColors.tomorrow },
  { id: 'soon', label: '2-3日', color: bubbleDueColors.soon },
  { id: 'later', label: '4日+', color: bubbleDueColors.later },
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

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toHex(value: number) {
  return Math.round(clamp(value, 0, 255))
    .toString(16)
    .padStart(2, '0');
}

function colorToSvgPaint(color: string): SvgPaint {
  if (color.startsWith('#')) {
    const hex = color.substring(1);

    if (hex.length === 8) {
      return {
        hex: `#${hex.substring(0, 6)}`,
        opacity: parseInt(hex.substring(6), 16) / 255,
      };
    }

    return {
      hex: color,
      opacity: 1,
    };
  }

  const rgba = color.match(
    /^rgba\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)$/,
  );

  if (!rgba) {
    return {
      hex: '#ffffff',
      opacity: 1,
    };
  }

  return {
    hex: `#${toHex(Number(rgba[1]))}${toHex(Number(rgba[2]))}${toHex(Number(rgba[3]))}`,
    opacity: clamp(Number(rgba[4]), 0, 1),
  };
}

function svgFill(color: string, opacityScale = 1) {
  const paint = colorToSvgPaint(color);
  const opacity = clamp(paint.opacity * opacityScale, 0, 1);

  return `fill="${paint.hex}" fill-opacity="${opacity.toFixed(3)}"`;
}

function svgStroke(color: string, opacityScale = 1) {
  const paint = colorToSvgPaint(color);
  const opacity = clamp(paint.opacity * opacityScale, 0, 1);

  return `stroke="${paint.hex}" stroke-opacity="${opacity.toFixed(3)}"`;
}

function getWidgetBubbleTypography(
  width: number,
  height: number,
  titleVisualLength: number,
): WidgetBubbleTypography {
  const isShortTitle = titleVisualLength <= 8;
  const isMediumTitle = titleVisualLength <= 16;
  const isLongTitle = titleVisualLength > 24;
  const textMeasure = Math.min(height, width / 1.45);
  const titleLineCount = isShortTitle ? 1 : isMediumTitle ? 2 : isLongTitle ? 4 : 3;
  const titleFontSize = isShortTitle
    ? clamp(textMeasure * 0.17, 13, 20)
    : isMediumTitle
      ? clamp(textMeasure * 0.135, 12, 17)
      : isLongTitle
        ? clamp(textMeasure * 0.086, 9, 12)
        : clamp(textMeasure * 0.112, 10, 15);
  const timeFontSize = isShortTitle
    ? clamp(textMeasure * 0.102, 10, 13)
    : isLongTitle
      ? clamp(textMeasure * 0.074, 8, 10)
      : clamp(textMeasure * 0.088, 9, 11);
  const baseBubblePadding = clamp(textMeasure * 0.13, 8, 16);

  return {
    titleFontSize: Math.round(titleFontSize),
    titleLineCount,
    titleAdjustsFontSizeToFit: !isShortTitle,
    timeFontSize: Math.round(timeFontSize),
    timeMarginTop: isShortTitle ? Math.round(clamp(textMeasure * 0.04, 3, 6)) : isLongTitle ? 1 : 3,
    bubblePadding: Math.round(
      isShortTitle ? baseBubblePadding : Math.max(7, baseBubblePadding - (isLongTitle ? 4 : 2)),
    ),
  };
}

function makeWidgetIdleMotionConfig(id: string, index: number): WidgetIdleMotionConfig {
  const seed = hashString(`${id}-${index}`);

  return {
    delay: Math.round(unitFromHash(seed, 1) * 1200),
    duration: Math.round(4600 + unitFromHash(seed, 2) * 2600),
    amplitudeX: unitFromHash(seed, 3) * 2.4,
    amplitudeY: 2.2 + unitFromHash(seed, 4) * 2.2,
    rotateDeg: 1 + unitFromHash(seed, 5) * 1.4,
  };
}

function getWidgetMotionFrame(id: string, index: number, renderedAtMs: number): WidgetMotionFrame {
  const motion = makeWidgetIdleMotionConfig(id, index);
  const elapsed = renderedAtMs - motion.delay;
  const wrappedElapsed = ((elapsed % motion.duration) + motion.duration) % motion.duration;
  const phase = wrappedElapsed / motion.duration;

  return {
    translateX: Math.round(Math.sin(phase * Math.PI * 2) * motion.amplitudeX),
    translateY: Math.round(Math.cos(phase * Math.PI * 2) * motion.amplitudeY),
    rotation: Math.round(Math.sin(phase * Math.PI * 2) * motion.rotateDeg),
  };
}

function makeBubbleSvg(id: string, width: number, height: number, color: WidgetDueColor) {
  const svgId = escapeXml(id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'bubble');
  const gradientMist = colorToSvgPaint(color.gradient[2]);
  const bottomShade = colorToSvgPaint('rgba(84,91,132,0.07)');
  const innerGlass = colorToSvgPaint('rgba(255,255,255,0.26)');
  const outerGlassRing = svgStroke('rgba(255,255,255,0.58)');
  const innerColorRim = svgStroke(color.border, homeVisualTokens.bubbleInnerColorRimOpacity);
  const highlightLarge = svgFill('rgba(255,255,255,0.7)');
  const highlightSmall = svgFill('rgba(255,255,255,0.62)');
  const tintMist = svgFill(color.background, homeVisualTokens.bubbleTintMistOpacity);
  const stretch = width === height ? 'xMidYMid meet' : 'none';

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 100 100" preserveAspectRatio="${stretch}">
  <defs>
    <linearGradient id="${svgId}-surface" x1="16%" y1="8%" x2="86%" y2="96%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.78"/>
      <stop offset="52%" stop-color="${gradientMist.hex}" stop-opacity="${gradientMist.opacity.toFixed(3)}"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.08"/>
    </linearGradient>
    <linearGradient id="${svgId}-glass" x1="10%" y1="4%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.30"/>
      <stop offset="52%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#27304c" stop-opacity="0.07"/>
    </linearGradient>
  </defs>
  <rect id="bubbleSurface" x="1.4" y="1.4" width="97.2" height="97.2" rx="48.6" ${svgFill('rgba(255,255,255,0.18)')} ${svgStroke('rgba(255,255,255,0.72)')} stroke-width="1.2"/>
  <rect x="0" y="0" width="100" height="100" rx="50" fill="url(#${svgId}-surface)"/>
  <rect x="0" y="0" width="100" height="100" rx="50" fill="url(#${svgId}-glass)"/>
  <ellipse id="tintMist" cx="50" cy="50" rx="34" ry="30" ${tintMist}/>
  <ellipse id="lowerDepth" cx="69" cy="72" rx="37" ry="29" fill="${bottomShade.hex}" fill-opacity="${(bottomShade.opacity * 0.44).toFixed(3)}"/>
  <ellipse id="centerGlow" cx="49" cy="47" rx="33" ry="29" ${svgFill('rgba(255,255,255,0.18)')}/>
  <rect id="outerGlassRing" x="2.4" y="2.4" width="95.2" height="95.2" rx="47.6" fill="none" ${outerGlassRing} stroke-width="2"/>
  <rect id="innerGlassRing" x="6" y="6" width="88" height="88" rx="44" fill="none" stroke="${innerGlass.hex}" stroke-opacity="${innerGlass.opacity.toFixed(3)}" stroke-width="0.9"/>
  <path id="leftLightArc" d="M19 73 C7 48 13 18 42 10" fill="none" ${svgStroke('rgba(255,255,255,0.68)')} stroke-width="2.4" stroke-linecap="round"/>
  <path id="innerColorRim" d="M76 21 C91 42 87 72 63 86" fill="none" ${innerColorRim} stroke-width="2.2" stroke-linecap="round"/>
  <ellipse id="highlightLarge" cx="32" cy="21" rx="17" ry="8.5" ${highlightLarge} transform="rotate(-28 32 21)"/>
  <circle id="highlightSmall" cx="61" cy="19" r="7" ${highlightSmall}/>
  <circle id="highlightTiny" cx="66" cy="28" r="3" ${svgFill('rgba(255,255,255,0.52)')}/>
  <path id="topLightArc" d="M23 24 C39 14 63 13 79 24" fill="none" ${svgStroke('rgba(255,255,255,0.48)')} stroke-width="2" stroke-linecap="round"/>
  <path id="bottomReflection" d="M27 77 C41 85 61 85 75 77" fill="none" ${svgStroke('rgba(255,255,255,0.22)')} stroke-width="1" stroke-linecap="round"/>
</svg>`;
}

function makeCloudSurfaceSvg(width: number, height: number) {
  const surface = colorToSvgPaint(widgetTheme.cloudSurfaceBackground);
  const highlight = colorToSvgPaint(widgetTheme.cloudMistHighlight);
  const shade = colorToSvgPaint(widgetTheme.cloudMistShade);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
  <defs>
    <radialGradient id="cloudHighlightLeft" cx="16%" cy="18%" r="66%">
      <stop offset="0%" stop-color="${highlight.hex}" stop-opacity="${(highlight.opacity * 0.95).toFixed(3)}"/>
      <stop offset="56%" stop-color="${highlight.hex}" stop-opacity="${(highlight.opacity * 0.42).toFixed(3)}"/>
      <stop offset="100%" stop-color="${highlight.hex}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cloudHighlightBottom" cx="44%" cy="96%" r="58%">
      <stop offset="0%" stop-color="${highlight.hex}" stop-opacity="${(highlight.opacity * 0.86).toFixed(3)}"/>
      <stop offset="62%" stop-color="${highlight.hex}" stop-opacity="${(highlight.opacity * 0.24).toFixed(3)}"/>
      <stop offset="100%" stop-color="${highlight.hex}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cloudShadeTop" cx="6%" cy="8%" r="48%">
      <stop offset="0%" stop-color="${shade.hex}" stop-opacity="${(shade.opacity * 1.2).toFixed(3)}"/>
      <stop offset="52%" stop-color="${shade.hex}" stop-opacity="${(shade.opacity * 0.42).toFixed(3)}"/>
      <stop offset="100%" stop-color="${shade.hex}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cloudShadeBottom" cx="86%" cy="98%" r="54%">
      <stop offset="0%" stop-color="${shade.hex}" stop-opacity="${(shade.opacity * 1.15).toFixed(3)}"/>
      <stop offset="58%" stop-color="${shade.hex}" stop-opacity="${(shade.opacity * 0.36).toFixed(3)}"/>
      <stop offset="100%" stop-color="${shade.hex}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" fill="${surface.hex}" fill-opacity="${surface.opacity.toFixed(3)}"/>
  <ellipse cx="${width * 0.14}" cy="${height * 0.2}" rx="${width * 0.54}" ry="${height * 0.46}" fill="url(#cloudHighlightLeft)"/>
  <ellipse cx="${width * 0.4}" cy="${height * 0.96}" rx="${width * 0.6}" ry="${height * 0.34}" fill="url(#cloudHighlightBottom)"/>
  <ellipse cx="${width * 0.04}" cy="${height * 0.08}" rx="${width * 0.38}" ry="${height * 0.36}" fill="url(#cloudShadeTop)"/>
  <ellipse cx="${width * 0.84}" cy="${height * 1.02}" rx="${width * 0.44}" ry="${height * 0.28}" fill="url(#cloudShadeBottom)"/>
</svg>`;
}

function makeLegendBubbleSvg(id: string, color: WidgetDueColor) {
  const svgId = `legend-${id}`;
  const gradientMist = colorToSvgPaint(color.gradient[2]);
  const tintMist = svgFill(color.background, 0.9);
  const outerRing = svgStroke('rgba(255,255,255,0.72)');
  const colorRing = svgStroke(color.border, 0.78);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDGET_DUE_LEGEND_BUBBLE_SIZE}" height="${WIDGET_DUE_LEGEND_BUBBLE_SIZE}" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="${svgId}-surface" x1="12%" y1="8%" x2="88%" y2="96%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.82"/>
      <stop offset="58%" stop-color="${gradientMist.hex}" stop-opacity="${gradientMist.opacity.toFixed(3)}"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.12"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#${svgId}-surface)"/>
  <circle cx="50" cy="50" r="36" ${tintMist}/>
  <circle cx="50" cy="50" r="47" fill="none" ${outerRing} stroke-width="6"/>
  <path d="M76 23 C90 43 86 72 62 86" fill="none" ${colorRing} stroke-width="8" stroke-linecap="round"/>
  <ellipse cx="34" cy="25" rx="16" ry="8" ${svgFill('rgba(255,255,255,0.72)')} transform="rotate(-28 34 25)"/>
</svg>`;
}

function WidgetDueLegend({
  widgetWidth,
  widgetHeight,
}: {
  widgetWidth: number;
  widgetHeight: number;
}) {
  const legendWidth = Math.max(0, widgetWidth - WIDGET_SURFACE_PADDING * 2);

  return (
    <FlexWidget
      style={{
        width: legendWidth,
        height: WIDGET_DUE_LEGEND_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginTop: Math.max(0, widgetHeight - WIDGET_SURFACE_PADDING - WIDGET_DUE_LEGEND_HEIGHT),
        marginLeft: WIDGET_SURFACE_PADDING,
      }}
    >
      {WIDGET_DUE_LEGEND_ITEMS.map((item) => (
        <FlexWidget
          key={item.id}
          style={{
            flex: 1,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SvgWidget
            svg={makeLegendBubbleSvg(item.id, item.color)}
            style={{
              width: WIDGET_DUE_LEGEND_BUBBLE_SIZE,
              height: WIDGET_DUE_LEGEND_BUBBLE_SIZE,
            }}
          />
          <TextWidget
            text={item.label}
            style={{
              fontSize: 9,
              fontWeight: '900',
              color: widgetTheme.mutedText as ColorProp,
              textAlign: 'center',
              marginTop: 2,
              textShadowColor: widgetTheme.textHalo as ColorProp,
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 5,
            }}
            maxLines={1}
            allowFontScaling={false}
          />
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

function BubbleItem({
  reminder,
  index,
  layout,
  renderedAtMs,
}: {
  reminder: WidgetReminder;
  index: number;
  layout: WidgetBubbleLayout;
  renderedAtMs: number;
}) {
  const color = getWidgetDueColor(reminder.targetAt);
  const titleVisualLength = getWidgetTitleVisualLength(reminder.title);
  const typography = getWidgetBubbleTypography(layout.width, layout.height, titleVisualLength);
  const timeText = formatReminderBubbleDateTime(reminder.targetAt);
  const motionFrame = getWidgetMotionFrame(reminder.id, index, renderedAtMs);

  return (
    <OverlapWidget
      style={{
        width: layout.width,
        height: layout.height,
        borderRadius: Math.round(Math.min(layout.width, layout.height) / 2),
        overflow: 'hidden',
        marginTop: layout.top + motionFrame.translateY,
        marginLeft: layout.left + motionFrame.translateX,
        rotation: motionFrame.rotation,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: `popreminder://?action=view&id=${reminder.id}` }}
    >
      <SvgWidget
        svg={makeBubbleSvg(reminder.id, layout.width, layout.height, color)}
        style={{
          width: 'match_parent',
          height: 'match_parent',
        }}
      />
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 'match_parent',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: typography.bubblePadding,
        }}
      >
        <TextWidget
          text={reminder.title}
          style={{
            fontSize: typography.titleFontSize,
            fontWeight: '800',
            color: color.accent as ColorProp,
            textAlign: 'center',
            textShadowColor: 'rgba(255,255,255,0.58)' as ColorProp,
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 8,
            adjustsFontSizeToFit: typography.titleAdjustsFontSizeToFit,
          }}
          maxLines={typography.titleLineCount}
          allowFontScaling={false}
        />
        <TextWidget
          text={timeText}
          style={{
            fontSize: typography.timeFontSize,
            fontWeight: '800',
            color: 'rgba(38,49,81,0.76)' as ColorProp,
            textAlign: 'center',
            marginTop: typography.timeMarginTop,
            textShadowColor: 'rgba(255,255,255,0.62)' as ColorProp,
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 7,
            adjustsFontSizeToFit: true,
          }}
          maxLines={1}
          truncate="END"
          allowFontScaling={false}
        />
      </FlexWidget>
    </OverlapWidget>
  );
}

function OverflowBubble({
  count,
  layout,
  renderedAtMs,
}: {
  count: number;
  layout: WidgetBubbleLayout;
  renderedAtMs: number;
}) {
  const color = getWidgetDueColor(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const radius = Math.round(Math.min(layout.width, layout.height) / 2);
  const motionFrame = getWidgetMotionFrame(`overflow-${count}`, count, renderedAtMs);

  return (
    <OverlapWidget
      style={{
        width: layout.width,
        height: layout.height,
        borderRadius: radius,
        overflow: 'hidden',
        marginTop: layout.top + motionFrame.translateY,
        marginLeft: layout.left + motionFrame.translateX,
        rotation: motionFrame.rotation,
      }}
      clickAction="OPEN_APP"
    >
      <SvgWidget
        svg={makeBubbleSvg(`overflow-${count}`, layout.width, layout.height, color)}
        style={{
          width: 'match_parent',
          height: 'match_parent',
        }}
      />
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 'match_parent',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 10,
        }}
      >
        <TextWidget
          text={`+${count}`}
          style={{
            fontSize: 18,
            fontWeight: '900',
            color: widgetTheme.headerText as ColorProp,
            textAlign: 'center',
            textShadowColor: 'rgba(255,255,255,0.58)' as ColorProp,
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 8,
          }}
          allowFontScaling={false}
        />
        <TextWidget
          text="ほか"
          style={{
            fontSize: 10,
            fontWeight: '800',
            color: widgetTheme.mutedText as ColorProp,
            textAlign: 'center',
            marginTop: 1,
          }}
          allowFontScaling={false}
        />
      </FlexWidget>
    </OverlapWidget>
  );
}

function EmptyState({ renderedAtMs }: { renderedAtMs: number }) {
  const color = getWidgetDueColor(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const motionFrame = getWidgetMotionFrame('empty-state', 0, renderedAtMs);

  return (
    <FlexWidget
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
      }}
    >
      <OverlapWidget
        style={{
          width: 118,
          height: 92,
          borderRadius: 46,
          overflow: 'hidden',
          marginTop: motionFrame.translateY,
          marginLeft: motionFrame.translateX,
          rotation: motionFrame.rotation,
        }}
      >
        <SvgWidget
          svg={makeBubbleSvg('empty-state', 118, 92, color)}
          style={{
            width: 'match_parent',
            height: 'match_parent',
          }}
        />
        <FlexWidget
          style={{
            width: 'match_parent',
            height: 'match_parent',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 14,
          }}
        >
          <TextWidget
            text="まだ泡はひとつも浮いていません"
            style={{
              fontSize: 11,
              fontWeight: '800',
              color: widgetTheme.headerText as ColorProp,
              textAlign: 'center',
              textShadowColor: 'rgba(255,255,255,0.58)' as ColorProp,
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 8,
              adjustsFontSizeToFit: true,
            }}
            maxLines={3}
            allowFontScaling={false}
          />
        </FlexWidget>
      </OverlapWidget>
    </FlexWidget>
  );
}

export function PopReminderWidget({
  reminders,
  widgetWidth = WIDGET_DEFAULT_WIDTH,
  widgetHeight = WIDGET_DEFAULT_HEIGHT,
}: PopReminderWidgetProps) {
  const visibleCapacity = getWidgetBubbleCapacity(widgetWidth, widgetHeight);
  const visibleReminderLimit =
    reminders.length > visibleCapacity ? Math.max(1, visibleCapacity - 1) : visibleCapacity;
  const visibleReminders = reminders.slice(0, visibleReminderLimit);
  const overflowCount = Math.max(0, reminders.length - visibleReminderLimit);
  const overflowReminder = {
    id: `overflow-${overflowCount}`,
    title: `+${overflowCount}`,
    targetAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  const layoutItems =
    overflowCount > 0 ? [...visibleReminders, overflowReminder] : visibleReminders;
  const bubbleLayouts = new Map(
    getWidgetBubbleLayouts(layoutItems, widgetWidth, widgetHeight).map((layout, index) => [
      layoutItems[index].id,
      layout,
    ]),
  );
  const hasBubbles = reminders.length > 0;
  const renderedAtMs = Date.now();

  return (
    <OverlapWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: widgetTheme.cloudSurfaceBackground as ColorProp,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: widgetTheme.cloudSurfaceBorder as ColorProp,
        overflow: 'hidden',
      }}
    >
      <SvgWidget
        svg={makeCloudSurfaceSvg(widgetWidth, widgetHeight)}
        style={{
          width: 'match_parent',
          height: 'match_parent',
        }}
      />
      {hasBubbles ? (
        <OverlapWidget
          style={{
            width: 'match_parent',
            height: 'match_parent',
          }}
        >
          {visibleReminders.map((reminder, index) => (
            <BubbleItem
              key={reminder.id}
              reminder={reminder}
              index={index}
              layout={bubbleLayouts.get(reminder.id)!}
              renderedAtMs={renderedAtMs}
            />
          ))}
          {overflowCount > 0 ? (
            <OverflowBubble
              count={overflowCount}
              layout={bubbleLayouts.get(overflowReminder.id)!}
              renderedAtMs={renderedAtMs}
            />
          ) : null}
        </OverlapWidget>
      ) : (
        <EmptyState renderedAtMs={renderedAtMs} />
      )}
      <WidgetDueLegend widgetWidth={widgetWidth} widgetHeight={widgetHeight} />
      <FlexWidget
        style={{
          width: WIDGET_PLUS_TOUCH_WIDTH,
          height: WIDGET_PLUS_TOUCH_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: WIDGET_SURFACE_PADDING,
          marginLeft: Math.max(0, widgetWidth - WIDGET_SURFACE_PADDING - WIDGET_PLUS_TOUCH_WIDTH),
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'popreminder://?action=add' }}
      >
        <TextWidget
          text="+"
          style={{
            fontSize: 30,
            fontWeight: '400',
            color: widgetTheme.plusIconText as ColorProp,
            textAlign: 'center',
            textShadowColor: widgetTheme.textHalo as ColorProp,
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 7,
          }}
          allowFontScaling={false}
        />
      </FlexWidget>
    </OverlapWidget>
  );
}
