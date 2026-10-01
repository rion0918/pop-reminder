import {
  FlexWidget,
  ImageWidget,
  OverlapWidget,
  TextWidget,
  type ColorProp,
} from 'react-native-android-widget';

import type { AppTheme } from '../constants/colors';
import { formatReminderBubbleDateTime } from '../features/reminders/utils/reminderDateFormat';
import { getWidgetTheme, type WidgetThemeTokens } from './widgetColors';
import type { WidgetReminder } from './widgetReminderSnapshot';
import {
  getWidgetLayoutPlan,
  type WidgetDisplayMode,
  type WidgetRect,
  type WidgetReminderLayout,
} from './widgetBubbleLayout';
import {
  getWidgetTypography,
  WIDGET_DEFAULT_HEIGHT,
  WIDGET_DEFAULT_WIDTH,
  WIDGET_FONT_FAMILY,
  WIDGET_GLASS_BUBBLE,
} from './widgetVisuals';

type PopReminderWidgetProps = {
  reminders: WidgetReminder[];
  theme?: AppTheme;
  widgetWidth?: number;
  widgetHeight?: number;
};

// Existing installed widgets can still dispatch this action until their next refresh.
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
  hasReminders,
  theme,
}: {
  layout: WidgetRect;
  mode: WidgetDisplayMode;
  hasReminders: boolean;
  theme: WidgetThemeTokens;
}) {
  const typography = getWidgetTypography(mode);
  return (
    <FlexWidget
      style={{
        width: layout.width,
        height: layout.height,
        marginTop: layout.top,
        marginLeft: layout.left,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <TextWidget
        text="ふわっと。"
        style={{
          fontFamily: WIDGET_FONT_FAMILY,
          fontSize: typography.headerFontSize,
          fontWeight: '700',
          color: theme.primaryText as ColorProp,
        }}
        maxLines={1}
        allowFontScaling={false}
      />
      {hasReminders ? (
        <TextWidget
          text="次のリマインド"
          style={{
            fontFamily: WIDGET_FONT_FAMILY,
            fontSize: typography.labelFontSize,
            color: theme.secondaryText as ColorProp,
          }}
          maxLines={1}
          allowFontScaling={false}
        />
      ) : null}
    </FlexWidget>
  );
}

function ReminderRow({
  reminder,
  layout,
  mode,
  theme,
  highlighted,
}: {
  reminder: WidgetReminder;
  layout: WidgetReminderLayout;
  mode: WidgetDisplayMode;
  theme: WidgetThemeTokens;
  highlighted: boolean;
}) {
  const typography = getWidgetTypography(mode);
  const timeText = `${reminder.isExpired ? '期限済み · ' : ''}${formatReminderBubbleDateTime(reminder.targetAt, new Date(), reminder.allDay)}`;
  if (!highlighted) {
    return (
      <FlexWidget
        style={{
          width: layout.width,
          height: layout.height,
          marginTop: layout.top,
          marginLeft: layout.left,
          flexDirection: 'row',
          alignItems: 'center',
          borderTopWidth: 1,
          borderTopColor: theme.accentSoft as ColorProp,
        }}
        clickAction="OPEN_URI"
        clickActionData={{
          uri: `popreminder://?action=view&id=${encodeURIComponent(reminder.id)}`,
        }}
        accessibilityLabel={`${reminder.title}、${timeText}、詳細を開く`}
      >
        <TextWidget
          text={timeText}
          style={{
            width: Math.round(layout.width * 0.44),
            fontFamily: WIDGET_FONT_FAMILY,
            fontSize: typography.queueTimeFontSize,
            color: theme.secondaryText as ColorProp,
            marginRight: 8,
          }}
          maxLines={1}
          truncate="END"
          allowFontScaling={false}
        />
        <FlexWidget style={{ flex: 1 }}>
          <TextWidget
            text={reminder.title}
            style={{
              width: 'match_parent',
              fontFamily: WIDGET_FONT_FAMILY,
              fontSize: typography.queueTitleFontSize,
              fontWeight: '500',
              color: theme.primaryText as ColorProp,
            }}
            maxLines={1}
            truncate="END"
            allowFontScaling={false}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }
  return (
    <FlexWidget
      style={{
        width: layout.width,
        height: layout.height,
        marginTop: layout.top,
        marginLeft: layout.left,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderTopWidth: highlighted ? 0 : 1,
        borderTopColor: theme.accentSoft as ColorProp,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: `popreminder://?action=view&id=${encodeURIComponent(reminder.id)}` }}
      accessibilityLabel={`${reminder.title}、${timeText}、詳細を開く`}
    >
      <FlexWidget
        style={{
          flex: 1,
          justifyContent: 'center',
          paddingRight: typography.bubbleSize ? 8 : 0,
        }}
      >
        <TextWidget
          text={reminder.title}
          style={{
            width: 'match_parent',
            fontFamily: WIDGET_FONT_FAMILY,
            fontSize: typography.titleFontSize,
            fontWeight: '700',
            color: theme.primaryText as ColorProp,
          }}
          truncate="END"
          maxLines={typography.titleLines}
          allowFontScaling={false}
        />
        <TextWidget
          text={timeText}
          style={{
            width: 'match_parent',
            marginTop: 4,
            fontFamily: WIDGET_FONT_FAMILY,
            fontSize: typography.timeFontSize,
            color: theme.primaryText as ColorProp,
          }}
          truncate="END"
          maxLines={1}
          allowFontScaling={false}
        />
      </FlexWidget>
      {typography.bubbleSize > 0 ? (
        <ImageWidget
          image={WIDGET_GLASS_BUBBLE}
          imageWidth={typography.bubbleSize}
          imageHeight={typography.bubbleSize}
          style={{ width: typography.bubbleSize, height: typography.bubbleSize }}
        />
      ) : null}
    </FlexWidget>
  );
}

function EmptyState({ bounds, theme }: { bounds: WidgetRect; theme: WidgetThemeTokens }) {
  return (
    <FlexWidget
      style={{
        width: bounds.width,
        height: bounds.height,
        marginTop: bounds.top,
        marginLeft: bounds.left,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TextWidget
        text="リマインダーはありません"
        style={{
          fontFamily: WIDGET_FONT_FAMILY,
          fontSize: 14,
          color: theme.primaryText as ColorProp,
          textAlign: 'center',
        }}
        maxLines={2}
        allowFontScaling={false}
      />
    </FlexWidget>
  );
}

function AddReminderButton({
  layout,
  mode,
  theme,
}: {
  layout: WidgetRect;
  mode: WidgetDisplayMode;
  theme: WidgetThemeTokens;
}) {
  return (
    <OverlapWidget
      style={{
        width: layout.width,
        height: layout.height,
        marginTop: layout.top,
        marginLeft: layout.left,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.addButtonBorder as ColorProp,
        backgroundGradient: widgetGradient(theme.addButtonGradient),
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'popreminder://?action=add' }}
      accessibilityLabel="リマインダーを追加"
    >
      <FlexWidget
        style={{
          width: layout.width,
          height: layout.height,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TextWidget
          text="＋"
          style={{ fontSize: 24, color: theme.addButtonText as ColorProp, marginRight: 6 }}
          maxLines={1}
          allowFontScaling={false}
        />
        <TextWidget
          text="追加する"
          style={{
            fontFamily: WIDGET_FONT_FAMILY,
            fontSize: getWidgetTypography(mode).addFontSize,
            fontWeight: '600',
            color: theme.addButtonText as ColorProp,
          }}
          maxLines={1}
          allowFontScaling={false}
        />
      </FlexWidget>
      <FlexWidget
        style={{
          width: layout.width - 4,
          height: layout.height - 4,
          marginTop: 2,
          marginLeft: 2,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.addButtonBorder as ColorProp,
        }}
      />
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
  const remindersById = new Map(reminders.map((reminder) => [reminder.id, reminder]));
  const rows = plan.hero ? [plan.hero, ...plan.queueRows] : [];
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
    >
      <FlexWidget
        style={{
          width: widgetWidth - 6,
          height: widgetHeight - 6,
          marginLeft: 3,
          marginTop: 3,
          borderRadius: 21,
          borderWidth: 1,
          borderColor: colors.heroBorder as ColorProp,
        }}
      />
      <WidgetHeader
        layout={plan.header}
        mode={plan.mode}
        hasReminders={reminders.length > 0}
        theme={colors}
      />
      {rows.map((layout, index) => {
        const reminder = remindersById.get(layout.reminderId);
        return reminder ? (
          <ReminderRow
            key={reminder.id}
            reminder={reminder}
            layout={layout}
            mode={plan.mode}
            theme={colors}
            highlighted={index === 0}
          />
        ) : null;
      })}
      {plan.allDaySummary ? (
        <FlexWidget
          style={{
            width: plan.allDaySummary.width,
            height: plan.allDaySummary.height,
            marginTop: plan.allDaySummary.top,
            marginLeft: plan.allDaySummary.left,
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text={plan.allDaySummary.text}
            accessibilityLabel={plan.allDaySummary.text}
            style={{
              width: 'match_parent',
              fontFamily: WIDGET_FONT_FAMILY,
              fontSize: getWidgetTypography(plan.mode).queueTimeFontSize,
              color: colors.secondaryText as ColorProp,
            }}
            maxLines={1}
            truncate="END"
            allowFontScaling={false}
          />
        </FlexWidget>
      ) : null}
      {reminders.length === 0 ? <EmptyState bounds={plan.queueBounds} theme={colors} /> : null}
      <AddReminderButton layout={plan.addButton} mode={plan.mode} theme={colors} />
    </OverlapWidget>
  );
}
