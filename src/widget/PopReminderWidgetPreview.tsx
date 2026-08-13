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
};

export type PopReminderWidgetPreviewProps = {
  reminders: WidgetPreviewReminder[];
  theme?: AppTheme;
  widgetWidth?: number;
  widgetHeight?: number;
};

function DueBubblePreview({ size, reminder }: { size: number; reminder: WidgetPreviewReminder }) {
  const dueColor = getReminderDueColor(reminder.targetAt);

  return (
    <View
      style={{
        width: size,
        height: size,
        overflow: 'hidden',
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: dueColor.border,
      }}
    >
      <LinearGradient
        colors={[dueColor.gradient[0], dueColor.gradient[2]]}
        start={{ x: 0.12, y: 0.08 }}
        end={{ x: 0.9, y: 0.94 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.19,
          left: size * 0.22,
          width: Math.max(3, size * 0.24),
          height: Math.max(3, size * 0.24),
          borderRadius: size,
          backgroundColor: 'rgba(255,255,255,0.76)',
        }}
      />
    </View>
  );
}

function DeletePreview({ theme }: { theme: WidgetThemeTokens }) {
  return (
    <View
      style={[
        styles.deleteButton,
        {
          borderColor: theme.heroBorder,
          backgroundColor: theme.rowActionSurface,
        },
      ]}
    >
      <Ionicons name="trash-outline" size={15} color={theme.secondaryText} />
    </View>
  );
}

function HeroPreview({
  reminder,
  layout,
  mode,
  theme,
}: {
  reminder: WidgetPreviewReminder;
  layout: WidgetReminderLayout;
  mode: WidgetDisplayMode;
  theme: WidgetThemeTokens;
}) {
  const typography = getWidgetTypography(mode);
  const radius = mode === 'compact' ? 22 : 26;

  return (
    <View
      style={[
        styles.positioned,
        {
          left: layout.left,
          top: layout.top,
          width: layout.width,
          height: layout.height,
        },
      ]}
    >
      <View
        style={[
          styles.shadowLayer,
          {
            top: 2,
            height: layout.height - 2,
            borderRadius: radius,
            backgroundColor: theme.heroShadow,
          },
        ]}
      />
      <View
        style={[
          styles.heroSurface,
          {
            height: layout.height,
            paddingHorizontal: typography.heroHorizontalPadding,
            borderRadius: radius,
            borderColor: theme.heroBorder,
          },
        ]}
      >
        <LinearGradient
          colors={[theme.heroGradient.from, theme.heroGradient.to]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
        <DueBubblePreview size={typography.heroBubbleSize} reminder={reminder} />
        <View style={styles.heroTextContent}>
          <View style={styles.heroMetaRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.heroKicker,
                { color: theme.accent, fontSize: typography.heroKickerFontSize },
              ]}
            >
              次のリマインド
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[
                styles.heroTime,
                {
                  width: typography.timeWidth,
                  color: theme.secondaryText,
                  fontSize: typography.heroTimeFontSize,
                },
              ]}
            >
              {formatReminderBubbleDateTime(reminder.targetAt)}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            style={[
              styles.heroTitle,
              { color: theme.primaryText, fontSize: typography.heroTitleFontSize },
            ]}
          >
            {reminder.title}
          </Text>
        </View>
        <DeletePreview theme={theme} />
      </View>
    </View>
  );
}

