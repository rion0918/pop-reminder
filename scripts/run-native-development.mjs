#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ANDROID_TARGETS = new Set(['device', 'emulator']);
const IOS_TARGETS = new Set(['device', 'simulator']);

export function parseAndroidDevices(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('List of devices attached'))
    .map((line) => {
      const [id, status, ...detail] = line.split(/\s+/);
      return { id, status, detail: detail.join(' ') };
    })
    .filter((device) => device.status === 'device');
}

export function parseIosSimulatorDevices(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.match(/^(.+?) \(([0-9a-f-]{36})\) \((Booted|Shutdown)\)$/i))
    .filter(Boolean)
    .map((match) => ({
      id: match[2],
      status: match[3] === 'Booted' ? 'device' : 'available',
      detail: `${match[1]} (${match[3]})`,
    }));
}

export function parseIosPhysicalDevices(output) {
  const physicalSection = output.split(/^== Simulators ==$/m, 1)[0];

  return physicalSection
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.match(/^(.+?) \(([^)]+)\) \(([^)]+)\)$/))
    .filter((match) => match && !/\bMac\b/i.test(match[1]))
    .map((match) => ({ id: match[3], status: 'device', detail: `${match[1]} (${match[2]})` }));
}

function matchesTarget(device, target, platform) {
  if (platform === 'android') {
    return target === 'emulator'
      ? device.id.startsWith('emulator-')
      : !device.id.startsWith('emulator-');
  }

  return target === 'simulator'
    ? device.status === 'device' || device.status === 'available'
    : true;
}

export function selectTargetDevice(devices, target, platform = 'android', requestedDevice) {
  const candidates = devices.filter((device) => matchesTarget(device, target, platform));

  if (requestedDevice) {
    const selected = candidates.find((device) => device.id === requestedDevice);
    if (selected) return selected;
    throw new Error(`指定された${target}が見つかりません: ${requestedDevice}`);
  }

  if (candidates.length === 0) {
    throw new Error(`${target}が見つかりません。対象を起動・接続してから再実行してください。`);
  }

  const bootedSimulators =
    platform === 'ios' && target === 'simulator'
      ? candidates.filter((device) => device.status === 'device')
      : [];
  const preferredCandidates = bootedSimulators.length > 0 ? bootedSimulators : candidates;

  if (preferredCandidates.length > 1) {
    const devicesText = preferredCandidates
      .map((device) => `- ${device.id} ${device.detail}`)
      .join('\n');
    throw new Error(
      `対象が複数あります。次のように対象IDを指定してください:\n${devicesText}\npnpm run dev:${platform}:${target} -- <対象ID>`,
    );
  }

  return preferredCandidates[0];
}

function readCommand(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const detail = error.stderr?.toString().trim();
    throw new Error(detail || `${command} ${args.join(' ')} を実行できませんでした。`);
  }
}

function getDevices(platform, target) {
  if (platform === 'android') {
    return parseAndroidDevices(readCommand('adb', ['devices', '-l']));
  }

  if (target === 'simulator') {
    return parseIosSimulatorDevices(
      readCommand('xcrun', ['simctl', 'list', 'devices', 'available']),
    );
  }

  return parseIosPhysicalDevices(readCommand('xcrun', ['xctrace', 'list', 'devices']));
}

function runNative(platform, deviceId) {
  const expoTarget = platform === 'android' ? 'run:android' : 'run:ios';
  const result = spawnSync('pnpm', ['exec', 'expo', expoTarget, '--device', deviceId], {
    stdio: 'inherit',
  });

  return result.status ?? 1;
}

function printUsage() {
  console.error(
    [
      'Usage: node scripts/run-native-development.mjs <android|ios> <device|emulator|simulator> [device-id]',
      '',
      'Examples:',
      '  pnpm run dev:android:emulator',
      '  pnpm run dev:ios:simulator',
      '  pnpm run dev:android:emulator -- emulator-5554',
    ].join('\n'),
  );
}

function main() {
  const [platform, target, requestedDevice] = process.argv.slice(2);
  const validTargets = platform === 'android' ? ANDROID_TARGETS : IOS_TARGETS;

  if ((platform !== 'android' && platform !== 'ios') || !validTargets.has(target)) {
    printUsage();
    process.exit(1);
  }

  try {
    const devices = getDevices(platform, target);
    const selectedDevice = selectTargetDevice(devices, target, platform, requestedDevice);
    console.log(`起動対象: ${selectedDevice.id} (${selectedDevice.detail})`);
    process.exit(runNative(platform, selectedDevice.id));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
