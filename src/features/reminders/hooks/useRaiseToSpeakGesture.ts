import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Accelerometer from 'expo-sensors/build/Accelerometer';
import DeviceMotion from 'expo-sensors/build/DeviceMotion';

import {
  createRaiseToSpeakDetectorState,
  isSideTiltedVoicePose,
  RAISE_TO_SPEAK_UPDATE_INTERVAL_MS,
  reduceRaiseToSpeakDetector,
  type RaiseToSpeakDetectorState,
} from '../utils/raiseToSpeakDetector';

type UseRaiseToSpeakGestureOptions = {
  enabled: boolean;
  blocked: boolean;
  onStart: () => void;
  onStop: () => void;
};

export type RaiseToSpeakSensorStatus = 'inactive' | 'waiting' | 'active' | 'unavailable';

const SENSOR_START_TIMEOUT_MS = 3_000;

type MotionSubscription = { remove(): void };
type GravityVector = { x: number; y: number; z: number };

export function useRaiseToSpeakGesture({
  enabled,
  blocked,
  onStart,
  onStop,
}: UseRaiseToSpeakGestureOptions) {
  const [isFocused, setIsFocused] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [sensorStatus, setSensorStatus] = useState<RaiseToSpeakSensorStatus>('inactive');
  const [retryVersion, setRetryVersion] = useState(0);
  const detectorRef = useRef<RaiseToSpeakDetectorState>(createRaiseToSpeakDetectorState());
  const onStartRef = useRef(onStart);
  const onStopRef = useRef(onStop);
  onStartRef.current = onStart;
  onStopRef.current = onStop;

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const active = enabled && !blocked && isFocused && appState === 'active';
    if (!active) {
      setSensorStatus('inactive');
      if (detectorRef.current.phase === 'listening') onStopRef.current();
      detectorRef.current = createRaiseToSpeakDetectorState();
      return undefined;
    }

    detectorRef.current = createRaiseToSpeakDetectorState();
    setSensorStatus('waiting');
    let disposed = false;
    let receivedSample = false;
    let motionSubscription: MotionSubscription | undefined;
    const sensorStartTimeout = setTimeout(() => {
      if (!disposed && !receivedSample) setSensorStatus('unavailable');
    }, SENSOR_START_TIMEOUT_MS);

    const handleGravity = (gravity: GravityVector | null | undefined) => {
      if (disposed) return;
      if (!receivedSample) {
        receivedSample = true;
        clearTimeout(sensorStartTimeout);
        setSensorStatus('active');
      }
      const timestamp = Date.now();
      const result = reduceRaiseToSpeakDetector(detectorRef.current, {
        timestamp,
        sideTilted: isSideTiltedVoicePose(gravity),
      });
      detectorRef.current = result.state;
      if (result.action === 'start') onStartRef.current();
      if (result.action === 'stop') onStopRef.current();
    };

    try {
      if (Platform.OS === 'android') {
        Accelerometer.setUpdateInterval(RAISE_TO_SPEAK_UPDATE_INTERVAL_MS);
        motionSubscription = Accelerometer.addListener(handleGravity);
      } else {
        DeviceMotion.setUpdateInterval(RAISE_TO_SPEAK_UPDATE_INTERVAL_MS);
        motionSubscription = DeviceMotion.addListener((measurement) => {
          handleGravity(measurement.accelerationIncludingGravity);
        });
      }
    } catch {
      clearTimeout(sensorStartTimeout);
      setSensorStatus('unavailable');
    }

    return () => {
      disposed = true;
      clearTimeout(sensorStartTimeout);
      motionSubscription?.remove();
      if (detectorRef.current.phase === 'listening') onStopRef.current();
      detectorRef.current = createRaiseToSpeakDetectorState();
    };
  }, [appState, blocked, enabled, isFocused, retryVersion]);

  const retrySensor = useCallback(() => {
    setRetryVersion((version) => version + 1);
  }, []);

  return { sensorStatus, retrySensor };
}
