import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export async function triggerReminderSelectionHaptic() {
  if (Platform.OS === 'web') return;

  try {
    if (Platform.OS === 'android') {
      await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick);
      return;
    }

    await Haptics.selectionAsync();
  } catch {
    // Haptics can be unavailable because of device or system settings.
  }
}
