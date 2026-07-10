import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Image,
  LinearGradient,
  Mask,
  Path,
  RadialGradient,
  Rect,
  Skia,
  SweepGradient,
  makeImageFromView,
  rect,
  vec,
  type SkImage,
  type SkPath,
} from '@shopify/react-native-skia';
import {
  cancelAnimation,
  Easing,
  runOnJS,
  type SharedValue,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import {
  createBubbleBurstGeometry,
  type BubbleBurstDroplet,
  type BubbleMembraneFragment,
} from './ReminderBubbleBurstGeometry';
import {
  REMINDER_BUBBLE_BURST_MS,
  REMINDER_BUBBLE_RESTORE_MS,
  REMINDER_BUBBLE_RUPTURE_MS,
  type ReminderBubbleBurstColor,
  type ReminderBubbleBurstProps,
} from './ReminderBubbleBurst.types';

export {
  REMINDER_BUBBLE_BURST_MS,
  REMINDER_BUBBLE_RESTORE_MS,
  REMINDER_BUBBLE_RUPTURE_MS,
} from './ReminderBubbleBurst.types';

function clamp01(value: number) {
  'worklet';
  return Math.min(1, Math.max(0, value));
}

function easeOutCubic(value: number) {
  'worklet';
  return 1 - (1 - value) ** 3;
}

function buildFragmentPath(fragment: BubbleMembraneFragment): SkPath {
  const [firstPoint, ...remainingPoints] = fragment.points;
  const path = Skia.Path.Make().moveTo(firstPoint.x, firstPoint.y);

  remainingPoints.forEach((point) => {
    path.lineTo(point.x, point.y);
  });

  return path.close();
}

async function triggerBubbleBurstHaptic() {
  try {
    if (Platform.OS === 'android') {
      await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Gesture_End);
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics can be unavailable because of device or system settings.
  }
}

function NativeMembraneFragment({
  fragment,
  progress,
  snapshot,
  imageX,
  imageY,
  imageWidth,
  imageHeight,
  color,
}: {
  fragment: BubbleMembraneFragment;
  progress: SharedValue<number>;
  snapshot: SkImage | null;
  imageX: number;
  imageY: number;
  imageWidth: number;
  imageHeight: number;
  color: ReminderBubbleBurstColor;
}) {
  const path = useMemo(() => buildFragmentPath(fragment), [fragment]);
  const origin = useMemo(() => vec(fragment.origin.x, fragment.origin.y), [fragment.origin]);
  const transform = useDerivedValue(() => {
    const travel = easeOutCubic(clamp01((progress.value - fragment.delay) / 0.55));

    return [
      { translateX: fragment.travelX * travel },
      { translateY: fragment.travelY * travel },
      { rotate: fragment.rotation * travel },
      { scaleX: 1 - travel * 0.48 },
      { scaleY: 1 - travel * 0.7 },
    ];
  });
  const opacity = useDerivedValue(() => {
    const appear = clamp01((progress.value - fragment.delay) / 0.08);
    const fade = clamp01((progress.value - 0.68) / 0.32);
    return appear * (1 - fade) * 0.92;
  });

  return (
    <Group origin={origin} transform={transform} opacity={opacity}>
      <Group clip={path}>
        {snapshot ? (
          <Image
            image={snapshot}
            x={imageX}
            y={imageY}
            width={imageWidth}
            height={imageHeight}
            fit="fill"
          />
        ) : (
          <Path path={path} color={color.background}>
            <LinearGradient
              start={fragment.points[0]}
              end={fragment.points[2]}
              colors={['rgba(255,255,255,0.76)', color.background, 'rgba(117,235,255,0.38)']}
              positions={[0, 0.58, 1]}
            />
          </Path>
        )}
      </Group>
      <Path path={path} style="stroke" strokeWidth={1.15} opacity={0.84}>
        <LinearGradient
          start={fragment.points[0]}
          end={fragment.points[2]}
          colors={['#FFFFFF', color.border, '#75EBFF', '#C9A7FF']}
          positions={[0, 0.4, 0.72, 1]}
        />
        <BlurMask blur={0.8} style="solid" />
      </Path>
    </Group>
  );
}

function NativeDroplet({
  droplet,
  progress,
  color,
}: {
  droplet: BubbleBurstDroplet;
  progress: SharedValue<number>;
  color: ReminderBubbleBurstColor;
}) {
  const center = useDerivedValue(() => {
    const travel = easeOutCubic(clamp01((progress.value - droplet.delay) / 0.48));
    return {
      x: droplet.origin.x + droplet.travelX * travel,
      y: droplet.origin.y + droplet.travelY * travel + droplet.gravity * travel * travel,
    };
  });
  const radius = useDerivedValue(() => {
    const travel = easeOutCubic(clamp01((progress.value - droplet.delay) / 0.48));
    return Math.max(0.2, droplet.radius * (1 - travel * 0.66));
  });
  const opacity = useDerivedValue(() => {
    const appear = clamp01((progress.value - droplet.delay) / 0.08);
    const fade = clamp01((progress.value - 0.7) / 0.3);
    return appear * (1 - fade) * 0.88;
  });

  return (
    <Circle c={center} r={radius} opacity={opacity}>
      <RadialGradient
        c={center}
        r={radius}
        colors={['#FFFFFF', '#9EEFFF', color.border, 'rgba(255,255,255,0)']}
        positions={[0, 0.38, 0.72, 1]}
      />
      <BlurMask blur={0.7} style="normal" />
    </Circle>
  );
}

export const ReminderBubbleBurst = memo(function ReminderBubbleBurst({
  reminderId,
  width,
  height,
  color,
  phase,
  isSelected,
  surfaceRef,
  onMotionComplete,
}: ReminderBubbleBurstProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const hapticProgress = useSharedValue(0);
  const mountedRef = useRef(true);
  const snapshotRef = useRef<SkImage | null>(null);
  const [burstSnapshot, setBurstSnapshot] = useState<SkImage | null>(null);
  const geometry = useMemo(
    () => createBubbleBurstGeometry(reminderId, width, height),
    [height, reminderId, width],
  );
  const bubblePath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addOval(rect(geometry.overscan, geometry.overscan, width, height));
    return path;
  }, [geometry.overscan, height, width]);
  const ruptureCenter = useMemo(
    () => vec(geometry.rupturePoint.x, geometry.rupturePoint.y),
    [geometry.rupturePoint],
  );
  const shouldPrepareSnapshot = Boolean(isSelected || phase);
  const visualSize = Math.min(width, height);
  const maxHoleRadius = Math.hypot(width, height) * 1.18;
  const completeMotion = useCallback(
    (completedPhase: NonNullable<typeof phase>) => {
      onMotionComplete?.(reminderId, completedPhase);
    },
    [onMotionComplete, reminderId],
  );

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      snapshotRef.current?.dispose();
      snapshotRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!shouldPrepareSnapshot) {
      const currentSnapshot = snapshotRef.current;
      snapshotRef.current = null;
      currentSnapshot?.dispose();
      return;
    }

    if (snapshotRef.current) {
      return;
    }

    let ignoreResult = false;
    void makeImageFromView(surfaceRef)
      .then((capturedImage) => {
        if (ignoreResult || !mountedRef.current) {
          capturedImage?.dispose();
          return;
        }

        if (capturedImage) {
          snapshotRef.current = capturedImage;
        }
      })
      .catch(() => {
        // The procedural membrane below is the intentional capture fallback.
      });

    return () => {
      ignoreResult = true;
    };
  }, [shouldPrepareSnapshot, surfaceRef]);

  useEffect(() => {
    if (phase === 'bursting') {
      setBurstSnapshot(snapshotRef.current);
      return;
    }

    if (!phase) {
      setBurstSnapshot(null);
    }
  }, [phase]);

  useEffect(() => {
    cancelAnimation(progress);
    cancelAnimation(hapticProgress);
    progress.value = 0;
    hapticProgress.value = 0;

    if (!phase) {
      return;
    }

    if (reduceMotion) {
      if (phase === 'bursting') {
        void triggerBubbleBurstHaptic();
      }
      progress.value = 1;
      void Promise.resolve().then(() => completeMotion(phase));
      return;
    }

    if (phase === 'bursting') {
      hapticProgress.value = withDelay(
        REMINDER_BUBBLE_RUPTURE_MS,
        withTiming(1, { duration: 1 }, (finished) => {
          if (finished) {
            runOnJS(triggerBubbleBurstHaptic)();
          }
        }),
      );
    }

    progress.value = withTiming(
      1,
      {
        duration: phase === 'bursting' ? REMINDER_BUBBLE_BURST_MS : REMINDER_BUBBLE_RESTORE_MS,
        easing: Easing.linear,
      },
      (finished) => {
        if (finished) {
          runOnJS(completeMotion)(phase);
        }
      },
    );

    return () => {
      cancelAnimation(progress);
      cancelAnimation(hapticProgress);
    };
  }, [completeMotion, hapticProgress, phase, progress, reduceMotion]);

  const holeRadius = useDerivedValue(() => {
    const hole = easeOutCubic(clamp01((progress.value - 0.145) / 0.263));
    return hole * maxHoleRadius;
  });
  const membraneOpacity = useDerivedValue(() => {
    const appear = clamp01((progress.value - 0.12) / 0.06);
    const fade = clamp01((progress.value - 0.68) / 0.28);
    return phase === 'bursting' ? appear * (1 - fade) : 0;
  });
  const rimOpacity = useDerivedValue(() => {
    const appear = clamp01((progress.value - 0.135) / 0.05);
    const fade = clamp01((progress.value - 0.62) / 0.28);
    return phase === 'bursting' ? appear * (1 - fade) : 0;
  });
  const restoreRadius = useDerivedValue(() => {
    const eased = easeOutCubic(progress.value);
    return visualSize * (0.86 - eased * 0.4);
  });
  const restoreOpacity = useDerivedValue(() =>
    phase === 'restoring' ? (1 - easeOutCubic(progress.value)) * 0.78 : 0,
  );

  if (!phase || reduceMotion) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.canvasContainer,
        {
          left: -geometry.overscan,
          top: -geometry.overscan,
          width: geometry.canvasWidth,
          height: geometry.canvasHeight,
        },
      ]}
    >
      <Canvas style={styles.canvas}>
        {phase === 'bursting' ? (
          <>
            <Mask
              mode="luminance"
              mask={
                <>
                  <Rect
                    x={0}
                    y={0}
                    width={geometry.canvasWidth}
                    height={geometry.canvasHeight}
                    color="white"
                  />
                  <Circle c={ruptureCenter} r={holeRadius} color="black" />
                </>
              }
            >
              <Group clip={bubblePath} opacity={membraneOpacity}>
                {burstSnapshot ? (
                  <Image
                    image={burstSnapshot}
                    x={geometry.overscan}
                    y={geometry.overscan}
                    width={width}
                    height={height}
                    fit="fill"
                  />
                ) : (
                  <Path path={bubblePath} color={color.background}>
                    <LinearGradient
                      start={vec(geometry.overscan, geometry.overscan)}
                      end={vec(geometry.overscan + width, geometry.overscan + height)}
                      colors={[
                        'rgba(255,255,255,0.72)',
                        color.background,
                        'rgba(117,235,255,0.22)',
                      ]}
                      positions={[0, 0.58, 1]}
                    />
                  </Path>
                )}
              </Group>
            </Mask>
            <Circle
              c={ruptureCenter}
              r={holeRadius}
              style="stroke"
              strokeWidth={Math.max(1.2, visualSize * 0.018)}
              opacity={rimOpacity}
            >
              <SweepGradient
                c={ruptureCenter}
                colors={['#FFFFFF', '#75EBFF', color.border, '#C9A7FF', '#FFFFFF']}
                positions={[0, 0.22, 0.52, 0.78, 1]}
              />
              <BlurMask blur={1.1} style="solid" />
            </Circle>
            {geometry.membraneFragments.map((fragment) => (
              <NativeMembraneFragment
                key={fragment.id}
                fragment={fragment}
                progress={progress}
                snapshot={burstSnapshot}
                imageX={geometry.overscan}
                imageY={geometry.overscan}
                imageWidth={width}
                imageHeight={height}
                color={color}
              />
            ))}
            <Group clip={bubblePath} invertClip>
              {geometry.droplets.map((droplet) => (
                <NativeDroplet
                  key={droplet.id}
                  droplet={droplet}
                  progress={progress}
                  color={color}
                />
              ))}
            </Group>
          </>
        ) : (
          <Circle
            c={vec(geometry.bubbleCenter.x, geometry.bubbleCenter.y)}
            r={restoreRadius}
            style="stroke"
            strokeWidth={Math.max(1.4, visualSize * 0.02)}
            opacity={restoreOpacity}
          >
            <SweepGradient
              c={vec(geometry.bubbleCenter.x, geometry.bubbleCenter.y)}
              colors={['#FFFFFF', '#75EBFF', color.border, '#C9A7FF', '#FFFFFF']}
              positions={[0, 0.24, 0.5, 0.76, 1]}
            />
            <BlurMask blur={1.6} style="solid" />
          </Circle>
        )}
      </Canvas>
    </View>
  );
});

const styles = StyleSheet.create({
  canvasContainer: {
    position: 'absolute',
    zIndex: 8,
    overflow: 'visible',
  },
  canvas: {
    flex: 1,
  },
});
