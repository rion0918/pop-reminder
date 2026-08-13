import { test } from 'node:test';

import {
  assertSourceContract,
  assertSourceIncludes,
  readSource,
} from '../test-utils/sourceAssertions';

const packageSource = readSource(import.meta.url, '../../package.json');
const workspaceSource = readSource(import.meta.url, '../../pnpm-workspace.yaml');
const metroSource = readSource(import.meta.url, '../../metro.config.js');
const mainSource = readSource(import.meta.url, '../../.rnstorybook/main.ts');
const indexSource = readSource(import.meta.url, '../../.rnstorybook/index.tsx');
const previewSource = readSource(import.meta.url, './PopReminderWidgetPreview.tsx');
const storiesSource = readSource(import.meta.url, './PopReminderWidgetPreview.stories.tsx');

test('Storybook is opt-in and keeps the normal Expo Router entry point unchanged', () => {
  assertSourceIncludes(packageSource, [
    /"storybook": "STORYBOOK_ENABLED=true expo start --dev-client --lan --port 8082"/,
    /"@storybook\/react-native": "10\.4\.2"/,
    /"@storybook\/react-native-ui-lite": "10\.4\.2"/,
    /"storybook": "10\.4\.2"/,
  ]);
  assertSourceContract(packageSource, {
    excludes: [/"pnpm": \{[\s\S]*?"overrides"/],
  });
  assertSourceIncludes(workspaceSource, [
    /overrides:[\s\S]*'@storybook\/react-native-ui': 10\.4\.2/,
  ]);
  assertSourceIncludes(metroSource, [
    /require\('@storybook\/react-native\/withStorybook'\)/,
    /withStorybook\(nativeWindConfig, \{ liteMode: true \}\)/,
  ]);
  assertSourceContract(mainSource, {
    includes: [/\.\.\/src\/\*\*\/\*\.stories\.\?\(ts\|tsx\)/],
    excludes: [/addon-ondevice/],
  });
  assertSourceIncludes(indexSource, [
    /import \{ LiteUI \} from '@storybook\/react-native-ui-lite';/,
    /import \{ AppRegistry \} from 'react-native';/,
    /require\('\.\/storybook\.requires'\)/,
    /view\.getStorybookUI/,
    /CustomUIComponent: LiteUI/,
    /AppRegistry\.registerComponent\('main', \(\) => StorybookUIRoot\);/,
  ]);
});

test('widget stories use a React Native preview backed by production widget contracts', () => {
  assertSourceIncludes(previewSource, [
    /getWidgetLayoutPlan/,
    /getWidgetTheme/,
    /getReminderDueColor/,
    /formatReminderBubbleDateTime/,
    /WIDGET_ROW_ACTION_SIZE/,
  ]);
  assertSourceContract(previewSource, {
    excludes: [/react-native-android-widget/, /expo-sqlite/],
  });
  assertSourceIncludes(storiesSource, [
    /export const Empty/,
    /export const SingleReminder/,
    /export const Compact/,
    /export const LongTitle/,
    /export const Expanded/,
    /export const SkyTheme/,
    /export const LavenderTheme/,
    /export const MintTheme/,
  ]);
});
