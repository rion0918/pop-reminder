import React from 'react';
import { FlexWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import { getWidgetDueColor, widgetTheme } from './widgetColors';

type WidgetReminder = {
  id: string;
  title: string;
  targetAt: string;
};

type PopReminderWidgetProps = {
  reminders: WidgetReminder[];
  widgetWidth?: number;
  widgetHeight?: number;
};

function formatWidgetDateTime(targetAt: string): string {
  const target = new Date(targetAt);
  const now = new Date();
  const hours = String(target.getHours()).padStart(2, '0');
  const minutes = String(target.getMinutes()).padStart(2, '0');
  const time = `${hours}:${minutes}`;

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const dayAfterStart = new Date(todayStart.getTime() + 2 * 24 * 60 * 60 * 1000);
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  if (targetDay.getTime() === todayStart.getTime()) {
    return `今日 ${time}`;
  }

  if (targetDay.getTime() === tomorrowStart.getTime()) {
    return `明日 ${time}`;
  }

  if (targetDay.getTime() === dayAfterStart.getTime()) {
    return `明後日 ${time}`;
  }

  const month = target.getMonth() + 1;
  const day = target.getDate();

  if (target.getFullYear() === now.getFullYear()) {
    return `${month}/${day} ${time}`;
  }

  return `${target.getFullYear()}/${month}/${day} ${time}`;
}

function truncateTitle(title: string, maxLength: number): string {
  if (title.length <= maxLength) {
    return title;
  }

  return `${title.slice(0, maxLength - 1)}…`;
}

function BubbleItem({ reminder }: { reminder: WidgetReminder }) {
  const color = getWidgetDueColor(reminder.targetAt);
  const displayTitle = truncateTitle(reminder.title, 8);
  const displayTime = formatWidgetDateTime(reminder.targetAt);

  return (
    <FlexWidget
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color.background as ColorProp,
        borderRadius: 999,
        padding: 6,
        borderWidth: 1,
        borderColor: color.border as ColorProp,
        width: 'match_parent',
        height: 'match_parent',
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: `popreminder://reminder/${reminder.id}` }}
    >
      <TextWidget
        text={displayTitle}
        style={{
          fontSize: 12,
          fontWeight: '800',
          color: color.text as ColorProp,
          textAlign: 'center',
        }}
        maxLines={2}
      />
      <TextWidget
        text={displayTime}
        style={{
          fontSize: 10,
          fontWeight: '700',
          color: color.accent as ColorProp,
          textAlign: 'center',
          marginTop: 2,
        }}
        maxLines={1}
      />
    </FlexWidget>
  );
}

function OverflowBubble({ count }: { count: number }) {
  return (
    <FlexWidget
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6' as ColorProp,
        borderRadius: 999,
        padding: 6,
        borderWidth: 1,
        borderColor: '#E5E7EB' as ColorProp,
        width: 'match_parent',
        height: 'match_parent',
      }}
      clickAction="OPEN_APP"
    >
      <TextWidget
        text={`+${count}`}
        style={{
          fontSize: 14,
          fontWeight: '900',
          color: widgetTheme.mutedText as ColorProp,
          textAlign: 'center',
        }}
      />
      <TextWidget
        text="ほか"
        style={{
          fontSize: 9,
          fontWeight: '700',
          color: widgetTheme.mutedText as ColorProp,
          textAlign: 'center',
          marginTop: 1,
        }}
      />
    </FlexWidget>
  );
}

function EmptyState() {
  return (
    <FlexWidget
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
      }}
    >
      <TextWidget
        text="🫧"
        style={{
          fontSize: 28,
          textAlign: 'center',
        }}
      />
      <TextWidget
        text="泡はまだ浮いていません"
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: widgetTheme.mutedText as ColorProp,
          textAlign: 'center',
          marginTop: 4,
        }}
      />
    </FlexWidget>
  );
}

export function PopReminderWidget({ reminders }: PopReminderWidgetProps) {
  const MAX_VISIBLE = 3;
  const visibleReminders = reminders.slice(0, MAX_VISIBLE);
  const overflowCount = Math.max(0, reminders.length - MAX_VISIBLE);
  const hasBubbles = reminders.length > 0;

  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'column',
        backgroundColor: widgetTheme.background as ColorProp,
        borderRadius: 24,
        padding: 12,
        borderWidth: 1,
        borderColor: widgetTheme.borderColor as ColorProp,
      }}
    >
      {/* Header */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: 8,
        }}
      >
        <TextWidget
          text="🫧"
          style={{
            fontSize: 16,
          }}
        />
        <TextWidget
          text="ポップ・リマインダー"
          style={{
            fontSize: 13,
            fontWeight: '800',
            color: widgetTheme.headerText as ColorProp,
            marginLeft: 6,
          }}
        />
      </FlexWidget>

      {/* Bubble Area */}
      {hasBubbles ? (
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            flexGap: 8,
            width: 'match_parent',
            paddingHorizontal: 4,
          }}
        >
          {visibleReminders.map((reminder) => (
            <FlexWidget
              key={reminder.id}
              style={{
                flex: 1,
                height: 80,
              }}
            >
              <BubbleItem reminder={reminder} />
            </FlexWidget>
          ))}
          {overflowCount > 0 ? (
            <FlexWidget
              style={{
                flex: 1,
                height: 80,
              }}
            >
              <OverflowBubble count={overflowCount} />
            </FlexWidget>
          ) : null}
        </FlexWidget>
      ) : (
        <EmptyState />
      )}

      {/* Add Button */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: widgetTheme.addButtonBackground as ColorProp,
          borderRadius: 20,
          paddingVertical: 10,
          paddingHorizontal: 16,
          marginTop: 8,
          width: 'match_parent',
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'popreminder://add' }}
      >
        <TextWidget
          text="＋"
          style={{
            fontSize: 16,
            fontWeight: '900',
            color: widgetTheme.addButtonText as ColorProp,
          }}
        />
        <TextWidget
          text="追加"
          style={{
            fontSize: 14,
            fontWeight: '900',
            color: widgetTheme.addButtonText as ColorProp,
            marginLeft: 4,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
