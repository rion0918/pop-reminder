import { NativeModules, Platform } from 'react-native';

export type ExactAlarmPermissionStatus = {
  status: 'granted' | 'denied' | 'not-required';
  label: string;
};

type ExactAlarmPermissionNativeModule = {
  canScheduleExactAlarms(): Promise<boolean>;
  openExactAlarmSettings(): Promise<void>;
};

function getNativeModule() {
  return NativeModules.ExactAlarmPermission as ExactAlarmPermissionNativeModule | undefined;
}

export async function getExactAlarmPermissionStatus(): Promise<ExactAlarmPermissionStatus> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 31) {
    return { status: 'not-required', label: '追加許可は不要' };
  }

  const nativeModule = getNativeModule();
  if (!nativeModule) {
    console.warn('ExactAlarmPermission native module is unavailable');
    return { status: 'denied', label: '未許可' };
  }

  try {
    const granted = await nativeModule.canScheduleExactAlarms();
    return granted
      ? { status: 'granted', label: '許可済み' }
      : { status: 'denied', label: '未許可' };
  } catch (error) {
    console.warn('Failed to read exact alarm permission', error);
    return { status: 'denied', label: '未許可' };
  }
}

export async function openExactAlarmSettings() {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 31) {
    return;
  }

  const nativeModule = getNativeModule();
  if (!nativeModule) {
    throw new Error('ExactAlarmPermission native module is unavailable');
  }

  await nativeModule.openExactAlarmSettings();
}
