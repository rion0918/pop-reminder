import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { palette } from '../../../constants/colors';

type RaiseToSpeakIntroModalProps = {
  visible: boolean;
  busy: boolean;
  calibrating: boolean;
  message: string | null;
  onEnable: () => void;
  onDismiss: () => void;
};

export function RaiseToSpeakIntroModal({
  visible,
  busy,
  calibrating,
  message,
  onEnable,
  onDismiss,
}: RaiseToSpeakIntroModalProps) {
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotionEnabled);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotionEnabled,
    );
    return () => subscription.remove();
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotionEnabled ? 'none' : 'fade'}
      onRequestClose={busy || calibrating ? undefined : onDismiss}
    >
      <View style={styles.overlay}>
        <View accessibilityViewIsModal style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={calibrating ? 'phone-portrait-outline' : 'mic'}
              size={28}
              color={palette.lavenderDeep}
            />
          </View>
          <Text style={styles.title}>
            {calibrating ? '試しに口元へ近づけてください' : '持ち上げるだけで音声入力'}
          </Text>
          <Text style={styles.body}>
            {calibrating
              ? 'スマホ下部を口元へ上げます。振動したら設定完了です。'
              : 'スマホ下部を口元へ上げると聞き取りを開始し、下げると入力内容を確認できます。'}
          </Text>
          <View style={styles.privacyRow}>
            <Ionicons name="shield-checkmark-outline" size={17} color={palette.mintDeep} />
            <Text style={styles.privacyText}>音声は端末内で処理し、録音を保存しません</Text>
          </View>

          {message ? (
            <Text accessibilityLiveRegion="polite" style={styles.message}>
              {message}
            </Text>
          ) : null}

          {!calibrating ? (
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="持ち上げて音声入力を使ってみる"
                accessibilityState={{ disabled: busy, busy }}
                disabled={busy}
                onPress={onEnable}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={palette.white} />
                ) : (
                  <Ionicons name="sparkles-outline" size={18} color={palette.white} />
                )}
                <Text style={styles.primaryLabel}>{busy ? '確認中…' : '使ってみる'}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="今は音声入力を使わない"
                disabled={busy}
                onPress={onDismiss}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed ? styles.buttonPressed : null,
                ]}
              >
                <Text style={styles.secondaryLabel}>今はしない</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: 'rgba(38,49,81,0.28)',
  },
  card: {
    alignItems: 'center',
    borderRadius: 28,
    padding: 22,
    backgroundColor: 'rgba(255,255,255,0.98)',
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 9,
  },
  iconWrap: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: '#F2EDFF',
  },
  title: {
    marginTop: 16,
    color: palette.ink,
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '900',
    textAlign: 'center',
  },
  body: {
    marginTop: 9,
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    textAlign: 'center',
  },
  privacyRow: {
    marginTop: 16,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 15,
    paddingHorizontal: 12,
    backgroundColor: '#EFFAF5',
  },
  privacyText: {
    minWidth: 0,
    flexShrink: 1,
    color: palette.mintDeep,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  message: {
    marginTop: 12,
    color: '#8B6F2D',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    marginTop: 20,
    gap: 8,
  },
  primaryButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 17,
    backgroundColor: palette.lavenderDeep,
  },
  primaryLabel: {
    color: palette.white,
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
});
