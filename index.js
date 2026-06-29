import 'react-native-gesture-handler';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import 'expo-router/entry';

import { widgetTaskHandler } from './src/widget/widgetTaskHandler';

registerWidgetTaskHandler(widgetTaskHandler);
