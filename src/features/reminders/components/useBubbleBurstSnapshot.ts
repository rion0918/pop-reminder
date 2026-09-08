import { useEffect, useLayoutEffect, useState } from 'react';
import { makeImageFromView, type SkImage } from '@shopify/react-native-skia';

import {
  REMINDER_BUBBLE_BURST_MS,
  REMINDER_BUBBLE_RUPTURE_MS,
  type ReminderBubbleBurstProps,
} from './ReminderBubbleBurst.types';

export function useBubbleBurstSnapshot({
  surfaceKey,
  surfaceRef,
  surfaceReady,
  motion,
  prepare,
}: Pick<ReminderBubbleBurstProps, 'surfaceKey' | 'surfaceRef' | 'surfaceReady' | 'motion'> & {
  prepare: boolean;
}) {
  const { snapshotReady, membraneMode, progress, activePhase } = motion;
  const [capture, setCapture] = useState<{ key: string; image: SkImage } | null>(null);
  const image = prepare && capture?.key === surfaceKey ? capture.image : null;

  useLayoutEffect(() => {
    snapshotReady.value = Boolean(image);
    return () => {
      snapshotReady.value = false;
    };
  }, [image, snapshotReady]);

  useEffect(() => {
    setCapture(null);
    if (!prepare || !surfaceReady) {
      return;
    }
    let cancelled = false;
    void makeImageFromView(surfaceRef)
      .then((capturedImage) => {
        const tooLate =
          activePhase.value === 'bursting' &&
          (membraneMode.value !== -1 ||
            progress.value >= REMINDER_BUBBLE_RUPTURE_MS / REMINDER_BUBBLE_BURST_MS);
        if (cancelled || tooLate) {
          capturedImage?.dispose();
        } else if (capturedImage) {
          setCapture({ key: surfaceKey, image: capturedImage });
        }
      })
      .catch(() => {
        // A missing capture uses the same clock and restrained contour/droplet fallback.
      });
    return () => {
      cancelled = true;
    };
  }, [activePhase, membraneMode, prepare, progress, surfaceKey, surfaceRef, surfaceReady]);

  // Runs after the old image has been removed from the rendered tree.
  useEffect(
    () => () => {
      capture?.image.dispose();
    },
    [capture],
  );
  return image;
}
