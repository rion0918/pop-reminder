import { StyleSheet, Text, View } from 'react-native';

import { formatReminderBubbleDateTime } from '../features/reminders/utils/reminderDateFormat';
import { getReminderDueColor } from '../features/reminders/utils/reminderDueColor';
import { getWidgetLayoutPlan, type WidgetListRowLayout } from './widgetBubbleLayout';
import { widgetTheme } from './widgetColors';
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
};

export type PopReminderWidgetPreviewProps = {
  reminders: WidgetPreviewReminder[];
  widgetWidth?: number;
  widgetHeight?: number;
};

function ReminderRow({
  reminder,
  layout,
  mode,
}: {
  reminder: WidgetPreviewReminder;
  layout: WidgetListRowLayout;
  mode: ReturnType<typeof getWidgetLayoutPlan>['mode'];
}) {
  const color = getReminderDueColor(reminder.targetAt);
  const typography = getWidgetTypography(mode);
  const cardRadius = Math.min(18, Math.round(layout.height / 2));

  return (
    <View
      style={[
        styles.rowPosition,
        {
          left: layout.left,
          top: layout.top,
          width: layout.width,
          height: layout.height,
        },
      ]}
    >
      <View
        style={{
          position: 'absolute',
          top: 2,
          width: layout.width,
          height: Math.max(0, layout.height - 2),
          borderRadius: cardRadius,
          backgroundColor: widgetTheme.cardShadow,
        }}
      />
      <View
        style={[
          styles.rowCard,
          {
            height: layout.height,
            paddingHorizontal: typography.rowHorizontalPadding,
            borderRadius: cardRadius,
          },
        ]}
      >
        <View
          style={{
            width: typography.statusDotSize,
            height: typography.statusDotSize,
            marginRight: typography.statusDotGap,
            borderRadius: Math.round(typography.statusDotSize / 2),
            borderWidth: 1,
            borderColor: color.border,
            backgroundColor: color.background,
          }}
        />
        <View style={styles.rowTextContent}>
          <Text
            style={[styles.reminderTitle, { fontSize: typography.titleFontSize, flexShrink: 1 }]}
            numberOfLines={1}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
          >
            {reminder.title}
          </Text>
          <Text
            style={[
              styles.reminderTime,
              {
                width: typography.timeWidth,
                fontSize: typography.timeFontSize,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatReminderBubbleDateTime(reminder.targetAt)}
          </Text>
        </View>
        <View style={styles.deleteButton}>
          <Text style={styles.deleteIcon}>🗑</Text>
        </View>
      </View>
    </View>
  );
}

export function PopReminderWidgetPreview({
  reminders,
  widgetWidth = WIDGET_DEFAULT_WIDTH,
  widgetHeight = WIDGET_DEFAULT_HEIGHT,
}: PopReminderWidgetPreviewProps) {
  const plan = getWidgetLayoutPlan(reminders, widgetWidth, widgetHeight);
  const remindersById = new Map(reminders.map((reminder) => [reminder.id, reminder]));
  const typography = getWidgetTypography(plan.mode);

  return (
    <View style={[styles.surface, { width: widgetWidth, height: widgetHeight }]}>
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
        <Text style={[styles.headerTitle, { fontSize: typography.headerFontSize }]}>
          ふわっと。
        </Text>
        <Text style={[styles.totalCount, { fontSize: plan.mode === 'compact' ? 10 : 11 }]}>
          {reminders.length}件
        </Text>
      </View>

      {plan.listRows.length === 0 ? (
        <View
          style={[
            styles.emptyState,
            {
              left: plan.listBounds.left,
              top: plan.listBounds.top,
              width: plan.listBounds.width,
              height: plan.listBounds.height,
            },
          ]}
        >
          <Text style={styles.emptyTitle} numberOfLines={1} adjustsFontSizeToFit>
            まだ泡はひとつも浮いていません
          </Text>
          <Text style={styles.emptyDescription} numberOfLines={1} adjustsFontSizeToFit>
            忘れたくないこと、右下からふわっとどうぞ
          </Text>
        </View>
      ) : (
        plan.listRows.map((layout) => {
          const reminder = remindersById.get(layout.reminderId);

          return reminder ? (
            <ReminderRow key={reminder.id} reminder={reminder} layout={layout} mode={plan.mode} />
          ) : null;
        })
      )}

      <View
        style={[
          styles.addButton,
          {
            left: plan.addButton.left,
            top: plan.addButton.top,
            width: plan.addButton.width,
            height: plan.addButton.height,
            borderRadius: Math.round(plan.addButton.height / 2),
          },
        ]}
      >
        <Text style={styles.addButtonText}>＋</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: widgetTheme.surfaceBorder,
    backgroundColor: widgetTheme.surface,
  },
  header: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: WIDGET_FONT_FAMILY,
    fontWeight: '800',
    color: widgetTheme.primaryText,
  },
  totalCount: {
    fontFamily: WIDGET_FONT_FAMILY,
    fontWeight: '600',
    color: widgetTheme.secondaryText,
    textAlign: 'right',
  },
  rowPosition: {
    position: 'absolute',
  },
  rowCard: {
    position: 'absolute',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: widgetTheme.cardBorder,
    backgroundColor: widgetTheme.cardSurface,
  },
  rowTextContent: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderTitle: {
    flex: 1,
    fontFamily: WIDGET_FONT_FAMILY,
    fontWeight: '700',
    color: widgetTheme.primaryText,
  },
  reminderTime: {
    marginLeft: 8,
    fontFamily: WIDGET_FONT_FAMILY,
    fontWeight: '600',
    color: widgetTheme.secondaryText,
    textAlign: 'right',
  },
  deleteButton: {
    width: WIDGET_ROW_ACTION_SIZE,
    height: WIDGET_ROW_ACTION_SIZE,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Math.round(WIDGET_ROW_ACTION_SIZE / 2),
    backgroundColor: widgetTheme.rowActionSurface,
  },
  deleteIcon: {
    fontSize: 14,
    color: widgetTheme.secondaryText,
    textAlign: 'center',
  },
  emptyState: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    paddingBottom: 24,
  },
  emptyTitle: {
    fontFamily: WIDGET_FONT_FAMILY,
    fontSize: 14,
    fontWeight: '700',
    color: widgetTheme.primaryText,
    textAlign: 'center',
  },
  emptyDescription: {
    width: '100%',
    marginTop: 4,
    fontFamily: WIDGET_FONT_FAMILY,
    fontSize: 10,
    fontWeight: '600',
    color: widgetTheme.secondaryText,
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: widgetTheme.plusButtonBorder,
    backgroundColor: widgetTheme.plusButtonSurface,
  },
  addButtonText: {
    fontFamily: WIDGET_FONT_FAMILY,
    fontSize: 22,
    fontWeight: '700',
    color: widgetTheme.plusButtonText,
    textAlign: 'center',
  },
});
