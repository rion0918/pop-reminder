import { memo, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Image,
  Mask,
  Path,
  Rect,
  Skia,
  SweepGradient,
  rect,
  rrect,
  vec,
} from '@shopify/react-native-skia';
import {
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
  useDerivedValue,
  useReducedMotion,
} from 'react-native-reanimated';

import {
  createBubbleBurstGeometry,
  type BubbleBurstDroplet,
  type BubbleMembraneFragment,
} from './ReminderBubbleBurstGeometry';
import {
  REMINDER_BUBBLE_BURST_MS,
  REMINDER_BUBBLE_RUPTURE_MS,
  type ReminderBubbleBurstProps,
} from './ReminderBubbleBurst.types';
import { clampBurstProgress, getRuptureProgress } from './reminderBubbleBurstMotion';
import { useBubbleBurstSnapshot } from './useBubbleBurstSnapshot';

async function triggerBubbleBurstHaptic() {
  try {
    if (Platform.OS === 'android') {
      await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Gesture_End);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // Device/system settings may disable haptics.
  }
}

function MembraneArc({
  fragment,
  progress,
  color,
}: {
  fragment: BubbleMembraneFragment;
  progress: SharedValue<number>;
  color: string;
}) {
  const path = useMemo(() => {
    const [start, control, end] = fragment.points;
    const path = Skia.Path.Make().moveTo(start.x, start.y);
    // Skia 2.2's native quadTo mutates the path but returns undefined.
    path.quadTo(control.x, control.y, end.x, end.y);
    return path;
  }, [fragment]);
  const local = useDerivedValue(() =>
    clampBurstProgress((progress.value - fragment.delay) / (230 / 380 - fragment.delay)),
  );
  const transform = useDerivedValue(() => [
    { translateX: fragment.travelX * local.value },
    { translateY: fragment.travelY * local.value },
    { rotate: fragment.rotation * local.value },
    { scaleY: 1 - local.value * 0.4 },
  ]);
  const opacity = useDerivedValue(() => {
    const appear = clampBurstProgress((progress.value - fragment.delay) / 0.025);
    return appear * (1 - local.value) * 0.58;
  });
  const strokeWidth = useDerivedValue(() => 0.9 - local.value * 0.65);
  const end = useDerivedValue(() => 1 - local.value * 0.75);
  return (
    <Group origin={fragment.origin} transform={transform} opacity={opacity}>
      <Path
        path={path}
        color={color}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeCap="round"
        end={end}
      />
    </Group>
  );
}

function Droplet({
  droplet,
  progress,
  color,
}: {
  droplet: BubbleBurstDroplet;
  progress: SharedValue<number>;
  color: string;
}) {
  const local = useDerivedValue(() =>
    clampBurstProgress((progress.value - droplet.delay) / (1 - droplet.delay)),
  );
  const center = useDerivedValue(() => {
    const travel = 1 - (1 - local.value) ** 2;
    return {
      x: droplet.origin.x + droplet.travelX * travel,
      y: droplet.origin.y + droplet.travelY * travel + droplet.gravity * local.value ** 2,
    };
  });
  const opacity = useDerivedValue(
    () =>
      clampBurstProgress((progress.value - droplet.delay) / 0.025) *
      (1 - local.value) ** 1.5 *
      0.55,
  );
  const radius = useDerivedValue(() => droplet.radius * (1 - local.value * 0.35));
  return <Circle c={center} r={radius} color={color} opacity={opacity} />;
}

