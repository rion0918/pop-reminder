import type { ComponentProps, PropsWithChildren } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { appThemes, palette, themeOptions, type AppTheme } from '../../../constants/colors';

const themeLabels: Record<AppTheme, string> = {
  sky: 'ドーン',
  lavender: 'ドリーム',
  mint: 'ブリーズ',
};

export function SettingsSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function PreviewBubble({ color, size = 40 }: { color: string; size?: number }) {
  return (
    <LinearGradient
      colors={[palette.white, color, 'rgba(255,255,255,0.45)']}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: palette.white,
      }}
    >
      <View style={styles.shine} />
    </LinearGradient>
  );
}

export function SettingsThemePicker({
  value,
  onChange,
}: {
  value: AppTheme;
  onChange: (theme: AppTheme) => void;
}) {
  return (
    <View style={styles.themeGrid}>
      {themeOptions.map((theme) => {
        const colors = appThemes[theme];
        const active = value === theme;
        return (
          <Pressable
            key={theme}
            accessibilityRole="button"
            accessibilityLabel={`${themeLabels[theme]}テーマを選択`}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(theme)}
            className="active:opacity-75"
            style={[styles.themeChoice, { borderColor: active ? colors.accent : palette.line }]}
          >
            <View
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
              style={[styles.scene, { backgroundColor: colors.background }]}
            >
              <View style={styles.largeBubble}>
                <PreviewBubble color={colors.accentSoft} size={48} />
              </View>
              <View style={styles.smallBubble}>
                <PreviewBubble color={colors.secondary} size={30} />
              </View>
              <View
                style={[
                  styles.selection,
                  { backgroundColor: active ? colors.accent : palette.white },
                ]}
              >
                {active ? <Ionicons name="checkmark" size={13} color={palette.white} /> : null}
              </View>
            </View>
            <Text style={[styles.themeLabel, { color: colors.accent }]}>{themeLabels[theme]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SettingsTimeTile({
  label,
  icon,
  value,
  color,
  background,
  onPress,
}: {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  value: string;
  color: string;
  background: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}の時刻を変更`}
      accessibilityValue={{ text: value }}
      onPress={onPress}
      className="active:opacity-75"
      style={[styles.timeTile, { backgroundColor: background }]}
    >
      <View style={styles.tileHeader}>
        <Ionicons name={icon} size={28} color={color} />
        <Text style={[styles.label, { color }]}>{label}</Text>
      </View>
      <View style={styles.tileValue}>
        <Text style={styles.time}>{value}</Text>
        <Ionicons name="create-outline" size={16} color={palette.muted} />
      </View>
    </Pressable>
  );
}

export function SettingsNotificationTimeline({
  value,
  pending,
  onPress,
}: {
  value: string;
  pending: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.timeline}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="前日のお知らせ時刻を変更"
        accessibilityValue={{ text: value }}
        accessibilityState={{ disabled: pending }}
        disabled={pending}
        onPress={onPress}
        className="active:opacity-75"
        style={styles.previousDay}
      >
        <View style={styles.tileHeader}>
          <Ionicons name="notifications-outline" size={20} color={palette.lavenderDeep} />
          <Text style={styles.label}>前日</Text>
        </View>
        {pending ? (
          <ActivityIndicator color={palette.lavenderDeep} />
        ) : (
          <Text style={styles.time}>{value}</Text>
        )}
        <Text style={styles.hint}>
          お知らせ <Ionicons name="create-outline" size={12} />
        </Text>
      </Pressable>
      <Ionicons name="arrow-forward" size={20} color={palette.muted} />
      <View style={styles.currentDay}>
        <Ionicons name="calendar-outline" size={26} color={palette.muted} />
        <Text style={styles.label}>当日</Text>
        <Text style={styles.hint}>予定の日時</Text>
      </View>
    </View>
  );
}

export function SettingsAutoDeletePreview({ enabled }: { enabled: boolean }) {
  return (
    <View>
      <View
        style={styles.illustration}
        accessibilityLabel={enabled ? '予定日を過ぎると泡を削除' : '予定日を過ぎても泡を保持'}
      >
        <View style={styles.step}>
          <PreviewBubble color={appThemes.lavender.accentSoft} />
          <Text style={styles.hint}>予定日</Text>
        </View>
        <View style={styles.step}>
          <Ionicons name="arrow-forward" size={20} color={palette.muted} />
          <Text style={styles.hint}>日付が変わる</Text>
        </View>
        <View style={styles.step}>
          {enabled ? (
            <View style={styles.emptyBubble}>
              <Ionicons name="sparkles-outline" size={20} color={palette.muted} />
            </View>
          ) : (
            <PreviewBubble color={appThemes.lavender.accentSoft} />
          )}
          <Text style={styles.hint}>{enabled ? '泡が消える' : '泡を残す'}</Text>
        </View>
      </View>
      <Text style={styles.caption}>予定日を過ぎた泡を、アプリ起動時などに削除</Text>
    </View>
  );
}

export function SettingsVoicePreview({ enabled }: { enabled: boolean }) {
  return (
    <View style={styles.voicePreview}>
      <View
        style={styles.phones}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <View style={{ transform: [{ rotate: '-22deg' }] }}>
          <Ionicons name="phone-portrait-outline" size={36} color={palette.lavenderDeep} />
        </View>
        <Ionicons name="swap-horizontal" size={20} color={palette.muted} />
        <View style={{ transform: [{ rotate: '22deg' }] }}>
          <Ionicons name="phone-portrait-outline" size={36} color={palette.lavenderDeep} />
        </View>
      </View>
      <View style={styles.voiceLabel}>
        <Ionicons name={enabled ? 'mic' : 'mic-outline'} size={22} color={palette.lavenderDeep} />
        <Text style={styles.label}>{enabled ? '傾けて話す' : '傾けて音声入力'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 18,
    marginBottom: 4,
    padding: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  heading: { fontSize: 15, fontWeight: '800', color: palette.ink, marginBottom: 14 },
  themeGrid: { flexDirection: 'row', gap: 8 },
  themeChoice: {
    flex: 1,
    minWidth: 0,
    borderWidth: 2,
    borderRadius: 18,
    padding: 3,
    backgroundColor: palette.white,
  },
  scene: { height: 94, borderRadius: 13, overflow: 'hidden' },
  largeBubble: { position: 'absolute', top: 26, left: 5 },
  smallBubble: { position: 'absolute', top: 14, right: 3 },
  selection: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shine: {
    width: '28%',
    height: '12%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    marginTop: '18%',
    marginLeft: '18%',
    transform: [{ rotate: '-35deg' }],
  },
  themeLabel: { fontSize: 12, fontWeight: '800', textAlign: 'center', paddingVertical: 9 },
  timeTile: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 0,
    padding: 14,
    borderRadius: 20,
    minHeight: 100,
  },
  tileHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  tileValue: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    marginTop: 9,
  },
  label: { fontSize: 13, fontWeight: '700', color: palette.ink, flexShrink: 1 },
  time: { fontSize: 25, fontWeight: '800', color: palette.ink, fontVariant: ['tabular-nums'] },
  hint: { fontSize: 11, fontWeight: '600', color: palette.muted, textAlign: 'center' },
  timeline: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  previousDay: {
    flex: 1,
    minHeight: 112,
    borderRadius: 18,
    backgroundColor: appThemes.lavender.background,
    borderColor: appThemes.lavender.accentSoft,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  currentDay: { flex: 1, alignItems: 'center', gap: 8 },
  illustration: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  step: { flex: 1, alignItems: 'center', gap: 10 },
  emptyBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { color: palette.muted, fontSize: 12, lineHeight: 19, marginTop: 4, marginBottom: 12 },
  voicePreview: {
    backgroundColor: appThemes.lavender.background,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
  },
  phones: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  voiceLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
