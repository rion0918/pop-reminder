import {
  FlexWidget,
  OverlapWidget,
  SvgWidget,
  TextWidget,
  type ColorProp,
} from 'react-native-android-widget';

import { formatReminderBubbleDateTime } from '../features/reminders/utils/reminderDateFormat';
import {
  getReminderBubbleTypography,
  getReminderTitleVisualLength,
} from '../features/reminders/utils/reminderBubbleVisuals';
import {
  getWidgetDueColor,
  homeVisualTokens,
  type WidgetDueColor,
  widgetTheme,
} from './widgetColors';
import {
  getWidgetLayoutPlan,
  WIDGET_HEADER_HEIGHT,
  WIDGET_PLUS_TOUCH_HEIGHT,
  WIDGET_PLUS_TOUCH_WIDTH,
  WIDGET_SURFACE_PADDING,
  type WidgetBubbleLayout,
  type WidgetLayoutPlan,
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

const WIDGET_DEFAULT_WIDTH = 250;
const WIDGET_DEFAULT_HEIGHT = 180;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 100 100" preserveAspectRatio="none">
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

function makeFrostedGlassSurfaceSvg(width: number, height: number) {
  const surface = colorToSvgPaint(widgetTheme.cloudSurfaceBackground);
  const refractionA = colorToSvgPaint(widgetTheme.glassRefractionA);
  const refractionB = colorToSvgPaint(widgetTheme.glassRefractionB);
  const refractionC = colorToSvgPaint(widgetTheme.glassRefractionC);
  const innerShadow = colorToSvgPaint(widgetTheme.glassInnerShadow);
  const edgeHighlight = colorToSvgPaint(widgetTheme.glassEdgeHighlight);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
  <rect id="glassVeil" x="0" y="0" width="${width}" height="${height}" fill="${surface.hex}" fill-opacity="${surface.opacity.toFixed(3)}"/>
  <ellipse id="glassRefractionA" cx="${width * 0.16}" cy="${height * 0.2}" rx="${width * 0.62}" ry="${height * 0.5}" fill="${refractionA.hex}" fill-opacity="${(refractionA.opacity * 0.24).toFixed(3)}"/>
  <ellipse id="glassRefractionB" cx="${width * 0.82}" cy="${height * 0.34}" rx="${width * 0.58}" ry="${height * 0.52}" fill="${refractionB.hex}" fill-opacity="${(refractionB.opacity * 0.2).toFixed(3)}"/>
  <ellipse id="glassRefractionC" cx="${width * 0.48}" cy="${height * 1.02}" rx="${width * 0.7}" ry="${height * 0.38}" fill="${refractionC.hex}" fill-opacity="${(refractionC.opacity * 0.18).toFixed(3)}"/>
  <rect id="glassInnerShadow" x="1.2" y="1.2" width="${Math.max(0, width - 2.4)}" height="${Math.max(0, height - 2.4)}" rx="23" ry="23" fill="none" stroke="${innerShadow.hex}" stroke-opacity="${innerShadow.opacity.toFixed(3)}" stroke-width="1.4"/>
  <path id="glassTopEdge" d="M18 1.4 H ${Math.max(18, width - 18)}" fill="none" stroke="${edgeHighlight.hex}" stroke-opacity="${edgeHighlight.opacity.toFixed(3)}" stroke-width="2.4" stroke-linecap="round"/>
</svg>`;
}

function WidgetHeader() {
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: WIDGET_HEADER_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: WIDGET_SURFACE_PADDING,
        paddingRight: WIDGET_SURFACE_PADDING,
        marginTop: WIDGET_SURFACE_PADDING,
      }}
    >
      <TextWidget
        text="次の予定"
        style={{
          fontSize: 16,
          fontWeight: '900',
          color: widgetTheme.primaryText as ColorProp,
          textShadowColor: widgetTheme.textHalo as ColorProp,
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
        }}
        maxLines={1}
        allowFontScaling={false}
      />
      <FlexWidget
        style={{
          width: WIDGET_PLUS_TOUCH_WIDTH,
          height: WIDGET_PLUS_TOUCH_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 22,
          backgroundColor: widgetTheme.plusButtonBackground as ColorProp,
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'popreminder://?action=add' }}
      >
        <TextWidget
          text="＋ 追加"
          style={{
            fontSize: 14,
            fontWeight: '900',
            color: widgetTheme.plusButtonText as ColorProp,
            textAlign: 'center',
          }}
          maxLines={1}
          allowFontScaling={false}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

function WidgetReminderBubble({
  reminder,
  layout,
}: {
  reminder: WidgetReminder;
  layout: WidgetBubbleLayout;
}) {
  const color = getWidgetDueColor(reminder.targetAt);
  const timeText = formatReminderBubbleDateTime(reminder.targetAt);
  const titleVisualLength = getReminderTitleVisualLength(reminder.title);
  const typography = getReminderBubbleTypography(layout.width, layout.height, titleVisualLength);

  return (
    <OverlapWidget
      style={{
        width: layout.width,
        height: layout.height,
        borderRadius: Math.round(layout.width / 2),
        overflow: 'hidden',
        marginTop: layout.top,
        marginLeft: layout.left,
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
          allowFontScaling={false}
        />
      </FlexWidget>
    </OverlapWidget>
  );
}

function OverflowBubble({ count, layout }: { count: number; layout: WidgetBubbleLayout }) {
  const color = getWidgetDueColor(new Date());

  return (
    <OverlapWidget
      style={{
        width: layout.width,
        height: layout.height,
        borderRadius: Math.round(layout.width / 2),
        marginTop: layout.top,
        marginLeft: layout.left,
        overflow: 'hidden',
      }}
      clickAction="OPEN_APP"
    >
      <SvgWidget
        svg={makeBubbleSvg(`overflow-${count}`, layout.width, layout.height, color)}
        style={{ width: 'match_parent', height: 'match_parent' }}
      />
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 'match_parent',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 8,
        }}
      >
        <TextWidget
          text={`+${count}`}
          style={{
            fontSize: Math.max(14, Math.round(layout.width * 0.24)),
            fontWeight: '900',
            color: widgetTheme.primaryText as ColorProp,
            textAlign: 'center',
            textShadowColor: 'rgba(255,255,255,0.62)' as ColorProp,
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 7,
            adjustsFontSizeToFit: true,
          }}
          maxLines={1}
          allowFontScaling={false}
        />
      </FlexWidget>
    </OverlapWidget>
  );
}

function EmptyState({ contentBounds }: { contentBounds: WidgetLayoutPlan['contentBounds'] }) {
  return (
    <FlexWidget
      style={{
        width: contentBounds.width,
        height: contentBounds.height,
        alignItems: 'center',
        justifyContent: 'center',
        padding: WIDGET_SURFACE_PADDING,
        marginTop: contentBounds.top,
        marginLeft: contentBounds.left,
      }}
    >
      <TextWidget
        text="予定はありません"
        style={{
          fontSize: 16,
          fontWeight: '900',
          color: widgetTheme.primaryText as ColorProp,
          textAlign: 'center',
        }}
        maxLines={1}
        allowFontScaling={false}
      />
      <TextWidget
        text="＋から泡を浮かべよう"
        style={{
          fontSize: 12,
          fontWeight: '800',
          color: widgetTheme.secondaryText as ColorProp,
          textAlign: 'center',
          marginTop: 4,
        }}
        maxLines={1}
        allowFontScaling={false}
      />
    </FlexWidget>
  );
}

function ReminderContent({
  reminders,
  plan,
}: {
  reminders: WidgetReminder[];
  plan: WidgetLayoutPlan;
}) {
  const remindersById = new Map(reminders.map((reminder) => [reminder.id, reminder]));

  if (plan.reminderBubbles.length === 0) {
    return <EmptyState contentBounds={plan.contentBounds} />;
  }

  return (
    <OverlapWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
      }}
    >
      {plan.reminderBubbles.map((layout) => {
        const reminder = remindersById.get(layout.reminderId);

        return reminder ? (
          <WidgetReminderBubble key={reminder.id} reminder={reminder} layout={layout} />
        ) : null;
      })}
      {plan.overflowBubble ? (
        <OverflowBubble count={plan.overflowCount} layout={plan.overflowBubble} />
      ) : null}
    </OverlapWidget>
  );
}

export function PopReminderWidget({
  reminders,
  widgetWidth = WIDGET_DEFAULT_WIDTH,
  widgetHeight = WIDGET_DEFAULT_HEIGHT,
}: PopReminderWidgetProps) {
  const plan = getWidgetLayoutPlan(reminders, widgetWidth, widgetHeight);

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
        svg={makeFrostedGlassSurfaceSvg(widgetWidth, widgetHeight)}
        style={{
          width: 'match_parent',
          height: 'match_parent',
        }}
      />
      <WidgetHeader />
      <ReminderContent reminders={reminders} plan={plan} />
    </OverlapWidget>
  );
}
