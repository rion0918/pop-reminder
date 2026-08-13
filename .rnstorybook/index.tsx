import AsyncStorage from '@react-native-async-storage/async-storage';
import type { View } from '@storybook/react-native';
import { LiteUI } from '@storybook/react-native-ui-lite';
import { AppRegistry } from 'react-native';

const { view } = require('./storybook.requires') as { view: View };

const StorybookUIRoot = view.getStorybookUI({
  CustomUIComponent: LiteUI,
  shouldPersistSelection: true,
  storage: {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
  },
});

AppRegistry.registerComponent('main', () => StorybookUIRoot);
