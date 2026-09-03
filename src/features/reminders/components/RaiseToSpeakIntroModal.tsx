import { useEffect, useRef, useState } from 'react';
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
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { palette } from '../../../constants/colors';
import type {
  RaiseToSpeakSensorFailureReason,
  RaiseToSpeakSensorStatus,
} from '../hooks/useRaiseToSpeakGesture';

const TILT_PHONE_ROTATION_DEGREES = 9;
const CALIBRATION_POSE_TIMEOUT_MS = 10_000;
const TILT_PHONE_SPRING = {
  damping: 16,
  stiffness: 90,
  mass: 0.85,
  overshootClamping: false,
} as const;
const NOOP = () => {};

type RaiseToSpeakIntroModalProps = {
  visible: boolean;
  busy: boolean;
  calibrating?: boolean;
  phase?: RaiseToSpeakCalibrationPhase;
  message: string | null;
  sensorStatus: RaiseToSpeakSensorStatus;
  sensorFailureReason: RaiseToSpeakSensorFailureReason | null;
  tiltProgress: number | null;
  onEnable: () => void;
  onDismiss: () => void;
  onRetry: () => void;
  onSuccessComplete?: () => void;
};

export type RaiseToSpeakCalibrationPhase =
  'intro' | 'preparing' | 'awaiting-tilt' | 'awaiting-upright' | 'saving' | 'success';

type TiltPhoneIllustrationProps = {
  active: boolean;
  reduceMotionEnabled: boolean;
  tiltProgress: number | null;
  phase: RaiseToSpeakCalibrationPhase;
};

function TiltPhoneIllustration({
  active,
  reduceMotionEnabled,
  tiltProgress,
  phase,
}: TiltPhoneIllustrationProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(rotation);

    if (tiltProgress !== null) {
      rotation.value = reduceMotionEnabled ? 0 : tiltProgress * TILT_PHONE_ROTATION_DEGREES;
      return () => cancelAnimation(rotation);
    }

    if (!active) {
      rotation.value = 0;
      return;
    }

    rotation.value = reduceMotionEnabled
      ? 0
      : withSequence(
          withSpring(-TILT_PHONE_ROTATION_DEGREES, TILT_PHONE_SPRING),
          withSpring(0, TILT_PHONE_SPRING),
          withSpring(TILT_PHONE_ROTATION_DEGREES, TILT_PHONE_SPRING),
          withSpring(0, TILT_PHONE_SPRING),
        );

    return () => cancelAnimation(rotation);
  }, [active, reduceMotionEnabled, rotation, tiltProgress]);

  const animatedPhoneStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (phase === 'success') {
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel="音声入力の使い方を確認しました"
        style={styles.successIllustration}
      >
        <Ionicons name="checkmark-circle" size={76} color={palette.mintDeep} />
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="スマートフォンが左右に傾く動き"
      style={styles.tiltIllustration}
    >
      <Ionicons
        name="arrow-back-outline"
        size={24}
        color={palette.lavenderDeep}
        style={styles.leftTiltArrow}
      />
      <Ionicons
        name="arrow-forward-outline"
        size={24}
        color={palette.lavenderDeep}
        style={styles.rightTiltArrow}
      />
      <Animated.View style={[styles.phoneFrame, animatedPhoneStyle]}>
        <View style={styles.phoneScreen}>
          <View style={styles.phoneSpeaker} />
          <View style={styles.phoneCamera} />
          <View style={styles.phoneScreenContent}>
            <View style={styles.phoneScreenLineWide} />
            <View style={styles.phoneScreenLine} />
            <View style={styles.phoneScreenBubble} />
          </View>
          <View style={styles.phoneHomeIndicator} />
        </View>
      </Animated.View>
    </View>
  );
}

