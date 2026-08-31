import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Accelerometer, DeviceMotion } from 'expo-sensors';

import {
  createRaiseToSpeakDetectorState,
  getSideTiltMeasurement,
  isValidGravityVector,
  RAISE_TO_SPEAK_UPDATE_INTERVAL_MS,
  reduceRaiseToSpeakDetector,
  type RaiseToSpeakDetectorState,
} from '../utils/raiseToSpeakDetector';

type UseRaiseToSpeakGestureOptions = {
  enabled: boolean;
  blocked: boolean;
  trackTiltProgress?: boolean;
  onStart: () => void;
  onStop: () => void;
};

export type RaiseToSpeakSensorStatus =
  'inactive' | 'waiting' | 'starting' | 'active' | 'unavailable';

export type RaiseToSpeakSensorFailureReason =
  'sensor-unavailable' | 'subscription-error' | 'no-valid-sample';

const SENSOR_START_TIMEOUT_MS = 3_000;

type MotionSubscription = { remove(): void };
type GravityVector = { x: number; y: number; z: number };

export function useRaiseToSpeakGesture({
  enabled,
  blocked,
  trackTiltProgress = false,
  onStart,
  onStop,
}: UseRaiseToSpeakGestureOptions) {
  const [isFocused, setIsFocused] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [sensorStatus, setSensorStatus] = useState<RaiseToSpeakSensorStatus>('inactive');
  const [sensorFailureReason, setSensorFailureReason] =
    useState<RaiseToSpeakSensorFailureReason | null>(null);
  const [tiltProgress, setTiltProgress] = useState<number | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const detectorRef = useRef<RaiseToSpeakDetectorState>(createRaiseToSpeakDetectorState());
  const onStartRef = useRef(onStart);
  const onStopRef = useRef(onStop);
  onStartRef.current = onStart;
  onStopRef.current = onStop;

  useFocusEffect(
    useCallback(() => {
      setAppState(AppState.currentState);
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  const focusGate = trackTiltProgress || isFocused;

  useEffect(() => {
    const appIsForeground =
      appState === 'active' ||
      (trackTiltProgress && appState !== 'background' && appState !== 'inactive');
    const readyToSubscribe = enabled && !blocked && appIsForeground && focusGate;
    if (!readyToSubscribe) {
      setSensorStatus(enabled ? 'waiting' : 'inactive');
      setSensorFailureReason(null);
      setTiltProgress(null);
      if (detectorRef.current.phase === 'listening') onStopRef.current();
      detectorRef.current = createRaiseToSpeakDetectorState();
      return undefined;
    }

    detectorRef.current = createRaiseToSpeakDetectorState();
    setSensorStatus('waiting');
    setSensorFailureReason(null);
    setTiltProgress(null);
    let disposed = false;
    let receivedValidSample = false;
    let motionSubscription: MotionSubscription | undefined;
    let sensorStartTimeout: ReturnType<typeof setTimeout> | undefined;

    const failSensor = (reason: RaiseToSpeakSensorFailureReason) => {
      if (disposed) return;
      if (sensorStartTimeout !== undefined) clearTimeout(sensorStartTimeout);
      sensorStartTimeout = undefined;
      motionSubscription?.remove();
      motionSubscription = undefined;
      setSensorFailureReason(reason);
      setSensorStatus('unavailable');
    };

    const handleGravity = (gravity: GravityVector | null | undefined) => {
      if (disposed) return;
      if (!isValidGravityVector(gravity)) {
        if (detectorRef.current.phase === 'idle') {
          detectorRef.current = createRaiseToSpeakDetectorState();
        }
        return;
      }
      if (!receivedValidSample) {
        receivedValidSample = true;
        if (sensorStartTimeout !== undefined) clearTimeout(sensorStartTimeout);
        sensorStartTimeout = undefined;
        setSensorFailureReason(null);
        setSensorStatus('active');
      }
      const timestamp = Date.now();
      const tiltMeasurement = getSideTiltMeasurement(gravity);
      const result = reduceRaiseToSpeakDetector(detectorRef.current, {
        timestamp,
        sideTilted: tiltMeasurement.sideTilted,
      });
      detectorRef.current = result.state;
      if (trackTiltProgress) setTiltProgress(tiltMeasurement.progress);
      if (result.action === 'start') onStartRef.current();
      if (result.action === 'stop') onStopRef.current();
    };

    const startSensor = async () => {
      try {
        const sensorAvailable = await (Platform.OS === 'android'
          ? Accelerometer.isAvailableAsync()
          : DeviceMotion.isAvailableAsync());
        if (disposed) return;
        if (!sensorAvailable) {
          failSensor('sensor-unavailable');
          return;
        }

        if (Platform.OS === 'android') {
          Accelerometer.setUpdateInterval(RAISE_TO_SPEAK_UPDATE_INTERVAL_MS);
          motionSubscription = Accelerometer.addListener(handleGravity);
        } else {
          DeviceMotion.setUpdateInterval(RAISE_TO_SPEAK_UPDATE_INTERVAL_MS);
          motionSubscription = DeviceMotion.addListener((measurement) => {
            handleGravity(measurement.accelerationIncludingGravity);
          });
        }

        if (disposed) {
          motionSubscription.remove();
          motionSubscription = undefined;
          return;
        }
        if (receivedValidSample) return;

        setSensorStatus('starting');
        sensorStartTimeout = setTimeout(() => {
          if (!receivedValidSample) failSensor('no-valid-sample');
        }, SENSOR_START_TIMEOUT_MS);
      } catch {
        failSensor('subscription-error');
      }
    };

    void startSensor();

    return () => {
      disposed = true;
      if (sensorStartTimeout !== undefined) clearTimeout(sensorStartTimeout);
      motionSubscription?.remove();
      if (detectorRef.current.phase === 'listening') onStopRef.current();
      detectorRef.current = createRaiseToSpeakDetectorState();
    };
  }, [appState, blocked, enabled, focusGate, retryVersion, trackTiltProgress]);

  const retrySensor = useCallback(() => {
    setSensorFailureReason(null);
    setTiltProgress(null);
    setRetryVersion((version) => version + 1);
  }, []);

  return {
    sensorStatus,
    sensorFailureReason,
    retrySensor,
    tiltProgress: trackTiltProgress ? tiltProgress : null,
  };
}
