import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

type WidgetRouteIntent = { action?: string; id?: string; intent?: string };

export function useWidgetDetailIntent(
  { action, id, intent }: WidgetRouteIntent,
  refresh: () => Promise<readonly { id: string }[]>,
  open: (id: string) => void,
) {
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (action !== 'view' || !id || !intent) return;
    let cancelled = false;

    void refresh().then(
      (reminders) => {
        if (cancelled) return;
        if (reminders.some((reminder) => reminder.id === id)) {
          open(id);
        } else {
          Alert.alert(
            'リマインダーが見つかりません',
            'この予定は削除されたか、自動消滅しています。',
          );
        }
      },
      () => {
        if (cancelled) return;
        Alert.alert('リマインダーを読み込めませんでした', 'もう一度お試しください。', [
          { text: '閉じる', style: 'cancel' },
          {
            text: '再試行',
            onPress: () => {
              if (!cancelled) setAttempt((value) => value + 1);
            },
          },
        ]);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [action, id, intent, attempt, refresh, open]);
}
