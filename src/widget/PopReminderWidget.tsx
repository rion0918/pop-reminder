import {
  FlexWidget,
  OverlapWidget,
  SvgWidget,
  TextWidget,
  type ColorProp,
} from 'react-native-android-widget';

import type { AppTheme } from '../constants/colors';
import { formatReminderBubbleDateTime } from '../features/reminders/utils/reminderDateFormat';
import { getReminderDueColor } from '../features/reminders/utils/reminderDueColor';
import { getWidgetTheme, type WidgetThemeTokens } from './widgetColors';
import type { WidgetReminder } from './widgetReminderSnapshot';
import {
  getWidgetLayoutPlan,
  type WidgetDisplayMode,
  type WidgetLayoutPlan,
  type WidgetRect,
  type WidgetReminderLayout,
} from './widgetBubbleLayout';
import {
  getWidgetTypography,
  makeWidgetBackdropSvg,
  makeWidgetTrashSvg,
  WIDGET_DEFAULT_HEIGHT,
  WIDGET_DEFAULT_WIDTH,
  WIDGET_FONT_FAMILY,
  WIDGET_ROW_ACTION_SIZE,
} from './widgetVisuals';

type PopReminderWidgetProps = {
  reminders: WidgetReminder[];
  theme?: AppTheme;
  widgetWidth?: number;
  widgetHeight?: number;
};

export const WIDGET_DELETE_REMINDER_ACTION = 'DELETE_REMINDER';

function widgetGradient(gradient: {
  from: string;
  to: string;
  orientation: 'TL_BR' | 'TOP_BOTTOM';
}) {
  return {
    from: gradient.from as ColorProp,
    to: gradient.to as ColorProp,
    orientation: gradient.orientation,
  };
}

function WidgetHeader({
  layout,
  mode,
  totalCount,
  theme,
}: {
  layout: WidgetRect;
  mode: WidgetDisplayMode;
  totalCount: number;
  theme: WidgetThemeTokens;
}) {
  const typography = getWidgetTypography(mode);

  return (
    <FlexWidget
      style={{
        width: layout.width,
        height: layout.height,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: layout.top,
        marginLeft: layout.left,
      }}
    >
      <FlexWidget style={{ flex: 1, justifyContent: 'center' }}>
        <TextWidget
          text="ふわっと。"
          style={{
            fontFamily: WIDGET_FONT_FAMILY,
            fontSize: typography.headerFontSize,
            fontWeight: '900',
            letterSpacing: -0.02,
            color: theme.primaryText as ColorProp,
          }}
          maxLines={1}
          allowFontScaling={false}
        />
      </FlexWidget>
      <FlexWidget
        style={{
          width: mode === 'compact' ? 40 : 44,
          height: mode === 'compact' ? 22 : 24,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 8,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.heroBorder as ColorProp,
          backgroundColor: theme.countSurface as ColorProp,
        }}
      >
        <TextWidget
          text={`${totalCount}件`}
          style={{
            fontFamily: WIDGET_FONT_FAMILY,
            fontSize: typography.countFontSize,
            fontWeight: '800',
            color: theme.accent as ColorProp,
            textAlign: 'center',
          }}
          maxLines={1}
          allowFontScaling={false}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

function DueBubble({ size, reminder }: { size: number; reminder: WidgetReminder }) {
  const dueColor = getReminderDueColor(reminder.targetAt);
  const highlightSize = Math.max(3, Math.round(size * 0.24));

  return (
    <OverlapWidget style={{ width: size, height: size }}>
      <FlexWidget
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size / 2),
          borderWidth: 1,
          borderColor: dueColor.border as ColorProp,
          backgroundGradient: {
            from: dueColor.gradient[0] as ColorProp,
            to: dueColor.gradient[2] as ColorProp,
            orientation: 'TL_BR',
          },
        }}
      />
      <FlexWidget
        style={{
          width: highlightSize,
          height: highlightSize,
          marginTop: Math.round(size * 0.19),
          marginLeft: Math.round(size * 0.22),
          borderRadius: Math.round(highlightSize / 2),
          backgroundColor: 'rgba(255,255,255,0.76)' as ColorProp,
        }}
      />
    </OverlapWidget>
  );
}

