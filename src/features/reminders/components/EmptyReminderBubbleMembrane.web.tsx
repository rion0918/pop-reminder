import type { SharedValue } from 'react-native-reanimated';
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

import { EmptyReminderBubbleMembraneFallback } from './EmptyReminderBubbleMembraneFallback';

type EmptyReminderBubbleMembraneProps = {
  size: number;
  motionProgress: SharedValue<number>;
};

export function EmptyReminderBubbleMembrane({
  size,
  motionProgress,
}: EmptyReminderBubbleMembraneProps) {
  return (
    <WithSkiaWeb<EmptyReminderBubbleMembraneProps>
      getComponent={() => import('./EmptyReminderBubbleMembraneSkia')}
      fallback={<EmptyReminderBubbleMembraneFallback size={size} motionProgress={motionProgress} />}
      componentProps={{ size, motionProgress }}
    />
  );
}
