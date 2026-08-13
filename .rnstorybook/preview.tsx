import type { Preview } from '@storybook/react-native';
import { ScrollView } from 'react-native';

const preview: Preview = {
  decorators: [
    (Story) => (
      <ScrollView
        style={{ flex: 1, backgroundColor: '#EFF8FF' }}
        contentContainerStyle={{
          minHeight: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Story />
      </ScrollView>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    options: {
      storySort: {
        order: ['Widget'],
      },
    },
  },
};

export default preview;
