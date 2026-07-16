import { test } from 'node:test';

import { assertSourceContract, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './EmptyReminderBubble.tsx');
const idleMotionSource = readSource(import.meta.url, './reminderBubbleIdleMotion.ts');
const nativeMembraneSource = readSource(
  import.meta.url,
  './EmptyReminderBubbleMembrane.native.tsx',
);
const webMembraneSource = readSource(import.meta.url, './EmptyReminderBubbleMembrane.web.tsx');
const skiaMembraneSource = readSource(import.meta.url, './EmptyReminderBubbleMembraneSkia.tsx');
const fallbackMembraneSource = readSource(
  import.meta.url,
  './EmptyReminderBubbleMembraneFallback.tsx',
);

test('empty reminder bubble exposes the whole membrane as the add action without a center icon', () => {
  assertSourceContract(source, {
    includes: [
      /accessibilityRole="button"/,
      /accessibilityLabel="リマインダーを追加"/,
      /accessibilityHint="入力シートを開きます"/,
      /const isDisabled = disabled \|\| !onPress;/,
      /accessibilityState=\{\{ disabled: isDisabled \}\}/,
      /disabled=\{isDisabled\}/,
      /onPress=\{onPress\}/,
      /width: size/,
      /height: size/,
      /<EmptyReminderBubbleMembrane size=\{size\} motionProgress=\{idleProgress\} \/>/,
    ],
    excludes: [/@expo\/vector-icons/, /<Ionicons/, /<Text/, /<Image/, />\s*\+\s*</],
  });
});

test('empty reminder bubble floats gently and honors reduced motion', () => {
  assertSourceContract(source, {
    includes: [
      /import \{ makeReminderBubbleIdleMotionConfig \} from '\.\/reminderBubbleIdleMotion';/,
      /useReducedMotion/,
      /idleMotion = useMemo\(\(\) => makeReminderBubbleIdleMotionConfig\('empty-reminder', 0\), \[\]\)/,
      /duration: idleMotion\.duration/,
      /withRepeat/,
      /translateY:\s*Math\.cos\(idleProgress\.value \* Math\.PI \* 2\) \* idleMotion\.amplitudeY/,
      /translateX:\s*Math\.sin\(idleProgress\.value \* Math\.PI \* 2\) \* idleMotion\.amplitudeX/,
      /rotate:\s*`\$\{Math\.sin\(idleProgress\.value \* Math\.PI \* 2\) \* idleMotion\.rotateDeg\}deg`/,
      /onPressIn=\{handlePressIn\}/,
      /onPressOut=\{handlePressOut\}/,
      /withTiming\(1, \{ duration: 120 \}\)/,
      /scale: 1 - pressProgress\.value \* 0\.03/,
      /opacity: 1 - pressProgress\.value \* 0\.1/,
    ],
  });
  assertSourceContract(idleMotionSource, {
    includes: [
      /export type ReminderBubbleIdleMotionConfig = \{/,
      /delay: Math\.round\(unitFromHash\(seed, 1\) \* 1200\)/,
      /duration: Math\.round\(4600 \+ unitFromHash\(seed, 2\) \* 2600\)/,
      /amplitudeX: unitFromHash\(seed, 3\) \* 2\.4/,
      /amplitudeY: 2\.2 \+ unitFromHash\(seed, 4\) \* 2\.2/,
      /rotateDeg: 0\.35 \+ unitFromHash\(seed, 5\) \* 0\.35/,
    ],
  });
});

test('empty reminder bubble centers itself within the empty scene', () => {
  assertSourceContract(source, {
    includes: [/bubble: \{[\s\S]*?alignSelf: 'center'/],
  });
});

test('empty reminder bubble uses one Skia membrane canvas with thin-film light and caustics', () => {
  assertSourceContract(skiaMembraneSource, {
    includes: [
      /<Canvas/,
      /<SweepGradient/,
      /<RadialGradient/,
      /<BlurMask/,
      /thinFilmColors/,
      /causticOpacity/,
      /causticScale/,
      /pointerEvents="none"/,
    ],
    excludes: [/<Image/, /require\(/],
  });
  assertSourceContract(nativeMembraneSource, {
    includes: [/EmptyReminderBubbleMembraneSkia/, /default as EmptyReminderBubbleMembrane/],
  });
});

test('empty reminder bubble loads Skia lazily on web and keeps the previous glass fallback', () => {
  assertSourceContract(webMembraneSource, {
    includes: [
      /WithSkiaWeb/,
      /import\('\.\/EmptyReminderBubbleMembraneSkia'\)/,
      /<EmptyReminderBubbleMembraneFallback/,
      /componentProps=\{\{ size, motionProgress \}\}/,
    ],
  });
  assertSourceContract(fallbackMembraneSource, {
    includes: [/<LinearGradient/, /outerGlassRing/, /colorRim/],
    excludes: [/<Text/, /<Image/],
  });
});
