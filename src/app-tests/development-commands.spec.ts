import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

import {
  parseAndroidDevices,
  parseIosPhysicalDevices,
  parseIosSimulatorDevices,
  selectTargetDevice,
} from '../../scripts/run-native-development.mjs';

const packageConfig = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));

test('development scripts expose one daily Metro command and four target commands', () => {
  assert.equal(packageConfig.scripts.dev, 'expo start --dev-client --lan');
  assert.equal(
    packageConfig.scripts['dev:android:emulator'],
    'node scripts/run-native-development.mjs android emulator',
  );
  assert.equal(
    packageConfig.scripts['dev:ios:simulator'],
    'node scripts/run-native-development.mjs ios simulator',
  );
  assert.equal(
    packageConfig.scripts['dev:android:device'],
    'eas build --profile development --platform android',
  );
  assert.equal(
    packageConfig.scripts['dev:ios:device'],
    'eas build --profile development --platform ios',
  );
});

test('android target selection separates emulators from physical and wireless devices', () => {
  const devices = parseAndroidDevices(`
List of devices attached
emulator-5554\tdevice product:sdk_gphone model:sdk_gphone
192.168.1.25:41237\tdevice product:XIG03 model:XIG03
offline-device\toffline
`);

  assert.deepEqual(selectTargetDevice(devices, 'emulator'), {
    id: 'emulator-5554',
    status: 'device',
    detail: 'product:sdk_gphone model:sdk_gphone',
  });
  assert.deepEqual(selectTargetDevice(devices, 'device'), {
    id: '192.168.1.25:41237',
    status: 'device',
    detail: 'product:XIG03 model:XIG03',
  });
});

test('ios target selection separates available simulators and physical devices', () => {
  const simulators = parseIosSimulatorDevices(`
-- iOS 18.6 --
    iPhone 16 (11111111-1111-1111-1111-111111111111) (Booted)
    iPhone 16 Pro (22222222-2222-2222-2222-222222222222) (Shutdown)
`);
  const physicalDevices = parseIosPhysicalDevices(`
== Devices ==
Taro's iPhone (26.0.1) (00008110-0000000000000001)
== Simulators ==
iPhone 16 (11111111-1111-1111-1111-111111111111) (18.6)
`);

  assert.deepEqual(selectTargetDevice(simulators, 'simulator', 'ios'), simulators[0]);
  assert.deepEqual(selectTargetDevice(physicalDevices, 'device', 'ios'), physicalDevices[0]);
});
