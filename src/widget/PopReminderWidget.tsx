import { FlexWidget, OverlapWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import { formatReminderBubbleDateTime } from '../features/reminders/utils/reminderDateFormat';
import { getReminderDueColor } from '../features/reminders/utils/reminderDueColor';
import { widgetTheme } from './widgetColors';
import {
  getWidgetLayoutPlan,
  type WidgetDisplayMode,
  type WidgetListRowLayout,
  type WidgetLayoutPlan,
  type WidgetRect,
} from './widgetBubbleLayout';
import {
  getWidgetTypography,
  WIDGET_DEFAULT_HEIGHT,
  WIDGET_DEFAULT_WIDTH,
  WIDGET_FONT_FAMILY,
  WIDGET_ROW_ACTION_SIZE,
} from './widgetVisuals';

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

export const WIDGET_DELETE_REMINDER_ACTION = 'DELETE_REMINDER';

function WidgetHeader({
  layout,
  mode,
  totalCount,
}: {
  layout: WidgetRect;
  mode: WidgetDisplayMode;
  totalCount: number;
}) {
  const typography = getWidgetTypography(mode);

  return (
    <FlexWidget
      style={{
        width: layout.width,
        height: layout.height,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: layout.top,
        marginLeft: layout.left,
      }}
    >
      <TextWidget
        text="ふわっと。"
        style={{
          fontFamily: WIDGET_FONT_FAMILY,
          fontSize: typography.headerFontSize,
          fontWeight: '800',
          color: widgetTheme.primaryText as ColorProp,
        }}
        maxLines={1}
        allowFontScaling={false}
      />
      <TextWidget
        text={`${totalCount}件`}
        style={{
          fontFamily: WIDGET_FONT_FAMILY,
          fontSize: mode === 'compact' ? 10 : 11,
          fontWeight: '600',
          color: widgetTheme.secondaryText as ColorProp,
          textAlign: 'right',
        }}
        maxLines={1}
        allowFontScaling={false}
      />
    </FlexWidget>
  );
}

function ReminderListRow({
  reminder,
  layout,
  mode,
}: {
  reminder: WidgetReminder;
  layout: WidgetListRowLayout;
  mode: WidgetDisplayMode;
}) {
  const color = getReminderDueColor(reminder.targetAt);
  const timeText = formatReminderBubbleDateTime(reminder.targetAt);
  const typography = getWidgetTypography(mode);
  const cardHeight = layout.height;
  const shadowHeight = Math.max(0, cardHeight - 2);
  const cardRadius = Math.min(18, Math.round(cardHeight / 2));

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
          height: shadowHeight,
          marginTop: 2,
          borderRadius: cardRadius,
          backgroundColor: widgetTheme.cardShadow as ColorProp,
        }}
      />
      <FlexWidget
        style={{
          width: layout.width,
          height: cardHeight,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: typography.rowHorizontalPadding,
          paddingVertical: 0,
          borderRadius: cardRadius,
          borderWidth: 1,
          borderColor: widgetTheme.cardBorder as ColorProp,
          backgroundColor: widgetTheme.cardSurface as ColorProp,
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: `popreminder://?action=view&id=${reminder.id}` }}
        accessibilityLabel={`${reminder.title}、${timeText}、詳細を開く`}
      >
        <FlexWidget
          style={{
            width: typography.statusDotSize,
            height: typography.statusDotSize,
            marginRight: typography.statusDotGap,
            borderRadius: Math.round(typography.statusDotSize / 2),
            borderWidth: 1,
            borderColor: color.border as ColorProp,
            backgroundColor: color.background as ColorProp,
          }}
        />
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <FlexWidget style={{ flex: 1, justifyContent: 'center' }}>
            <TextWidget
              text={reminder.title}
              style={{
                fontFamily: WIDGET_FONT_FAMILY,
                fontSize: typography.titleFontSize,
                fontWeight: '700',
                color: widgetTheme.primaryText as ColorProp,
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
              fontFamily: WIDGET_FONT_FAMILY,
              fontSize: typography.timeFontSize,
              fontWeight: '600',
              color: widgetTheme.secondaryText as ColorProp,
              marginLeft: 8,
              textAlign: 'right',
              adjustsFontSizeToFit: true,
            }}
            maxLines={1}
            allowFontScaling={false}
          />
        </FlexWidget>
        <FlexWidget
          style={{
            width: WIDGET_ROW_ACTION_SIZE,
            height: WIDGET_ROW_ACTION_SIZE,
            marginLeft: 8,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: Math.round(WIDGET_ROW_ACTION_SIZE / 2),
            backgroundColor: widgetTheme.rowActionSurface as ColorProp,
          }}
          clickAction={WIDGET_DELETE_REMINDER_ACTION}
          clickActionData={{ id: reminder.id }}
          accessibilityLabel={`「${reminder.title}」を削除`}
        >
          <TextWidget
            text="🗑"
            style={{
              fontSize: 14,
              textAlign: 'center',
              color: widgetTheme.secondaryText as ColorProp,
            }}
            maxLines={1}
            allowFontScaling={false}
          />
        </FlexWidget>
      </FlexWidget>
    </OverlapWidget>
  );
}