export const ReminderBubbleBurstSkia = memo(function ReminderBubbleBurstSkia({
  reminderId,
  width,
  height,
  color,
  phase,
  isSelected,
  hapticsEnabled = true,
  surfaceRef,
  surfaceKey,
  surfaceReady,
  motion,
}: ReminderBubbleBurstProps) {
  const reduceMotion = useReducedMotion();
  const { progress, membraneMode, activePhase } = motion;
  const snapshot = useBubbleBurstSnapshot({
    surfaceRef,
    surfaceKey,
    surfaceReady,
    motion,
    prepare: !reduceMotion && Boolean(isSelected || phase === 'bursting'),
  });
  const geometry = useMemo(
    () => createBubbleBurstGeometry(reminderId, width, height),
    [reminderId, width, height],
  );
  const bubblePath = useMemo(
    () =>
      Skia.Path.Make().addRRect(
        rrect(
          rect(geometry.overscan, geometry.overscan, width, height),
          geometry.cornerRadius,
          geometry.cornerRadius,
        ),
      ),
    [geometry, width, height],
  );
  const holePath = useMemo(() => {
    const path = Skia.Path.Make().moveTo(geometry.holePoints[0].x, geometry.holePoints[0].y);
    for (const point of geometry.holePoints.slice(1)) path.lineTo(point.x, point.y);
    return path.close();
  }, [geometry]);
  const holeTransform = useDerivedValue(() => [
    { translateX: geometry.rupturePoint.x },
    { translateY: geometry.rupturePoint.y },
    { scale: getRuptureProgress(progress.value) * geometry.maxHoleRadius },
  ]);
  const membraneOpacity = useDerivedValue(() =>
    membraneMode.value === 1 && progress.value >= 55 / 380 && progress.value < 130 / 380 ? 1 : 0,
  );

  useAnimatedReaction(
    () =>
      activePhase.value === 'bursting' &&
      progress.value >= REMINDER_BUBBLE_RUPTURE_MS / REMINDER_BUBBLE_BURST_MS,
    (ruptured, previous) => {
      if (ruptured && !previous && hapticsEnabled) runOnJS(triggerBubbleBurstHaptic)();
    },
    [hapticsEnabled],
  );

  // Keep the existing failure/restoration effect unchanged.
  const visualSize = Math.min(width, height);
  const restoreRadius = useDerivedValue(
    () => visualSize * (0.86 - (1 - (1 - progress.value) ** 3) * 0.4),
  );
  const restoreOpacity = useDerivedValue(() =>
    phase === 'restoring' ? (1 - progress.value) ** 3 * 0.78 : 0,
  );

  const padding = phase === 'restoring' ? visualSize * 0.72 : geometry.overscan;
  if ((!phase && !isSelected) || reduceMotion) return null;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        { left: -padding, top: -padding, width: width + padding * 2, height: height + padding * 2 },
      ]}
    >
      <Canvas style={styles.canvas}>
        {phase !== 'restoring' ? (
          <>
            {snapshot ? (
              <Group opacity={membraneOpacity}>
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
                      <Group transform={holeTransform}>
                        <Path path={holePath} color="black" />
                      </Group>
                    </>
                  }
                >
                  <Group clip={bubblePath}>
                    <Image
                      image={snapshot}
                      x={geometry.overscan}
                      y={geometry.overscan}
                      width={width}
                      height={height}
                      fit="fill"
                    />
                  </Group>
                </Mask>
              </Group>
            ) : null}
            {geometry.membraneFragments.map((fragment) => (
              <MembraneArc
                key={fragment.id}
                fragment={fragment}
                progress={progress}
                color={color.border}
              />
            ))}
            {geometry.droplets.map((droplet, index) => (
              <Droplet
                key={droplet.id}
                droplet={droplet}
                progress={progress}
                color={index % 3 === 0 ? color.border : 'rgba(255,255,255,0.8)'}
              />
            ))}
          </>
        ) : (
          <Circle
            c={vec(padding + width / 2, padding + height / 2)}
            r={restoreRadius}
            style="stroke"
            strokeWidth={Math.max(1.4, visualSize * 0.02)}
            opacity={restoreOpacity}
          >
            <SweepGradient
              c={vec(padding + width / 2, padding + height / 2)}
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
  container: { position: 'absolute', zIndex: 8, overflow: 'visible' },
  canvas: { flex: 1 },
});
