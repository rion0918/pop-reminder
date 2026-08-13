import type { StorybookConfig } from '@storybook/react-native';

const main = {
  stories: ['../src/**/*.stories.?(ts|tsx)'],
} satisfies StorybookConfig;

export default main;
