import { Platform } from 'react-native';
import Accelerometer from 'expo-sensors/build/Accelerometer';
import DeviceMotion from 'expo-sensors/build/DeviceMotion';

import { voiceInputService } from './voiceInputService';

export type RaiseToSpeakPreparationResult =
  | { status: 'ready' }
  | { status: 'model-download-started' }
  | { status: 'permission-denied'; canAskAgain: boolean }
  | { status: 'motion-unavailable' }
  | { status: 'speech-unavailable' };

export async function prepareRaiseToSpeak(): Promise<RaiseToSpeakPreparationResult> {
  const motionAvailable = await (Platform.OS === 'android'
    ? Accelerometer.isAvailableAsync()
    : DeviceMotion.isAvailableAsync());

  if (!motionAvailable) return { status: 'motion-unavailable' };

  if (Platform.OS === 'ios') {
    const motionPermission = await DeviceMotion.requestPermissionsAsync();
    if (!motionPermission.granted) {
      return { status: 'permission-denied', canAskAgain: motionPermission.canAskAgain };
    }
  }

  let speechAvailability = await voiceInputService.getAvailability();
  if (speechAvailability.status === 'permission-required') {
    const permission = await voiceInputService.requestMicrophonePermission();
    if (!permission.granted) {
      return { status: 'permission-denied', canAskAgain: permission.canAskAgain };
    }
    speechAvailability = await voiceInputService.getAvailability();
  }

  if (speechAvailability.status === 'model-download-required') {
    await voiceInputService.downloadJapaneseModel();
    return { status: 'model-download-started' };
  }

  if (speechAvailability.status === 'permission-denied') {
    return {
      status: 'permission-denied',
      canAskAgain: speechAvailability.canAskAgain,
    };
  }

  if (speechAvailability.status !== 'ready') return { status: 'speech-unavailable' };
  return { status: 'ready' };
}