function QueuePreview({
  reminder,
  layout,
  mode,
  theme,
}: {
  reminder: WidgetPreviewReminder;
  layout: WidgetReminderLayout;
  mode: WidgetDisplayMode;
  theme: WidgetThemeTokens;
}) {
  const typography = getWidgetTypography(mode);
  const radius = layout.height / 2;

  return (
    <View
      style={[
        styles.positioned,
        {
          left: layout.left,
          top: layout.top,
          width: layout.width,
          height: layout.height,
        },
      ]}
    >
      <View
        style={[
          styles.shadowLayer,
          {
            top: 2,
            height: layout.height - 2,
            borderRadius: radius,
            backgroundColor: theme.queueShadow,
          },
        ]}
      />
      <View
        style={[
          styles.queueSurface,
          {
            height: layout.height,
            paddingLeft: typography.queueHorizontalPadding,
            borderRadius: radius,
            borderColor: theme.queueBorder,
            backgroundColor: theme.queueSurface,
          },
        ]}
      >
        <DueBubblePreview size={typography.queueBubbleSize} reminder={reminder} />
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          adjustsFontSizeToFit
          style={[
            styles.queueTitle,
            { color: theme.primaryText, fontSize: typography.queueTitleFontSize },
          ]}
        >
          {reminder.title}
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[
            styles.queueTime,
            {
              width: typography.timeWidth,
              color: theme.secondaryText,
              fontSize: typography.queueTimeFontSize,
            },
          ]}
        >
          {formatReminderBubbleDateTime(reminder.targetAt)}
        </Text>
        <DeletePreview theme={theme} />
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
  const heroReminder = plan.hero ? remindersById.get(plan.hero.reminderId) : null;

  return (
    <View
      testID={`widget-surface-${theme}`}
      style={[
        styles.surface,
        {
          width: widgetWidth,
          height: widgetHeight,
          borderColor: colors.surfaceBorder,
        },
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
          styles.ambientBubble,
          styles.ambientPrimary,
          { backgroundColor: colors.ambientPrimary },
        ]}
      />
      <View
        style={[
          styles.ambientBubble,
          styles.ambientSecondary,
          { backgroundColor: colors.ambientSecondary },
        ]}
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
          style={[
            styles.headerTitle,
            { color: colors.primaryText, fontSize: typography.headerFontSize },
          ]}
        >
          ふわっと。
        </Text>
        <View
          style={[
            styles.countChip,
            {
              borderColor: colors.heroBorder,
              backgroundColor: colors.countSurface,
            },
          ]}
        >
          <Text
            style={[
              styles.totalCount,
              { color: colors.accent, fontSize: typography.countFontSize },
            ]}
          >
            {reminders.length}件
          </Text>
        </View>
      </View>

      {reminders.length > 0 ? (
        <View
          style={[
            styles.addButtonPosition,
            {
              left: plan.addButton.left,
              top: plan.addButton.top,
              width: plan.addButton.width,
              height: plan.addButton.height,
              borderRadius: plan.addButton.height / 2,
              borderColor: colors.addButtonBorder,
              shadowColor: colors.heroShadow,
            },
          ]}
        >
          <LinearGradient
            colors={[colors.addButtonGradient.from, colors.addButtonGradient.to]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: plan.addButton.height / 2 }]}
          />
          <Text
            style={[
              styles.addButtonText,
              {
                color: colors.addButtonText,
                fontSize: plan.addButton.height <= 34 ? 20 : 24,
              },
            ]}
          >
            ＋
          </Text>
        </View>
      ) : null}

      {plan.hero && heroReminder ? (
        <HeroPreview reminder={heroReminder} layout={plan.hero} mode={plan.mode} theme={colors} />
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
          <View
            style={[
              styles.emptyBubble,
              { borderColor: colors.addButtonBorder, shadowColor: colors.accent },
            ]}
          >
            <LinearGradient
              colors={[colors.addButtonGradient.from, colors.addButtonGradient.to]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={[StyleSheet.absoluteFill, styles.emptyBubbleGradient]}
            />
            <View style={styles.emptyBubbleHighlight} />
            <Text style={[styles.emptyBubblePlus, { color: colors.addButtonText }]}>＋</Text>
          </View>
          <Text style={[styles.emptyTitle, { color: colors.primaryText }]} numberOfLines={1}>
            最初のリマインドを残そう
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.secondaryText }]}>
            タップして追加
          </Text>
        </View>
      )}

      {plan.queueRows.map((layout) => {
        const reminder = remindersById.get(layout.reminderId);

        return reminder ? (
          <QueuePreview
            key={reminder.id}
            reminder={reminder}
            layout={layout}
            mode={plan.mode}
            theme={colors}
          />
        ) : null;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
  },
  ambientBubble: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.11,
  },
  ambientPrimary: {
    top: -70,
    left: -42,
    width: 190,
    height: 190,
  },
  ambientSecondary: {
    top: 22,
    right: -64,
    width: 164,
    height: 164,
  },
  header: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: WIDGET_FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  countChip: {
    minWidth: 40,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  totalCount: {
    fontFamily: WIDGET_FONT_FAMILY,
    fontWeight: '800',
    textAlign: 'center',
  },
  addButtonPosition: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 2,
    elevation: 2,
  },
  addButtonText: {
    fontFamily: WIDGET_FONT_FAMILY,
    fontWeight: '700',
    textAlign: 'center',
  },
  positioned: {
    position: 'absolute',
  },
  shadowLayer: {
    position: 'absolute',
    left: 0,
    width: '100%',
  },
  heroSurface: {
    position: 'absolute',
    left: 0,
    width: '100%',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  heroTextContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    marginLeft: 10,
  },
  heroMetaRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroKicker: {
    flex: 1,
    fontFamily: WIDGET_FONT_FAMILY,
    fontWeight: '800',
  },
  heroTime: {
    flexShrink: 0,
    fontFamily: WIDGET_FONT_FAMILY,
    fontWeight: '700',
    textAlign: 'right',
  },
  heroTitle: {
    width: '100%',
    marginTop: 2,
    fontFamily: WIDGET_FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  queueSurface: {
    position: 'absolute',
    left: 0,
    width: '100%',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
    borderWidth: 1,
  },
  queueTitle: {
    flex: 1,
    minWidth: 0,
    marginLeft: 9,
    fontFamily: WIDGET_FONT_FAMILY,
    fontWeight: '800',
  },
  queueTime: {
    flexShrink: 0,
    marginLeft: 6,
    fontFamily: WIDGET_FONT_FAMILY,
    fontWeight: '700',
    textAlign: 'right',
  },
  deleteButton: {
    width: WIDGET_ROW_ACTION_SIZE,
    height: WIDGET_ROW_ACTION_SIZE,
    flexShrink: 0,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: WIDGET_ROW_ACTION_SIZE / 2,
    borderWidth: 1,
  },
  emptyState: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBubble: {
    width: 48,
    height: 48,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
  },
  emptyBubbleGradient: {
    borderRadius: 24,
  },
  emptyBubbleHighlight: {
    position: 'absolute',
    top: 9,
    left: 10,
    width: 14,
    height: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.54)',
    transform: [{ rotate: '-24deg' }],
  },
  emptyBubblePlus: {
    fontFamily: WIDGET_FONT_FAMILY,
    fontSize: 22,
    fontWeight: '700',
  },
  emptyTitle: {
    marginTop: 5,
    fontFamily: WIDGET_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyDescription: {
    marginTop: 1,
    fontFamily: WIDGET_FONT_FAMILY,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
});
