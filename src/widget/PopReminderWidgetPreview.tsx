import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '../constants/colors';
import { formatReminderBubbleDateTime } from '../features/reminders/utils/reminderDateFormat';
import { getReminderDueColor } from '../features/reminders/utils/reminderDueColor';
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
  WIDGET_ROW_ACTION_SIZE,
} from './widgetVisuals';

export type WidgetPreviewReminder = {
  id: string;
  title: string;
  targetAt: string;
  isExpired?: boolean;
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
  const dueColor = getReminderDueColor(reminder.targetAt);
  const timeText = `${reminder.isExpired ? '期限済み · ' : ''}${formatReminderBubbleDateTime(reminder.targetAt)}`;
  return (
    <View
      style={[
        styles.row,
        {
          left: layout.left,
          top: layout.top,
          width: layout.width,
          height: layout.height,
          backgroundColor: highlighted ? undefined : theme.queueSurface,
        },
      ]}
    >
      {highlighted ? (
        <LinearGradient
          colors={[theme.heroGradient.from, theme.heroGradient.to]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View
        style={[
          styles.detail,
          { width: layout.width - WIDGET_ROW_ACTION_SIZE, height: layout.height },
        ]}
      >
        <View
          style={{
            width: typography.bubbleSize,
            height: typography.bubbleSize,
            borderRadius: typography.bubbleSize / 2,
            borderWidth: 1,
            borderColor: dueColor.border,
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={[dueColor.gradient[0], dueColor.gradient[2]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.bubbleHighlight} />
        </View>
        <View style={styles.textContent}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            allowFontScaling={false}
            style={{
              fontFamily: WIDGET_FONT_FAMILY,
              fontSize: typography.titleFontSize,
              fontWeight: highlighted ? '600' : '500',
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
              marginTop: 3,
              fontFamily: WIDGET_FONT_FAMILY,
              fontSize: typography.timeFontSize,
              color: theme.secondaryText,
            }}
          >
            {timeText}
          </Text>
        </View>
      </View>
      <View style={styles.deleteButton} accessibilityLabel={`「${reminder.title}」を削除`}>
        <Ionicons name="trash-outline" size={20} color={theme.secondaryText} />
      </View>
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
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={{
            marginTop: 2,
            fontFamily: WIDGET_FONT_FAMILY,
            fontSize: typography.countFontSize,
            color: colors.secondaryText,
          }}
        >{`表示中 ${plan.visibleReminderCount}件 / 全${reminders.length}件`}</Text>
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
      {reminders.length > 0 ? (
        <View
          style={[
            styles.addButton,
            {
              left: plan.addButton.left,
              top: plan.addButton.top,
              width: plan.addButton.width,
              height: plan.addButton.height,
            },
          ]}
        >
          <LinearGradient
            colors={[colors.addButtonGradient.from, colors.addButtonGradient.to]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text
            allowFontScaling={false}
            style={{ fontFamily: WIDGET_FONT_FAMILY, fontSize: 24, color: colors.addButtonText }}
          >
            ＋
          </Text>
        </View>
      ) : (
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
          <Text
            allowFontScaling={false}
            style={{
              marginTop: 12,
              fontFamily: WIDGET_FONT_FAMILY,
              fontSize: 14,
              fontWeight: '600',
              color: colors.secondaryText,
            }}
          >
            ＋ 追加する
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { position: 'relative', overflow: 'hidden', borderRadius: 24, borderWidth: 1 },
  header: { position: 'absolute', justifyContent: 'center' },
  row: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    overflow: 'hidden',
  },
  detail: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 4 },
  textContent: { flex: 1, minWidth: 0, marginLeft: 8, justifyContent: 'center' },
  bubbleHighlight: {
    position: 'absolute',
    width: 3,
    height: 3,
    top: 2,
    left: 3,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  deleteButton: {
    width: WIDGET_ROW_ACTION_SIZE,
    height: WIDGET_ROW_ACTION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  addButton: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    overflow: 'hidden',
  },
  emptyState: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
