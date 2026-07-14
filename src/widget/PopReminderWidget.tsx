import {
  FlexWidget,
  ImageWidget,
  OverlapWidget,
  TextWidget,
  type ColorProp,
} from 'react-native-android-widget';
import type { ImageRequireSource } from 'react-native';

import { formatReminderBubbleDateTime } from '../features/reminders/utils/reminderDateFormat';
import { getReminderDueColor } from '../features/reminders/utils/reminderDueColor';
import { widgetTheme } from './widgetColors';
import { getWidgetSkyPeriod, type WidgetSkyPeriod } from './widgetSky';
import {
  getWidgetLayoutPlan,
  type WidgetDisplayMode,
  type WidgetListRowLayout,
  type WidgetLayoutPlan,
  type WidgetRect,
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

const WIDGET_DEFAULT_WIDTH = 250;
const WIDGET_DEFAULT_HEIGHT = 180;
const WIDGET_STATUS_DOT_SIZE = 12;
const WIDGET_COMPACT_STATUS_DOT_SIZE = 10;
export const WIDGET_DELETE_REMINDER_ACTION = 'DELETE_REMINDER';

const widgetSkyAssets: Record<WidgetSkyPeriod, ImageRequireSource> = {
  morning: require('../../assets/widget-sky-morning.png'),
  day: require('../../assets/widget-sky-day.png'),
  sunset: require('../../assets/widget-sky-sunset.png'),
  night: require('../../assets/widget-sky-night.png'),
};

function getWidgetSkyAsset(currentDate = new Date()) {
  return widgetSkyAssets[getWidgetSkyPeriod(currentDate)];
}

function getWidgetTypography(mode: WidgetDisplayMode) {
  if (mode === 'compact') {
    return {
      headerFontSize: 13,
      titleFontSize: 13,
      timeFontSize: 10,
      rowHorizontalPadding: 10,
      statusDotSize: WIDGET_COMPACT_STATUS_DOT_SIZE,
      statusDotGap: 9,
      timeWidth: 76,
    };
  }

  return {
    headerFontSize: 15,
    titleFontSize: 14,
    timeFontSize: 10,
    rowHorizontalPadding: 12,
    statusDotSize: WIDGET_STATUS_DOT_SIZE,
    statusDotGap: 10,
    timeWidth: 84,
  };
}

function WidgetHeader({ layout, mode }: { layout: WidgetRect; mode: WidgetDisplayMode }) {
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
      <TextWidget
        text="ポップ・リマインダー"
        style={{
          fontSize: typography.headerFontSize,
          fontWeight: '800',
          color: widgetTheme.primaryText as ColorProp,
          textShadowColor: widgetTheme.textHalo as ColorProp,
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
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
  const cardHeight = Math.max(0, layout.height - 2);
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
          height: cardHeight,
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
          paddingVertical: 2,
          borderRadius: cardRadius,
          borderWidth: 1,
          borderColor: widgetTheme.cardBorder as ColorProp,
          backgroundColor: widgetTheme.cardSurface as ColorProp,
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: `popreminder://?action=view&id=${reminder.id}` }}
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
                fontSize: typography.titleFontSize,
                fontWeight: '800',
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
              fontSize: typography.timeFontSize,
              fontWeight: '700',
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
            width: 28,
            height: 28,
            marginLeft: 8,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 14,
            backgroundColor: 'rgba(255, 255, 255, 0.44)',
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
    <FlexWidget
      style={{
        width: listBounds.width,
        height: listBounds.height,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        marginTop: listBounds.top,
        marginLeft: listBounds.left,
      }}
    >
      <TextWidget
        text="予定はありません"
        style={{
          fontSize: 14,
          fontWeight: '800',
          color: widgetTheme.primaryText as ColorProp,
          textAlign: 'center',
        }}
        maxLines={1}
        allowFontScaling={false}
      />
      <TextWidget
        text="＋ 追加から予定を登録"
        style={{
          fontSize: 10,
          fontWeight: '700',
          color: widgetTheme.secondaryText as ColorProp,
          textAlign: 'center',
          marginTop: 2,
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
        backgroundGradient: widgetTheme.plusButtonGradient,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'popreminder://?action=add' }}
      accessibilityLabel="リマインダーを追加"
    >
      <TextWidget
        text="＋"
        style={{
          fontSize: 22,
          fontWeight: '900',
          color: widgetTheme.plusButtonText as ColorProp,
          textAlign: 'center',
          textShadowColor: widgetTheme.textHalo as ColorProp,
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
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
        backgroundColor: widgetTheme.cloudSurfaceBackground as ColorProp,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: widgetTheme.cloudSurfaceBorder as ColorProp,
        overflow: 'hidden',
      }}
    >
      <ImageWidget
        image={getWidgetSkyAsset()}
        imageWidth={widgetWidth}
        imageHeight={widgetHeight}
        radius={24}
        style={{ width: 'match_parent', height: 'match_parent' }}
      />
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 'match_parent',
          backgroundColor: widgetTheme.glassVeil as ColorProp,
        }}
      />
      <WidgetHeader layout={plan.header} mode={plan.mode} />
      <ReminderContent reminders={reminders} plan={plan} />
      <AddReminderButton layout={plan.addButton} />
    </OverlapWidget>
  );
}
