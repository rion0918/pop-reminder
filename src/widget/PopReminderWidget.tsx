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
  type WidgetRect,
  type WidgetReminderLayout,
} from './widgetBubbleLayout';
import {
  getWidgetTypography,
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
  visibleCount,
  fetchedCount,
  theme,
}: {
  layout: WidgetRect;
  mode: WidgetDisplayMode;
  visibleCount: number;
  fetchedCount: number;
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
        justifyContent: 'center',
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
      <TextWidget
        text={`表示中 ${visibleCount}件 / 全${fetchedCount}件`}
        style={{
          fontFamily: WIDGET_FONT_FAMILY,
          fontSize: typography.countFontSize,
          color: theme.secondaryText as ColorProp,
          marginTop: 2,
        }}
        maxLines={1}
        allowFontScaling={false}
      />
    </FlexWidget>
  );
}

function DueBubble({ size, reminder }: { size: number; reminder: WidgetReminder }) {
  const dueColor = getReminderDueColor(reminder.targetAt);
  return (
    <OverlapWidget style={{ width: size, height: size }}>
      <FlexWidget
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
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
          width: 3,
          height: 3,
          marginTop: 2,
          marginLeft: 3,
          borderRadius: 2,
          backgroundColor: '#FFFFFF',
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
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 24,
      }}
      clickAction={WIDGET_DELETE_REMINDER_ACTION}
      clickActionData={{ id: reminder.id }}
      accessibilityLabel={`「${reminder.title}」を削除`}
    >
      <SvgWidget svg={makeWidgetTrashSvg(theme.secondaryText)} style={{ width: 20, height: 20 }} />
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
  const timeText = `${reminder.isExpired ? '期限済み · ' : ''}${formatReminderBubbleDateTime(reminder.targetAt)}`;
  return (
    <FlexWidget
      style={{
        width: layout.width,
        height: layout.height,
        marginTop: layout.top,
        marginLeft: layout.left,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        backgroundGradient: highlighted ? widgetGradient(theme.heroGradient) : undefined,
        backgroundColor: highlighted ? undefined : (theme.queueSurface as ColorProp),
      }}
    >
      <FlexWidget
        style={{
          width: layout.width - WIDGET_ROW_ACTION_SIZE,
          height: layout.height,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 12,
          paddingRight: 4,
          borderRadius: 18,
        }}
        clickAction="OPEN_URI"
        clickActionData={{
          uri: `popreminder://?action=view&id=${encodeURIComponent(reminder.id)}`,
        }}
        accessibilityLabel={`${reminder.title}、${timeText}、詳細を開く`}
      >
        <DueBubble size={typography.bubbleSize} reminder={reminder} />
        <FlexWidget style={{ flex: 1, marginLeft: 8, justifyContent: 'center' }}>
          <TextWidget
            text={reminder.title}
            style={{
              width: 'match_parent',
              fontFamily: WIDGET_FONT_FAMILY,
              fontSize: typography.titleFontSize,
              fontWeight: highlighted ? '600' : '500',
              color: theme.primaryText as ColorProp,
            }}
            truncate="END"
            maxLines={1}
            allowFontScaling={false}
          />
          <TextWidget
            text={timeText}
            style={{
              width: 'match_parent',
              marginTop: 3,
              fontFamily: WIDGET_FONT_FAMILY,
              fontSize: typography.timeFontSize,
              color: theme.secondaryText as ColorProp,
            }}
            truncate="END"
            maxLines={1}
            allowFontScaling={false}
          />
        </FlexWidget>
      </FlexWidget>
      <DeleteReminderButton reminder={reminder} theme={theme} />
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
        borderRadius: 18,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'popreminder://?action=add' }}
      accessibilityLabel="リマインダーを追加"
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
      <TextWidget
        text="＋ 追加する"
        style={{
          fontFamily: WIDGET_FONT_FAMILY,
          fontSize: 14,
          fontWeight: '600',
          color: theme.secondaryText as ColorProp,
          marginTop: 12,
        }}
        maxLines={1}
        allowFontScaling={false}
      />
    </FlexWidget>
  );
}

function AddReminderButton({ layout, theme }: { layout: WidgetRect; theme: WidgetThemeTokens }) {
  return (
    <FlexWidget
      style={{
        width: layout.width,
        height: layout.height,
        marginTop: layout.top,
        marginLeft: layout.left,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 24,
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
          fontSize: 24,
          color: theme.addButtonText as ColorProp,
          textAlign: 'center',
        }}
        maxLines={1}
        allowFontScaling={false}
      />
    </FlexWidget>
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
      <WidgetHeader
        layout={plan.header}
        mode={plan.mode}
        visibleCount={plan.visibleReminderCount}
        fetchedCount={reminders.length}
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
      {reminders.length === 0 ? <EmptyState bounds={plan.queueBounds} theme={colors} /> : null}
      {reminders.length > 0 ? <AddReminderButton layout={plan.addButton} theme={colors} /> : null}
    </OverlapWidget>
  );
}
