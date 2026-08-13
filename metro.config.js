const { getDefaultConfig } = require('expo/metro-config');
const { withStorybook } = require('@storybook/react-native/withStorybook');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
const nativeWindConfig = withNativeWind(config, { input: './global.css' });

module.exports = withStorybook(nativeWindConfig, { liteMode: true });
