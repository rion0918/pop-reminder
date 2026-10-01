import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '../constants/colors';
import { formatReminderBubbleDateTime } from '../features/reminders/utils/reminderDateFormat';
import { getWidgetTheme, type WidgetThemeTokens } from './widgetColors';
import {
  getWidgetLayoutPlan,
  type WidgetDisplayMode,
  type WidgetReminderLayout,
} from './widgetBubbleLayout';
import {
  getWidgetTypography,
  WIDGET_DEFAULT_HEIGHT,
  WIDGET_DEFAULT_WIDTH,
  WIDGET_FONT_FAMILY,
  WIDGET_GLASS_BUBBLE,
} from './widgetVisuals';

export type WidgetPreviewReminder = {
  id: string;
  title: string;
  targetAt: string;
  isExpired?: boolean;
  allDay?: boolean;
};

export type PopReminderWidgetPreviewProps = {
  reminders: WidgetPreviewReminder[];
  theme?: AppTheme;
  widgetWidth?: number;
  widgetHeight?: number;
};

function ReminderPreview({
  reminder,
  layout,
  mode,
  theme,
  highlighted,
}: {
  reminder: WidgetPreviewReminder;
  layout: WidgetReminderLayout;
  mode: WidgetDisplayMode;
  theme: WidgetThemeTokens;
  highlighted: boolean;
}) {
  const typography = getWidgetTypography(mode);
  const timeText = `${reminder.isExpired ? '期限済み · ' : ''}${formatReminderBubbleDateTime(reminder.targetAt, new Date(), reminder.allDay)}`;
  if (!highlighted) {
    return (
      <View
        style={[
          styles.row,
          {
            left: layout.left,
            top: layout.top,
            width: layout.width,
            height: layout.height,
            borderTopWidth: 1,
            borderTopColor: theme.accentSoft,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={{
            width: Math.round(layout.width * 0.44),
            marginRight: 8,
            fontFamily: WIDGET_FONT_FAMILY,
            fontSize: typography.queueTimeFontSize,
            color: theme.secondaryText,
          }}
        >
          {timeText}
        </Text>
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={{
            flex: 1,
            fontFamily: WIDGET_FONT_FAMILY,
            fontSize: typography.queueTitleFontSize,
            fontWeight: '500',
            color: theme.primaryText,
          }}
        >
          {reminder.title}
        </Text>
      </View>
    );
  }
  return (
    <View
      style={[
        styles.row,
        {
          left: layout.left,
          top: layout.top,
          width: layout.width,
          height: layout.height,
          borderTopWidth: highlighted ? 0 : 1,
          borderTopColor: theme.accentSoft,
        },
      ]}
    >
      <View
        style={{
          flex: 1,
          minWidth: 0,
          justifyContent: 'center',
          paddingRight: typography.bubbleSize ? 8 : 0,
        }}
      >
        <Text
          numberOfLines={typography.titleLines}
          ellipsizeMode="tail"
          allowFontScaling={false}
          style={{
            fontFamily: WIDGET_FONT_FAMILY,
            fontSize: typography.titleFontSize,
            fontWeight: '700',
            color: theme.primaryText,
          }}
        >
          {reminder.title}
        </Text>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          allowFontScaling={false}
          style={{
            marginTop: 4,
            fontFamily: WIDGET_FONT_FAMILY,
            fontSize: typography.timeFontSize,
            color: theme.primaryText,
          }}
        >
          {timeText}
        </Text>
      </View>
      {typography.bubbleSize > 0 ? (
        <Image
          source={WIDGET_GLASS_BUBBLE}
          style={{ width: typography.bubbleSize, height: typography.bubbleSize }}
          accessible={false}
        />
      ) : null}
    </View>
  );
}

export function PopReminderWidgetPreview({
  reminders,
  theme = 'lavender',
  widgetWidth = WIDGET_DEFAULT_WIDTH,
  widgetHeight = WIDGET_DEFAULT_HEIGHT,
}: PopReminderWidgetPreviewProps) {
  const plan = getWidgetLayoutPlan(reminders, widgetWidth, widgetHeight);
  const colors = getWidgetTheme(theme);
  const typography = getWidgetTypography(plan.mode);
  const remindersById = new Map(reminders.map((reminder) => [reminder.id, reminder]));
  const rows = plan.hero ? [plan.hero, ...plan.queueRows] : [];
  return (
    <View
      testID={`widget-surface-${theme}`}
      style={[
        styles.surface,
        { width: widgetWidth, height: widgetHeight, borderColor: colors.surfaceBorder },
      ]}
    >
      <LinearGradient
        colors={[colors.surfaceGradient.from, colors.surfaceGradient.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.rim, { borderColor: colors.heroBorder }]} />
      <View
        style={[
          styles.header,
          {
            left: plan.header.left,
            top: plan.header.top,
            width: plan.header.width,
            height: plan.header.height,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={{
            fontFamily: WIDGET_FONT_FAMILY,
            fontSize: typography.headerFontSize,
            fontWeight: '700',
            color: colors.primaryText,
          }}
        >
          ふわっと。
        </Text>
        {reminders.length > 0 ? (
          <Text
            numberOfLines={1}
            allowFontScaling={false}
            style={{
              fontFamily: WIDGET_FONT_FAMILY,
              fontSize: typography.labelFontSize,
              color: colors.secondaryText,
            }}
          >
            次のリマインド
          </Text>
        ) : null}
      </View>
      {rows.map((layout, index) => {
        const reminder = remindersById.get(layout.reminderId);
        return reminder ? (
          <ReminderPreview
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
        <View
          style={{
            position: 'absolute',
            left: plan.allDaySummary.left,
            top: plan.allDaySummary.top,
            width: plan.allDaySummary.width,
            height: plan.allDaySummary.height,
            justifyContent: 'center',
          }}
        >
          <Text
            accessibilityLabel={plan.allDaySummary.text}
            numberOfLines={1}
            allowFontScaling={false}
            style={{
              fontFamily: WIDGET_FONT_FAMILY,
              fontSize: typography.queueTimeFontSize,
              color: colors.secondaryText,
            }}
          >
            {plan.allDaySummary.text}
          </Text>
        </View>
      ) : null}
      {reminders.length === 0 ? (
        <View
          style={[
            styles.emptyState,
            {
              left: plan.queueBounds.left,
              top: plan.queueBounds.top,
              width: plan.queueBounds.width,
              height: plan.queueBounds.height,
            },
          ]}
        >
          <Text
            numberOfLines={2}
            allowFontScaling={false}
            style={{
              fontFamily: WIDGET_FONT_FAMILY,
              fontSize: 14,
              color: colors.primaryText,
              textAlign: 'center',
            }}
          >
            リマインダーはありません
          </Text>
        </View>
      ) : null}
      <View
        accessibilityLabel="リマインダーを追加"
        style={[
          styles.addButton,
          {
            left: plan.addButton.left,
            top: plan.addButton.top,
            width: plan.addButton.width,
            height: plan.addButton.height,
            borderColor: colors.addButtonBorder,
          },
        ]}
      >
        <LinearGradient
          colors={[colors.addButtonGradient.from, colors.addButtonGradient.to]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={{
            position: 'absolute',
            left: 1,
            top: 1,
            right: 1,
            bottom: 1,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.addButtonBorder,
          }}
        />
        <Ionicons
          name="add-outline"
          size={24}
          color={colors.addButtonText}
          style={{ marginRight: 6 }}
        />
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: WIDGET_FONT_FAMILY,
            fontSize: typography.addFontSize,
            fontWeight: '600',
            color: colors.addButtonText,
          }}
        >
          追加する
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { position: 'relative', overflow: 'hidden', borderRadius: 24, borderWidth: 1 },
  rim: {
    position: 'absolute',
    left: 3,
    top: 3,
    right: 3,
    bottom: 3,
    borderRadius: 21,
    borderWidth: 1,
  },
  header: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButton: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyState: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
