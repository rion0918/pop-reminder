import { type PropsWithChildren, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname } from 'expo-router';

import { useAppServices } from '../../../bootstrap/appServicesContext';
import { palette } from '../../../constants/colors';
import { useAppSettingsQuery } from '../presentation/useAppSettingsQuery';

const trackedPathnames = new Set(['/', '/reminders-list', '/settings']);

export function AnalyticsConsentGate({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { analytics } = useAppServices();
  const { settings, updateAnalyticsConsent } = useAppSettingsQuery();
  const [isSaving, setIsSaving] = useState(false);
  const didApplyPersistedConsentRef = useRef(false);

  useEffect(() => {
    if (!settings || didApplyPersistedConsentRef.current) return;
    didApplyPersistedConsentRef.current = true;

    const consent = settings?.analyticsConsent;
    if (consent === 'granted') {
      void analytics.setCaptureEnabled(true);
    } else if (consent === 'denied') {
      void analytics.setCaptureEnabled(false);
    }
  }, [analytics, settings]);

  const chooseConsent = async (consent: 'granted' | 'denied') => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      await updateAnalyticsConsent(consent);

      if (consent === 'granted' && trackedPathnames.has(pathname)) {
        analytics.captureScreen(pathname);
      }
    } catch {
      // The use case fails closed and restores the prior persisted consent.
    } finally {
      setIsSaving(false);
    }
  };

  const shouldAskForConsent = analytics.configured && settings?.analyticsConsent === 'unknown';

  return (
    <>
      {children}
      <Modal
        visible={shouldAskForConsent}
        transparent
        animationType="fade"
        onRequestClose={() => undefined}
      >
        <View style={styles.consentOverlay}>
          <View style={styles.consentCard}>
            <Text style={styles.consentTitle}>匿名の利用状況を共有しますか？</Text>
            <Text style={styles.consentBody}>
              品質改善のため、匿名ID、画面表示、リマインダー操作、通知、Pro購入導線の結果を送信します。
              タイトルや日時、音声、位置情報は送信しません。後から設定画面でいつでも変更できます。
            </Text>
            <View style={styles.consentActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="匿名の利用状況を共有しない"
                disabled={isSaving}
                onPress={() => void chooseConsent('denied')}
                style={[styles.consentButton, styles.consentButtonSecondary]}
              >
                <Text style={styles.consentButtonSecondaryLabel}>共有しない</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="匿名の利用状況を共有する"
                disabled={isSaving}
                onPress={() => void chooseConsent('granted')}
                style={[styles.consentButton, styles.consentButtonPrimary]}
              >
                <Text style={styles.consentButtonPrimaryLabel}>共有する</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  consentOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(20, 32, 58, 0.38)',
  },
  consentCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    padding: 22,
    backgroundColor: palette.white,
  },
  consentTitle: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  consentBody: {
    marginTop: 12,
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  consentActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  consentButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 13,
  },
  consentButtonSecondary: {
    borderWidth: 1,
    borderColor: '#DDE7F4',
  },
  consentButtonPrimary: {
    backgroundColor: palette.ink,
  },
  consentButtonSecondaryLabel: {
    color: palette.ink,
    fontWeight: '800',
  },
  consentButtonPrimaryLabel: {
    color: palette.white,
    fontWeight: '800',
  },
});
