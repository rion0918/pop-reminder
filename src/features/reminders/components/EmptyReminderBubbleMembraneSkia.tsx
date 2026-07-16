import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  FractalNoise,
  Group,
  LinearGradient,
  Oval,
  RadialGradient,
  Skia,
  SweepGradient,
  rect,
  vec,
} from '@shopify/react-native-skia';
import { type SharedValue, useDerivedValue } from 'react-native-reanimated';

type EmptyReminderBubbleMembraneProps = {
  size: number;
  motionProgress: SharedValue<number>;
};

const thinFilmColors = [
  'rgba(255,255,255,0.78)',
  'rgba(255,210,227,0.54)',
  'rgba(255,238,198,0.4)',
  'rgba(180,237,255,0.58)',
  'rgba(170,194,255,0.5)',
  'rgba(222,190,255,0.55)',
  'rgba(255,208,226,0.48)',
  'rgba(255,255,255,0.78)',
];

const thinFilmPositions = [0, 0.13, 0.25, 0.42, 0.58, 0.72, 0.87, 1];

export default function EmptyReminderBubbleMembraneSkia({
  size,
  motionProgress,
}: EmptyReminderBubbleMembraneProps) {
  const overscan = Math.max(18, size * 0.09);
  const causticSpace = size * 0.16;
  const canvasWidth = size + overscan * 2;
  const canvasHeight = size + overscan * 2 + causticSpace;
  const center = useMemo(
    () => vec(canvasWidth / 2, overscan + size / 2),
    [canvasWidth, overscan, size],
  );
  const radius = size / 2 - Math.max(2.5, size * 0.012);
  const bubblePath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addCircle(center.x, center.y, radius);
    return path;
  }, [center, radius]);
  const causticCenter = useMemo(
    () => vec(center.x, center.y + radius + size * 0.075),
    [center, radius, size],
  );

  const thinFilmTransform = useDerivedValue(() => [{ rotate: (motionProgress.value - 0.5) * 0.2 }]);
  const reverseFilmTransform = useDerivedValue(() => [
    { rotate: (0.5 - motionProgress.value) * 0.13 },
  ]);
  const highlightTransform = useDerivedValue(() => [
    { translateX: (motionProgress.value - 0.5) * size * 0.014 },
    { translateY: (0.5 - motionProgress.value) * size * 0.01 },
  ]);
  const highlightOpacity = useDerivedValue(
    () => 0.86 + Math.sin(motionProgress.value * Math.PI * 2) * 0.08,
  );
  const causticOpacity = useDerivedValue(
    () => 0.44 + Math.sin(motionProgress.value * Math.PI * 2 + Math.PI / 3) * 0.08,
  );
  const causticScale = useDerivedValue(() => [
    { scaleX: 0.97 + motionProgress.value * 0.06 },
    { scaleY: 1.03 - motionProgress.value * 0.06 },
  ]);

  const mainCaustic = rect(
    causticCenter.x - size * 0.24,
    causticCenter.y - size * 0.022,
    size * 0.48,
    size * 0.044,
  );
  const brightCaustic = rect(
    causticCenter.x - size * 0.13,
    causticCenter.y - size * 0.012,
    size * 0.26,
    size * 0.024,
  );
  const upperHighlight = rect(
    center.x - size * 0.32,
    center.y - size * 0.3,
    size * 0.34,
    size * 0.135,
  );
  const upperHighlightCore = rect(
    center.x - size * 0.29,
    center.y - size * 0.278,
    size * 0.23,
    size * 0.075,
  );
  const lowerHighlight = rect(
    center.x + size * 0.11,
    center.y + size * 0.24,
    size * 0.25,
    size * 0.085,
  );
  const lowerHighlightCore = rect(
    center.x + size * 0.2,
    center.y + size * 0.205,
    size * 0.12,
    size * 0.04,
  );

  return (
    <View
      pointerEvents="none"
      style={[
        styles.canvasContainer,
        {
          left: -overscan,
          top: -overscan,
          width: canvasWidth,
          height: canvasHeight,
        },
      ]}
    >
      <Canvas style={styles.canvas}>
        <Group origin={causticCenter} transform={causticScale} opacity={causticOpacity}>
          <Oval rect={mainCaustic}>
            <LinearGradient
              start={vec(mainCaustic.x, causticCenter.y)}
              end={vec(mainCaustic.x + mainCaustic.width, causticCenter.y)}
              colors={[
                'rgba(126,210,255,0)',
                'rgba(126,210,255,0.58)',
                'rgba(228,187,255,0.54)',
                'rgba(255,211,190,0.46)',
                'rgba(255,255,255,0)',
              ]}
              positions={[0, 0.2, 0.5, 0.78, 1]}
            />
            <BlurMask blur={size * 0.038} style="normal" />
          </Oval>
          <Oval rect={brightCaustic} color="rgba(255,255,255,0.72)" blendMode="screen">
            <BlurMask blur={size * 0.022} style="normal" />
          </Oval>
        </Group>

        <Circle c={center} r={radius + size * 0.018} color="rgba(136,205,255,0.1)">
          <BlurMask blur={size * 0.025} style="normal" />
        </Circle>

        <Group clip={bubblePath}>
          <Circle c={center} r={radius} color="rgba(255,255,255,0.04)">
            <RadialGradient
              c={vec(center.x - size * 0.2, center.y - size * 0.23)}
              r={size * 0.88}
              colors={[
                'rgba(255,255,255,0.18)',
                'rgba(255,255,255,0.035)',
                'rgba(198,220,255,0.03)',
                'rgba(90,113,156,0.025)',
              ]}
              positions={[0, 0.4, 0.72, 1]}
            />
          </Circle>
          <Circle c={center} r={radius} opacity={0.58} blendMode="screen">
            <RadialGradient
              c={vec(center.x + size * 0.28, center.y + size * 0.18)}
              r={size * 0.63}
              colors={['rgba(255,229,238,0.1)', 'rgba(207,225,255,0.045)', 'rgba(255,255,255,0)']}
              positions={[0, 0.52, 1]}
            />
          </Circle>
          <Circle c={center} r={radius} opacity={0.032} blendMode="softLight">
            <FractalNoise
              freqX={0.011}
              freqY={0.014}
              octaves={2}
              seed={9}
              tileWidth={canvasWidth}
              tileHeight={canvasHeight}
            />
          </Circle>

          <Group transform={highlightTransform} opacity={highlightOpacity} blendMode="screen">
            <Group
              origin={vec(
                upperHighlight.x + upperHighlight.width / 2,
                upperHighlight.y + upperHighlight.height / 2,
              )}
              transform={[{ rotate: -0.52 }]}
            >
              <Oval rect={upperHighlight} color="rgba(255,255,255,0.36)">
                <BlurMask blur={size * 0.012} style="normal" />
              </Oval>
              <Oval rect={upperHighlightCore} color="rgba(255,255,255,0.76)">
                <BlurMask blur={size * 0.004} style="normal" />
              </Oval>
            </Group>
            <Oval
              x={center.x - size * 0.355}
              y={center.y - size * 0.13}
              width={size * 0.055}
              height={size * 0.12}
              color="rgba(255,255,255,0.68)"
            >
              <BlurMask blur={size * 0.004} style="normal" />
            </Oval>
            <Group
              origin={vec(
                lowerHighlight.x + lowerHighlight.width / 2,
                lowerHighlight.y + lowerHighlight.height / 2,
              )}
              transform={[{ rotate: -0.6 }]}
            >
              <Oval rect={lowerHighlight} color="rgba(255,255,255,0.3)">
                <BlurMask blur={size * 0.01} style="normal" />
              </Oval>
              <Oval rect={lowerHighlightCore} color="rgba(255,255,255,0.58)">
                <BlurMask blur={size * 0.004} style="normal" />
              </Oval>
              <Oval
                x={center.x + size * 0.29}
                y={center.y + size * 0.12}
                width={size * 0.028}
                height={size * 0.064}
                color="rgba(255,255,255,0.5)"
              >
                <BlurMask blur={size * 0.003} style="normal" />
              </Oval>
            </Group>
          </Group>
        </Group>

        <Circle
          c={center}
          r={radius - size * 0.006}
          style="stroke"
          strokeWidth={Math.max(2.4, size * 0.014)}
          opacity={0.7}
        >
          <SweepGradient
            c={center}
            colors={thinFilmColors}
            positions={thinFilmPositions}
            origin={center}
            transform={thinFilmTransform}
          />
          <BlurMask blur={size * 0.006} style="solid" />
        </Circle>
        <Circle
          c={center}
          r={radius - size * 0.028}
          style="stroke"
          strokeWidth={Math.max(1, size * 0.0055)}
          opacity={0.58}
        >
          <SweepGradient
            c={center}
            colors={thinFilmColors}
            positions={thinFilmPositions}
            origin={center}
            transform={reverseFilmTransform}
          />
          <BlurMask blur={size * 0.0025} style="solid" />
        </Circle>
        <Circle
          c={center}
          r={radius - size * 0.048}
          style="stroke"
          strokeWidth={Math.max(0.8, size * 0.004)}
          color="rgba(255,255,255,0.42)"
        />
        <Circle
          c={vec(center.x - size * 0.2, center.y - size * 0.31)}
          r={size * 0.014}
          color="rgba(255,255,255,0.92)"
          blendMode="screen"
        >
          <BlurMask blur={size * 0.006} style="normal" />
        </Circle>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  canvasContainer: {
    position: 'absolute',
    overflow: 'visible',
  },
  canvas: {
    flex: 1,
  },
});