function EmptyState({ listBounds }: { listBounds: WidgetLayoutPlan['listBounds'] }) {
  return (
    <OverlapWidget style={{ width: 'match_parent', height: 'match_parent' }}>
      <FlexWidget
        style={{
          width: listBounds.width,
          height: listBounds.height,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 8,
          paddingBottom: 24,
          marginTop: listBounds.top,
          marginLeft: listBounds.left,
        }}
      >
        <TextWidget
          text="まだ泡はひとつも浮いていません"
          style={{
            fontFamily: WIDGET_FONT_FAMILY,
            fontSize: 14,
            fontWeight: '700',
            color: widgetTheme.primaryText as ColorProp,
            textAlign: 'center',
            adjustsFontSizeToFit: true,
          }}
          maxLines={1}
          allowFontScaling={false}
        />
        <TextWidget
          text="忘れたくないこと、右下からふわっとどうぞ"
          style={{
            width: listBounds.width,
            fontFamily: WIDGET_FONT_FAMILY,
            fontSize: 10,
            fontWeight: '600',
            color: widgetTheme.secondaryText as ColorProp,
            textAlign: 'center',
            marginTop: 4,
            adjustsFontSizeToFit: true,
          }}
          maxLines={1}
          allowFontScaling={false}
        />
      </FlexWidget>
    </OverlapWidget>
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

  if (plan.listRows.length === 0) {
    return <EmptyState listBounds={plan.listBounds} />;
  }

  return (
    <OverlapWidget style={{ width: 'match_parent', height: 'match_parent' }}>
      {plan.listRows.map((layout) => {
        const reminder = remindersById.get(layout.reminderId);

        return reminder ? (
          <ReminderListRow key={reminder.id} reminder={reminder} layout={layout} mode={plan.mode} />
        ) : null;
      })}
    </OverlapWidget>
  );
}

function AddReminderButton({ layout }: { layout: WidgetRect }) {
  return (
    <FlexWidget
      style={{
        width: layout.width,
        height: layout.height,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: layout.top,
        marginLeft: layout.left,
        borderRadius: Math.round(layout.height / 2),
        borderWidth: 1,
        borderColor: widgetTheme.plusButtonBorder as ColorProp,
        backgroundColor: widgetTheme.plusButtonSurface as ColorProp,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'popreminder://?action=add' }}
      accessibilityLabel="リマインダーを追加"
    >
      <TextWidget
        text="＋"
        style={{
          fontFamily: WIDGET_FONT_FAMILY,
          fontSize: 22,
          fontWeight: '700',
          color: widgetTheme.plusButtonText as ColorProp,
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
  widgetWidth = WIDGET_DEFAULT_WIDTH,
  widgetHeight = WIDGET_DEFAULT_HEIGHT,
}: PopReminderWidgetProps) {
  const plan = getWidgetLayoutPlan(reminders, widgetWidth, widgetHeight);

  return (
    <OverlapWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: widgetTheme.surface as ColorProp,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: widgetTheme.surfaceBorder as ColorProp,
        overflow: 'hidden',
      }}
    >
      <WidgetHeader layout={plan.header} mode={plan.mode} totalCount={reminders.length} />
      <ReminderContent reminders={reminders} plan={plan} />
      <AddReminderButton layout={plan.addButton} />
    </OverlapWidget>
  );
}