export function RaiseToSpeakIntroModal({
  visible,
  busy,
  calibrating,
  phase,
  message,
  sensorStatus,
  sensorFailureReason,
  tiltProgress,
  onEnable,
  onDismiss,
  onRetry,
  onSuccessComplete = NOOP,
}: RaiseToSpeakIntroModalProps) {
  const setupPhase = phase ?? (calibrating ? 'awaiting-tilt' : 'intro');
  const isCalibrating = setupPhase === 'awaiting-tilt' || setupPhase === 'awaiting-upright';
  const isDismissLocked =
    busy || setupPhase === 'preparing' || setupPhase === 'saving' || setupPhase === 'success';
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const [calibrationTimedOut, setCalibrationTimedOut] = useState(false);
  const [calibrationAttempt, setCalibrationAttempt] = useState(0);
  const poseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotionEnabled);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotionEnabled,
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!visible || setupPhase !== 'awaiting-tilt') {
      setCalibrationTimedOut(false);
      if (poseTimeoutRef.current !== null) clearTimeout(poseTimeoutRef.current);
      poseTimeoutRef.current = null;
      return undefined;
    }

    setCalibrationTimedOut(false);
    if (poseTimeoutRef.current !== null) clearTimeout(poseTimeoutRef.current);
    poseTimeoutRef.current = null;

    return () => {
      if (poseTimeoutRef.current !== null) clearTimeout(poseTimeoutRef.current);
      poseTimeoutRef.current = null;
    };
  }, [calibrationAttempt, setupPhase, visible]);

  useEffect(() => {
    if (
      !visible ||
      setupPhase !== 'awaiting-tilt' ||
      sensorStatus !== 'active' ||
      poseTimeoutRef.current !== null
    ) {
      return;
    }

    poseTimeoutRef.current = setTimeout(() => {
      setCalibrationTimedOut(true);
    }, CALIBRATION_POSE_TIMEOUT_MS);
  }, [calibrationAttempt, sensorStatus, setupPhase, visible]);

  useEffect(() => {
    if (!visible || setupPhase !== 'success') return;

    const timeout = setTimeout(onSuccessComplete, 1_000);
    return () => clearTimeout(timeout);
  }, [onSuccessComplete, setupPhase, visible]);

  const handleRetry = () => {
    setCalibrationAttempt((attempt) => attempt + 1);
    setCalibrationTimedOut(false);
    onRetry();
  };

  let title = '傾けて話す';
  let body = 'スマホを左右どちらかへ傾けると音声入力を開始し、縦に戻すと終了します。';

  if (isCalibrating) {
    if (sensorStatus === 'unavailable') {
      if (sensorFailureReason === 'sensor-unavailable') {
        title = '加速度センサーを利用できません';
        body = 'この端末では加速度センサーを確認できませんでした。端末を再起動してお試しください。';
      } else if (sensorFailureReason === 'subscription-error') {
        title = 'センサーを開始できませんでした';
        body = '加速度センサーの開始に失敗しました。アプリを開いたまま、もう一度お試しください。';
      } else if (sensorFailureReason === 'no-valid-sample') {
        title = 'センサーを確認できませんでした';
        body = '加速度センサーから値を取得できませんでした。もう一度お試しください。';
      } else {
        title = 'センサーを確認できませんでした';
        body = '加速度センサーの状態を確認できませんでした。もう一度お試しください。';
      }
    } else if (setupPhase === 'awaiting-upright') {
      title = '開始の動きを確認できました';
      body = '次はスマホを縦に戻してください。音声入力も同じ操作で終了します。';
    } else if (calibrationTimedOut) {
      title = '傾きを検出できませんでした';
      body = 'いったん縦向きに戻し、画面を見たまま左右へ40度以上回転してください。';
    } else if (sensorStatus === 'waiting' || sensorStatus === 'inactive') {
      title = '準備しています…';
      body = '画面を開いたまま、少しお待ちください。';
    } else if (sensorStatus === 'starting') {
      title = 'センサーを確認しています…';
      body = 'スマホを縦向きに持ったまま、少しお待ちください。';
    } else {
      title = '左右どちらかへ傾けてください';
      body = '画面を見たまま、スマホをゆっくり40度ほど傾けます。';
    }
  } else if (setupPhase === 'saving') {
    title = '設定しています…';
    body = 'そのまま少しお待ちください。';
  } else if (setupPhase === 'preparing') {
    title = '準備しています…';
    body = 'マイクとセンサーを確認しています。';
  } else if (setupPhase === 'success') {
    title = '使い方を確認できました';
    body = '傾けて開始、縦に戻して終了できます。';
  }

  const calibrationFeedback =
    isCalibrating && sensorStatus === 'active' && !calibrationTimedOut
      ? Math.abs(tiltProgress ?? 0) >= 1
        ? setupPhase === 'awaiting-upright'
          ? 'スマホを縦に戻してください'
          : 'そのまま傾きをキープしてください'
        : Math.abs(tiltProgress ?? 0) >= 0.65
          ? setupPhase === 'awaiting-upright'
            ? 'スマホを縦に戻してください'
            : 'もう少し傾けてください'
          : setupPhase === 'awaiting-upright'
            ? '縦向きのまま少し待ってください'
            : '左右へゆっくり傾けてください'
      : null;
  const canRetry =
    setupPhase === 'awaiting-tilt' && (sensorStatus === 'unavailable' || calibrationTimedOut);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotionEnabled ? 'none' : 'fade'}
      onRequestClose={isDismissLocked ? undefined : onDismiss}
    >
      <View style={styles.overlay}>
        <View accessibilityViewIsModal style={styles.card}>
          <TiltPhoneIllustration
            active={visible && setupPhase === 'intro'}
            reduceMotionEnabled={reduceMotionEnabled}
            tiltProgress={isCalibrating ? tiltProgress : null}
            phase={setupPhase}
          />
          <Text accessibilityLiveRegion="polite" style={styles.title}>
            {title}
          </Text>
          <Text accessibilityLiveRegion="polite" style={styles.body}>
            {body}
          </Text>
          {calibrationFeedback ? (
            <Text accessibilityLiveRegion="polite" style={styles.message}>
              {calibrationFeedback}
            </Text>
          ) : null}
          {message ? (
            <Text accessibilityLiveRegion="polite" style={styles.message}>
              {message}
            </Text>
          ) : null}

          <View style={styles.actions}>
            {setupPhase === 'success' ? null : isCalibrating ||
              setupPhase === 'preparing' ||
              setupPhase === 'saving' ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="左右に傾けて音声入力の設定をキャンセル"
                  disabled={isDismissLocked}
                  onPress={onDismiss}
                  style={[styles.choiceButton, styles.secondaryButton]}
                >
                  <Text style={styles.secondaryLabel}>キャンセル</Text>
                </Pressable>
                {canRetry ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="傾きセンサーをもう一度試す"
                    accessibilityState={{ disabled: isDismissLocked, busy }}
                    disabled={isDismissLocked}
                    onPress={handleRetry}
                    style={[styles.choiceButton, styles.primaryButton]}
                  >
                    <Text style={styles.primaryLabel}>もう一度試す</Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="今は音声入力を使わない"
                  disabled={busy}
                  onPress={onDismiss}
                  style={[styles.choiceButton, styles.secondaryButton]}
                >
                  <Text style={styles.secondaryLabel}>今はしない</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="左右に傾けて音声入力を使ってみる"
                  accessibilityState={{ disabled: busy, busy }}
                  disabled={busy}
                  onPress={onEnable}
                  style={[styles.choiceButton, styles.primaryButton]}
                >
                  {busy ? <ActivityIndicator size="small" color={palette.white} /> : null}
                  <Text style={styles.primaryLabel}>{busy ? '確認中…' : '動きを試す'}</Text>
                </Pressable>
              </>
            )}
          </View>
          <View style={styles.privacyRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color={palette.mintDeep} />
            <Text style={styles.privacyText}>音声は端末内で処理し、録音を保存しません</Text>
          </View>
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
  tiltIllustration: {
    width: 190,
    height: 132,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIllustration: {
    width: 190,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftTiltArrow: {
    position: 'absolute',
    left: 14,
    top: 54,
    opacity: 0.58,
  },
  rightTiltArrow: {
    position: 'absolute',
    right: 14,
    top: 54,
    opacity: 0.58,
  },
  phoneFrame: {
    width: 64,
    height: 112,
    borderWidth: 2,
    borderColor: '#B9A6F1',
    borderRadius: 21,
    padding: 5,
    backgroundColor: 'rgba(255,255,255,0.94)',
    shadowColor: palette.lavenderDeep,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  phoneScreen: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7DEFF',
    borderRadius: 15,
    padding: 5,
    backgroundColor: '#F6F1FF',
  },
  phoneSpeaker: {
    width: 18,
    height: 3,
    marginTop: 1,
    borderRadius: 2,
    backgroundColor: '#C8B9F2',
  },
  phoneCamera: {
    position: 'absolute',
    top: 5,
    right: 7,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#A58BEA',
  },
  phoneScreenContent: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
  },
  phoneScreenLineWide: {
    width: 30,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D7CBFA',
  },
  phoneScreenLine: {
    width: 22,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2D9FC',
  },
  phoneScreenBubble: {
    width: 28,
    height: 28,
    marginTop: 7,
    borderWidth: 1,
    borderColor: '#D1C0F5',
    borderRadius: 14,
    backgroundColor: '#EDE5FF',
  },
  phoneHomeIndicator: {
    position: 'absolute',
    bottom: 6,
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#B9A6F1',
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
    marginTop: 12,
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 12,
    paddingHorizontal: 9,
    backgroundColor: '#EFFAF5',
  },
  privacyText: {
    minWidth: 0,
    flexShrink: 1,
    color: palette.mintDeep,
    fontSize: 10,
    lineHeight: 14,
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
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 20,
    gap: 8,
  },
  choiceButton: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  primaryButton: {
    backgroundColor: palette.lavenderDeep,
  },
  primaryLabel: {
    color: palette.white,
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#E3D9FF',
    backgroundColor: '#F8F6FF',
  },
  secondaryLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
  },
});
