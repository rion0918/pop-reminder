import { NativeModule, requireOptionalNativeModule } from 'expo';

type EventSubscription = { remove(): void };

export type ProximityChangeEvent = {
  near: boolean;
};

type ProximitySensorEvents = {
  onProximityChange: (event: ProximityChangeEvent) => void;
};

declare class ExpoProximitySensorModule extends NativeModule<ProximitySensorEvents> {
  isAvailableAsync(): Promise<boolean>;
}

const proximitySensor =
  requireOptionalNativeModule<ExpoProximitySensorModule>('ExpoProximitySensor');

export async function isProximitySensorAvailable() {
  return proximitySensor?.isAvailableAsync() ?? false;
}

export function addProximityListener(
  listener: (event: ProximityChangeEvent) => void,
): EventSubscription {
  return proximitySensor?.addListener('onProximityChange', listener) ?? { remove() {} };
}
