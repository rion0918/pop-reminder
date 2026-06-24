import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { format } from 'date-fns';

import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { palette } from '../../../constants/colors';
import { Reminder } from '../types/reminder';

type ReminderDetailSheetProps = {
  reminder: Reminder | null;
  onClose: () => void;
  onDelete: (reminder: Reminder) => Promise<void>;
};

function formatDateTime(value: string) {
  return format(new Date(value), 'M/d HH:mm');
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function ReminderDetailSheet({ reminder, onClose, onDelete }: ReminderDetailSheetProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const isPresentedRef = useRef(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const snapPoints = useMemo(() => ['48%', '68%'], []);

  const renderBackdrop = useCallback(
    (props: ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.16} />
    ),
    [],
  );

  useEffect(() => {
    if (reminder && !isPresentedRef.current) {
      isPresentedRef.current = true;
      sheetRef.current?.present();
      return;
    }

    if (!reminder && isPresentedRef.current) {
      sheetRef.current?.dismiss();
    }
  }, [reminder]);

  const handleDismiss = useCallback(() => {
    isPresentedRef.current = false;
    setIsDeleting(false);
    onClose();
  }, [onClose]);

  const handleClosePress = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  const handleDeletePress = useCallback(() => {
    if (!reminder || isDeleting) {
      return;
    }

    Alert.alert(
      'リマインダーを削除しますか？',
      '予約済みの通知も一緒にキャンセルします。',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => {
            setIsDeleting(true);
            sheetRef.current?.dismiss();
            setTimeout(() => {
              void onDelete(reminder)
                .catch((error) => {
                  console.warn('Failed to delete reminder', error);
                  Alert.alert('削除できませんでした', '時間をおいてもう一度お試しください。');
                })
                .finally(() => {
                  setIsDeleting(false);
                });
            }, 160);
          },
        },
      ],
    );
  }, [isDeleting, onDelete, reminder]);

  return (
    <BottomSheetModal
      name="reminder-detail"
      ref={sheetRef}
      snapPoints={snapPoints}
      stackBehavior="replace"
      enableDismissOnClose
      enablePanDownToClose
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheetBackground}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>リマインダー詳細</Text>
            <Text numberOfLines={2} ellipsizeMode="tail" style={styles.title}>
              {reminder?.title ?? ''}
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={handleClosePress} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={palette.ink} />
          </Pressable>
        </View>

        {reminder ? (
          <View style={styles.detailGroup}>
            <DetailRow label="通知日時" value={formatDateTime(reminder.targetAt)} />
            <View style={styles.divider} />
            <DetailRow label="前日通知時刻" value={formatDateTime(reminder.previousNotifyAt)} />
            <View style={styles.divider} />
            <DetailRow label="当日通知時刻" value={formatDateTime(reminder.targetNotifyAt)} />
          </View>
        ) : null}

        <PrimaryButton
          label={isDeleting ? '削除中' : '削除する'}
          icon="trash-outline"
          onPress={handleDeletePress}
          disabled={!reminder || isDeleting}
          style={styles.deleteButton}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    width: 48,
    backgroundColor: '#C6D0E4',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 18,
  },
  kicker: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  title: {
    color: palette.ink,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '900',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F6FC',
  },
  detailGroup: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(246,250,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(220,233,247,0.86)',
  },
  detailRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  detailLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  detailValue: {
    flexShrink: 1,
    color: palette.ink,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(220,233,247,0.88)',
  },
  deleteButton: {
    marginTop: 18,
    backgroundColor: palette.peachDeep,
  },
});
