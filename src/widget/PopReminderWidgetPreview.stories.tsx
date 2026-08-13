import type { Meta, StoryObj } from '@storybook/react-native';

import { PopReminderWidgetPreview, type WidgetPreviewReminder } from './PopReminderWidgetPreview';

const storyToday = new Date();
storyToday.setHours(9, 0, 0, 0);

function targetAt(dayOffset: number, hour: number) {
  const target = new Date(storyToday);
  target.setDate(target.getDate() + dayOffset);
  target.setHours(hour, 0, 0, 0);
  return target.toISOString();
}

const reminders: WidgetPreviewReminder[] = [
  { id: 'today', title: '牛乳を買う', targetAt: targetAt(0, 18) },
  { id: 'tomorrow', title: '歯医者を予約する', targetAt: targetAt(1, 10) },
  { id: 'soon', title: '図書館の本を返す', targetAt: targetAt(3, 17) },
  { id: 'later', title: '来週の予定を確認する', targetAt: targetAt(7, 9) },
  { id: 'fifth', title: 'クリーニングを受け取る', targetAt: targetAt(8, 19) },
  { id: 'sixth', title: '週報をまとめる', targetAt: targetAt(9, 16) },
  { id: 'seventh', title: '観葉植物に水をあげる', targetAt: targetAt(10, 8) },
  { id: 'eighth', title: 'パスポートを更新する', targetAt: targetAt(14, 11) },
  { id: 'hidden', title: '表示上限の外にある予定', targetAt: targetAt(20, 12) },
];

const meta = {
  title: 'Widget/Pop Reminder',
  component: PopReminderWidgetPreview,
} satisfies Meta<typeof PopReminderWidgetPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    reminders: [],
    widgetWidth: 250,
    widgetHeight: 180,
  },
};

export const SingleReminder: Story = {
  args: {
    reminders: reminders.slice(0, 1),
    widgetWidth: 250,
    widgetHeight: 180,
  },
};

export const Compact: Story = {
  args: {
    reminders: reminders.slice(0, 4),
    widgetWidth: 250,
    widgetHeight: 180,
  },
};

export const LongTitle: Story = {
  args: {
    reminders: [
      {
        id: 'long-title',
        title: 'とても長いリマインダーのタイトルが末尾で省略されることを確認する',
        targetAt: targetAt(1, 18),
      },
      ...reminders.slice(2, 5),
    ],
    widgetWidth: 360,
    widgetHeight: 280,
  },
};

export const Expanded: Story = {
  args: {
    reminders,
    widgetWidth: 360,
    widgetHeight: 460,
  },
};

export const SkyTheme: Story = {
  args: {
    reminders: reminders.slice(0, 5),
    theme: 'sky',
    widgetWidth: 360,
    widgetHeight: 320,
  },
};

export const LavenderTheme: Story = {
  args: {
    reminders: reminders.slice(0, 5),
    theme: 'lavender',
    widgetWidth: 360,
    widgetHeight: 320,
  },
};

export const MintTheme: Story = {
  args: {
    reminders: reminders.slice(0, 5),
    theme: 'mint',
    widgetWidth: 360,
    widgetHeight: 320,
  },
};
