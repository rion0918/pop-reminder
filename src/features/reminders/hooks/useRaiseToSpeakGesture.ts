import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import DeviceMotion from 'expo-sensors/build/DeviceMotion';

import {
  addProximityListener,
  type ProximityChangeEvent,
} from '../../../../modules/expo-proximity-sensor/src';
import {
  createRaiseToSpeakDetectorState,
  RAISE_TO_SPEAK_UPDATE_INTERVAL_MS,
  reduceRaiseToSpeakDetector,
  type RaiseToSpeakDetectorState,
  type RaiseToSpeakSample,
} from '../utils/raiseToSpeakDetector';

type UseRaiseToSpeakGestureOptions = {
  enabled: boolean;
  blocked: boolean;
  onStart: () => void;
  onStop: () => void;
};

function rotationMagnitude(rotationRate: RaiseToSpeakSample['rotationRate'] | null) {
  return rotationRate ?? 0;
}

function vectorMagnitude(vector: { x: number; y: number; z: number } | null) {
  if (!vector) return 0;
  return Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
}

function isSpeakingPose(gravity: { x: number; y: number; z: number }) {
  const magnitude = vectorMagnitude(gravity);
  if (magnitude < 1) return false;

  return Math.abs(gravity.y) / magnitude >= 0.35;
}

export function useRaiseToSpeakGesture({
  enabled,
  blocked,
  onStart,
  onStop,
}: UseRaiseToSpeakGestureOptions) {
  const [isFocused, setIsFocused] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const detectorRef = useRef<RaiseToSpeakDetectorState>(createRaiseToSpeakDetectorState());
  const nearRef = useRef(false);
  const latestSampleRef = useRef<RaiseToSpeakSample | null>(null);
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
      nearRef.current = false;
      latestSampleRef.current = null;
      return undefined;
    }

    DeviceMotion.setUpdateInterval(RAISE_TO_SPEAK_UPDATE_INTERVAL_MS);

    const processSample = (sample: RaiseToSpeakSample) => {
      latestSampleRef.current = sample;
      const result = reduceRaiseToSpeakDetector(detectorRef.current, sample);
      detectorRef.current = result.state;
      if (result.action === 'start') onStartRef.current();
      if (result.action === 'stop') onStopRef.current();
    };

    const motionSubscription = DeviceMotion.addListener((measurement) => {
      const rate = measurement.rotationRate;
      processSample({
        timestamp: Date.now(),
        upwardAcceleration: measurement.acceleration?.y ?? 0,
        motionAcceleration: vectorMagnitude(measurement.acceleration),
        rotationRate: rotationMagnitude(
          rate ? Math.max(Math.abs(rate.alpha), Math.abs(rate.beta), Math.abs(rate.gamma)) : null,
        ),
        orientation: measurement.orientation,
        near: nearRef.current,
        speakingPose: isSpeakingPose(measurement.accelerationIncludingGravity),
      });
    });

    const proximitySubscription = addProximityListener((event: ProximityChangeEvent) => {
      nearRef.current = event.near;
      const latest = latestSampleRef.current;
      if (latest) processSample({ ...latest, timestamp: Date.now(), near: event.near });
    });

    return () => {
      motionSubscription.remove();
      proximitySubscription.remove();
      if (detectorRef.current.phase === 'listening') onStopRef.current();
      detectorRef.current = createRaiseToSpeakDetectorState();
      nearRef.current = false;
      latestSampleRef.current = null;
    };
  }, [appState, blocked, enabled, isFocused]);
}