function DeleteReminderButton({
  reminder,
  theme,
}: {
  reminder: WidgetReminder;
  theme: WidgetThemeTokens;
}) {
  return (
    <FlexWidget
      style={{
        width: WIDGET_ROW_ACTION_SIZE,
        height: WIDGET_ROW_ACTION_SIZE,
        marginLeft: 6,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Math.round(WIDGET_ROW_ACTION_SIZE / 2),
        borderWidth: 1,
        borderColor: theme.heroBorder as ColorProp,
        backgroundColor: theme.rowActionSurface as ColorProp,
      }}
      clickAction={WIDGET_DELETE_REMINDER_ACTION}
      clickActionData={{ id: reminder.id }}
      accessibilityLabel={`「${reminder.title}」を削除`}
    >
      <SvgWidget svg={makeWidgetTrashSvg(theme.secondaryText)} style={{ width: 16, height: 16 }} />
    </FlexWidget>
  );
}

function HeroReminder({
  reminder,
  layout,
  mode,
  theme,
}: {
  reminder: WidgetReminder;
  layout: WidgetReminderLayout;
  mode: WidgetDisplayMode;
  theme: WidgetThemeTokens;
}) {
  const typography = getWidgetTypography(mode);
  const timeText = formatReminderBubbleDateTime(reminder.targetAt);
  const radius = mode === 'compact' ? 22 : 26;

  return (
    <OverlapWidget
      style={{
        width: layout.width,
        height: layout.height,
        marginTop: layout.top,
        marginLeft: layout.left,
      }}
    >
      <FlexWidget
        style={{
          width: layout.width,
          height: Math.max(0, layout.height - 2),
          marginTop: 2,
          borderRadius: radius,
          backgroundColor: theme.heroShadow as ColorProp,
        }}
      />
      <FlexWidget
        style={{
          width: layout.width,
          height: layout.height,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: typography.heroHorizontalPadding,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: theme.heroBorder as ColorProp,
          backgroundGradient: widgetGradient(theme.heroGradient),
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: `popreminder://?action=view&id=${reminder.id}` }}
        accessibilityLabel={`${reminder.isExpired ? '期限済み' : '次のリマインド'}、${reminder.title}、${timeText}、詳細を開く`}
      >
        <DueBubble size={typography.heroBubbleSize} reminder={reminder} />
        <FlexWidget
          style={{
            flex: 1,
            marginLeft: 10,
            justifyContent: 'center',
          }}
        >
          <FlexWidget
            style={{
              width: 'match_parent',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <TextWidget
              text={reminder.isExpired ? '期限済み' : '次のリマインド'}
              style={{
                fontFamily: WIDGET_FONT_FAMILY,
                fontSize: typography.heroKickerFontSize,
                fontWeight: '800',
                color: theme.accent as ColorProp,
              }}
              maxLines={1}
              allowFontScaling={false}
            />
            <TextWidget
              text={timeText}
              style={{
                width: typography.timeWidth,
                fontFamily: WIDGET_FONT_FAMILY,
                fontSize: typography.heroTimeFontSize,
                fontWeight: '700',
                color: theme.secondaryText as ColorProp,
                textAlign: 'right',
                adjustsFontSizeToFit: true,
              }}
              maxLines={1}
              allowFontScaling={false}
            />
          </FlexWidget>
          <TextWidget
            text={reminder.title}
            style={{
              width: 'match_parent',
              marginTop: 2,
              fontFamily: WIDGET_FONT_FAMILY,
              fontSize: typography.heroTitleFontSize,
              fontWeight: '900',
              letterSpacing: -0.01,
              color: theme.primaryText as ColorProp,
              adjustsFontSizeToFit: true,
            }}
            truncate="END"
            maxLines={1}
            allowFontScaling={false}
          />
        </FlexWidget>
        <DeleteReminderButton reminder={reminder} theme={theme} />
      </FlexWidget>
    </OverlapWidget>
  );
}

function QueueReminderRow({
  reminder,
  layout,
  mode,
  theme,
}: {
  reminder: WidgetReminder;
  layout: WidgetReminderLayout;
  mode: WidgetDisplayMode;
  theme: WidgetThemeTokens;
}) {
  const typography = getWidgetTypography(mode);
  const timeText = formatReminderBubbleDateTime(reminder.targetAt);
  const radius = Math.round(layout.height / 2);

  return (
    <OverlapWidget
      style={{
        width: layout.width,
        height: layout.height,
        marginTop: layout.top,
        marginLeft: layout.left,
      }}
    >
      <FlexWidget
        style={{
          width: layout.width,
          height: Math.max(0, layout.height - 2),
          marginTop: 2,
          borderRadius: radius,
          backgroundColor: theme.queueShadow as ColorProp,
        }}
      />
      <FlexWidget
        style={{
          width: layout.width,
          height: layout.height,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: typography.queueHorizontalPadding,
          paddingRight: 4,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: theme.queueBorder as ColorProp,
          backgroundColor: theme.queueSurface as ColorProp,
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: `popreminder://?action=view&id=${reminder.id}` }}
        accessibilityLabel={`${reminder.title}、${timeText}、詳細を開く`}
      >
        <DueBubble size={typography.queueBubbleSize} reminder={reminder} />
        <FlexWidget style={{ flex: 1, marginLeft: 9, justifyContent: 'center' }}>
          <TextWidget
            text={reminder.title}
            style={{
              width: 'match_parent',
              fontFamily: WIDGET_FONT_FAMILY,
              fontSize: typography.queueTitleFontSize,
              fontWeight: '800',
              color: theme.primaryText as ColorProp,
              adjustsFontSizeToFit: true,
            }}
            truncate="END"
            maxLines={1}
            allowFontScaling={false}
          />
        </FlexWidget>
        <TextWidget
          text={timeText}
          style={{
            width: typography.timeWidth,
            marginLeft: 6,
            fontFamily: WIDGET_FONT_FAMILY,
            fontSize: typography.queueTimeFontSize,
            fontWeight: '700',
            color: theme.secondaryText as ColorProp,
            textAlign: 'right',
            adjustsFontSizeToFit: true,
          }}
          maxLines={1}
          allowFontScaling={false}
        />
        <DeleteReminderButton reminder={reminder} theme={theme} />
      </FlexWidget>
    </OverlapWidget>
  );
}

function EmptyState({ bounds, theme }: { bounds: WidgetRect; theme: WidgetThemeTokens }) {
  const bubbleSize = Math.min(48, Math.max(38, Math.round(bounds.height * 0.42)));

  return (
    <FlexWidget
      style={{
        width: bounds.width,
        height: bounds.height,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: bounds.top,
        marginLeft: bounds.left,
        borderRadius: 22,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'popreminder://?action=add' }}
      accessibilityLabel="最初のリマインダーを追加"
    >
      <OverlapWidget style={{ width: bubbleSize, height: bubbleSize }}>
        <FlexWidget
          style={{
            width: bubbleSize,
            height: bubbleSize,
            borderRadius: Math.round(bubbleSize / 2),
            borderWidth: 1,
            borderColor: theme.addButtonBorder as ColorProp,
            backgroundGradient: widgetGradient(theme.addButtonGradient),
          }}
        />
        <FlexWidget
          style={{
            width: Math.round(bubbleSize * 0.28),
            height: Math.round(bubbleSize * 0.18),
            marginTop: Math.round(bubbleSize * 0.18),
            marginLeft: Math.round(bubbleSize * 0.2),
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.54)' as ColorProp,
          }}
        />
        <FlexWidget
          style={{
            width: bubbleSize,
            height: bubbleSize,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text="＋"
            style={{
              fontFamily: WIDGET_FONT_FAMILY,
              fontSize: 22,
              fontWeight: '700',
              color: theme.addButtonText as ColorProp,
              textAlign: 'center',
            }}
            maxLines={1}
            allowFontScaling={false}
          />
        </FlexWidget>
      </OverlapWidget>
      <TextWidget
        text="最初のリマインドを残そう"
        style={{
          width: bounds.width,
          marginTop: 5,
          fontFamily: WIDGET_FONT_FAMILY,
          fontSize: 13,
          fontWeight: '900',
          color: theme.primaryText as ColorProp,
          textAlign: 'center',
          adjustsFontSizeToFit: true,
        }}
        maxLines={1}
        allowFontScaling={false}
      />
      <TextWidget
        text="タップして追加"
        style={{
          marginTop: 1,
          fontFamily: WIDGET_FONT_FAMILY,
          fontSize: 9,
          fontWeight: '700',
          color: theme.secondaryText as ColorProp,
          textAlign: 'center',
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
  theme,
}: {
  reminders: WidgetReminder[];
  plan: WidgetLayoutPlan;
  theme: WidgetThemeTokens;
}) {
  const remindersById = new Map(reminders.map((reminder) => [reminder.id, reminder]));

  if (!plan.hero) {
    return <EmptyState bounds={plan.queueBounds} theme={theme} />;
  }

  const heroReminder = remindersById.get(plan.hero.reminderId);

  return (
    <OverlapWidget style={{ width: 'match_parent', height: 'match_parent' }}>
      {heroReminder ? (
        <HeroReminder reminder={heroReminder} layout={plan.hero} mode={plan.mode} theme={theme} />
      ) : null}
      {plan.queueRows.map((layout) => {
        const reminder = remindersById.get(layout.reminderId);

        return reminder ? (
          <QueueReminderRow
            key={reminder.id}
            reminder={reminder}
            layout={layout}
            mode={plan.mode}
            theme={theme}
          />
        ) : null;
      })}
    </OverlapWidget>
  );
}

function AddReminderButton({ layout, theme }: { layout: WidgetRect; theme: WidgetThemeTokens }) {
  return (
    <OverlapWidget
      style={{
        width: layout.width,
        height: layout.height,
        marginTop: layout.top,
        marginLeft: layout.left,
      }}
    >
      <FlexWidget
        style={{
          width: layout.width,
          height: Math.max(0, layout.height - 2),
          marginTop: 2,
          borderRadius: Math.round(layout.height / 2),
          backgroundColor: theme.heroShadow as ColorProp,
        }}
      />
      <FlexWidget
        style={{
          width: layout.width,
          height: layout.height,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: Math.round(layout.height / 2),
          borderWidth: 1,
          borderColor: theme.addButtonBorder as ColorProp,
          backgroundGradient: widgetGradient(theme.addButtonGradient),
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'popreminder://?action=add' }}
        accessibilityLabel="リマインダーを追加"
      >
        <TextWidget
          text="＋"
          style={{
            fontFamily: WIDGET_FONT_FAMILY,
            fontSize: layout.height <= 34 ? 20 : 24,
            fontWeight: '700',
            color: theme.addButtonText as ColorProp,
            textAlign: 'center',
          }}
          maxLines={1}
          allowFontScaling={false}
        />
      </FlexWidget>
    </OverlapWidget>
  );
}

export function PopReminderWidget({
  reminders,
  theme = 'lavender',
  widgetWidth = WIDGET_DEFAULT_WIDTH,
  widgetHeight = WIDGET_DEFAULT_HEIGHT,
}: PopReminderWidgetProps) {
  const plan = getWidgetLayoutPlan(reminders, widgetWidth, widgetHeight);
  const colors = getWidgetTheme(theme);

  return (
    <OverlapWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.surfaceBorder as ColorProp,
        backgroundGradient: widgetGradient(colors.surfaceGradient),
        overflow: 'hidden',
      }}
      accessibilityLabel={`ふわっと。リマインダー${reminders.length}件`}
    >
      <SvgWidget
        svg={makeWidgetBackdropSvg(widgetWidth, widgetHeight, colors)}
        style={{ width: 'match_parent', height: 'match_parent' }}
      />
      <WidgetHeader
        layout={plan.header}
        mode={plan.mode}
        totalCount={reminders.length}
        theme={colors}
      />
      <ReminderContent reminders={reminders} plan={plan} theme={colors} />
      {reminders.length > 0 ? <AddReminderButton layout={plan.addButton} theme={colors} /> : null}
    </OverlapWidget>
  );
}
