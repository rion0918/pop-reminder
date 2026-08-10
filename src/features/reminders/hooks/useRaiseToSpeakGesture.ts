import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import DeviceMotion from 'expo-sensors/build/DeviceMotion';

import {
  createRaiseToSpeakDetectorState,
  isRightTiltedVoicePose,
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

export function useRaiseToSpeakGesture({
  enabled,
  blocked,
  onStart,
  onStop,
}: UseRaiseToSpeakGestureOptions) {
  const [isFocused, setIsFocused] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
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
      if (detectorRef.current.phase === 'listening') onStopRef.current();
      detectorRef.current = createRaiseToSpeakDetectorState();
      return undefined;
    }

    DeviceMotion.setUpdateInterval(RAISE_TO_SPEAK_UPDATE_INTERVAL_MS);

    const motionSubscription = DeviceMotion.addListener((measurement) => {
      const timestamp = Date.now();
      const gravity = measurement.accelerationIncludingGravity;
      const result = reduceRaiseToSpeakDetector(detectorRef.current, {
        timestamp,
        rightTilted: isRightTiltedVoicePose(gravity),
      });
      detectorRef.current = result.state;
      if (result.action === 'start') onStartRef.current();
      if (result.action === 'stop') onStopRef.current();
    });

    return () => {
      motionSubscription.remove();
      if (detectorRef.current.phase === 'listening') onStopRef.current();
      detectorRef.current = createRaiseToSpeakDetectorState();
    };
  }, [appState, blocked, enabled, isFocused]);
}
