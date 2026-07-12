import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps, ElementRef } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '../../../constants/colors';
import type { Reminder } from '../types/reminder';
import { reminderTitleSchema } from '../schemas/reminderSchema';
import {
  formatReminderDetailAccessibilityDateTime,
  formatReminderDetailDate,
  formatReminderDetailTime,
  shouldShowPreviousNotification,
} from '../utils/reminderDateFormat';

type ReminderDetailSheetProps = {
  reminder: Reminder | null;
  onClose: (closedReminderId: string | null) => void;
  onDelete: (reminder: Reminder) => Promise<void>;
  onUpdateTitle: (reminder: Reminder, title: string) => Promise<Reminder>;
};

const DETAIL_SHEET_BOTTOM_CLEARANCE = 24;
const DETAIL_SHEET_MIN_DYNAMIC_CONTENT_SIZE = 320;
const DETAIL_SHEET_BASE_BOTTOM_PADDING = 28;

function NotificationTimeline({ reminder }: { reminder: Reminder }) {
  const showPreviousNotification = shouldShowPreviousNotification(reminder.previousNotifyAt);
  const previousAccessibilityDateTime = formatReminderDetailAccessibilityDateTime(
    reminder.previousNotifyAt,
  );
  const targetAccessibilityDateTime = formatReminderDetailAccessibilityDateTime(
    reminder.targetNotifyAt,
  );

  return (
    <View style={styles.timelineCard}>
      {showPreviousNotification ? (
        <View
          accessible
          accessibilityRole="text"
          accessibilityLabel={`前日のお知らせ、${previousAccessibilityDateTime}`}
          style={styles.timelineItem}
        >
          <View style={styles.timelineRail}>
            <View style={styles.previousIcon}>
              <Ionicons name="notifications-outline" size={18} color={palette.muted} />
            </View>
            <View style={styles.timelineLine} />
          </View>
          <View style={styles.timelineContent}>
            <Text style={styles.previousLabel}>まず、前日にお知らせ</Text>
            <Text style={styles.previousDate}>
              {formatReminderDetailDate(reminder.previousNotifyAt)}
            </Text>
            <Text style={styles.previousTime}>
              {formatReminderDetailTime(reminder.previousNotifyAt)}
            </Text>
          </View>
        </View>
      ) : null}

      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`当日のお知らせ、${targetAccessibilityDateTime}`}
        style={[styles.timelineItem, styles.targetTimelineItem]}
      >
        <View style={styles.timelineRail}>
          <View style={styles.targetIcon}>
            <Ionicons name="notifications" size={18} color={palette.lavenderDeep} />
          </View>
        </View>
        <View style={styles.timelineContent}>
          <Text style={styles.targetLabel}>当日にもう一度お知らせ</Text>
          <Text style={styles.targetDate}>{formatReminderDetailDate(reminder.targetNotifyAt)}</Text>
          <Text style={styles.targetTime}>{formatReminderDetailTime(reminder.targetNotifyAt)}</Text>
        </View>
      </View>
    </View>
  );
}

export function ReminderDetailSheet({
  reminder,
  onClose,
  onDelete,
  onUpdateTitle,
}: ReminderDetailSheetProps) {
  const safeAreaInsets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetRef = useRef<BottomSheetModal>(null);
  const titleInputRef = useRef<ElementRef<typeof BottomSheetTextInput>>(null);
  const isPresentedRef = useRef(false);
  const isClosingRef = useRef(false);
  const isDeleteRequestedRef = useRef(false);
  const isDeletingRef = useRef(false);
  const displayedReminderIdRef = useRef<string | null>(null);
  const closingReminderIdRef = useRef<string | null>(null);
  const latestReminderIdRef = useRef<string | null>(null);
  const pendingDeleteReminderRef = useRef<Reminder | null>(null);
  const titleEditSessionRef = useRef(0);
  const shouldDiscardTitleEditRef = useRef(false);
  const isTitleSaveRequestedRef = useRef(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmationVisible, setIsDeleteConfirmationVisible] = useState(false);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [isTitleSaving, setIsTitleSaving] = useState(false);
  const [draftTitle, setDraftTitle] = useState(reminder?.title ?? '');
  const [titleNotice, setTitleNotice] = useState<string | null>(null);
  const sheetTopInset = safeAreaInsets.top + 8;
  const detailMaxDynamicContentSize = useMemo(
    () =>
      Math.max(
        DETAIL_SHEET_MIN_DYNAMIC_CONTENT_SIZE,
        windowHeight - sheetTopInset - safeAreaInsets.bottom - DETAIL_SHEET_BOTTOM_CLEARANCE,
      ),
    [safeAreaInsets.bottom, sheetTopInset, windowHeight],
  );
  const detailContentBottomPadding = useMemo(
    () => DETAIL_SHEET_BASE_BOTTOM_PADDING + safeAreaInsets.bottom,
    [safeAreaInsets.bottom],
  );
  latestReminderIdRef.current = reminder?.id ?? null;

  useEffect(() => {
    if (!isTitleEditing && !isTitleSaving) {
      setDraftTitle(reminder?.title ?? '');
    }
  }, [isTitleEditing, isTitleSaving, reminder?.title]);

  const discardTitleEdit = useCallback(() => {
    titleEditSessionRef.current += 1;
    shouldDiscardTitleEditRef.current = true;
    isTitleSaveRequestedRef.current = false;
    setIsTitleEditing(false);
    setIsTitleSaving(false);
    setDraftTitle(reminder?.title ?? '');
    setTitleNotice(null);
  }, [reminder?.title]);

  const renderBackdrop = useCallback(
    (props: ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.16} />
    ),
    [],
  );

  useEffect(() => {
    if (!reminder) {
      if (isPresentedRef.current) {
        closingReminderIdRef.current = displayedReminderIdRef.current;
        isClosingRef.current = true;
        sheetRef.current?.dismiss();
        return;
      }

      isClosingRef.current = false;
      displayedReminderIdRef.current = null;
      return;
    }

    displayedReminderIdRef.current = reminder.id;

    if (!isPresentedRef.current) {
      isClosingRef.current = false;
      closingReminderIdRef.current = null;
      isPresentedRef.current = true;
      sheetRef.current?.present();
    }
  }, [reminder]);

  const handleDismiss = useCallback(() => {
    const closedReminderId = closingReminderIdRef.current ?? displayedReminderIdRef.current;
    const pendingReminderId = latestReminderIdRef.current;
    const pendingDeleteReminder = pendingDeleteReminderRef.current;
    pendingDeleteReminderRef.current = null;

    discardTitleEdit();
    setIsDeleteConfirmationVisible(false);

    isPresentedRef.current = false;
    if (!pendingDeleteReminder) {
      isDeleteRequestedRef.current = false;
      setIsDeleting(false);
    }

    onClose(closedReminderId);
    isClosingRef.current = false;
    closingReminderIdRef.current = null;

    if (pendingDeleteReminder) {
      displayedReminderIdRef.current = null;
      void onDelete(pendingDeleteReminder)
        .catch((error) => {
          console.warn('Failed to delete reminder', error);
          Alert.alert('削除できませんでした', '時間をおいてもう一度お試しください。');
        })
        .finally(() => {
          isDeletingRef.current = false;
          isDeleteRequestedRef.current = false;
          setIsDeleting(false);
        });
      return;
    }

    if (pendingReminderId && pendingReminderId !== closedReminderId) {
      displayedReminderIdRef.current = pendingReminderId;
      isPresentedRef.current = true;
      sheetRef.current?.present();
      return;
    }

    if (!pendingReminderId) {
      displayedReminderIdRef.current = null;
    }
  }, [discardTitleEdit, onClose, onDelete]);

  const handleClosePress = useCallback(() => {
    discardTitleEdit();
    closingReminderIdRef.current = displayedReminderIdRef.current;
    isClosingRef.current = true;
    sheetRef.current?.dismiss();
  }, [discardTitleEdit]);

  const handleSheetAnimate = useCallback(
    (_fromIndex: number, toIndex: number) => {
      if (toIndex === -1) {
        discardTitleEdit();
      }
    },
    [discardTitleEdit],
  );

  const handleTitlePress = useCallback(() => {
    if (!reminder || isTitleSaving) {
      return;
    }

    titleEditSessionRef.current += 1;
    shouldDiscardTitleEditRef.current = false;
    isTitleSaveRequestedRef.current = false;
    setDraftTitle(reminder.title);
    setTitleNotice(null);
    setIsTitleEditing(true);

    requestAnimationFrame(() => {
      titleInputRef.current?.focus();
    });
  }, [isTitleSaving, reminder]);

  const handleTitleBlur = useCallback(() => {
    const editSession = titleEditSessionRef.current;

    setIsTitleEditing(false);

    requestAnimationFrame(() => {
      if (
        !reminder ||
        shouldDiscardTitleEditRef.current ||
        editSession !== titleEditSessionRef.current ||
        isTitleSaveRequestedRef.current
      ) {
        return;
      }

      const normalizedTitle = draftTitle.trim();
      const parsedTitle = reminderTitleSchema.safeParse(normalizedTitle);

      if (!parsedTitle.success) {
        setDraftTitle(reminder.title);
        setTitleNotice('タイトルは1〜40文字で入力してください');
        return;
      }

      if (parsedTitle.data === reminder.title) {
        setDraftTitle(reminder.title);
        setTitleNotice(null);
        return;
      }

      isTitleSaveRequestedRef.current = true;
      setIsTitleSaving(true);
      void onUpdateTitle(reminder, parsedTitle.data)
        .then((updatedReminder) => {
          setDraftTitle(updatedReminder.title);
          setTitleNotice(null);
        })
        .catch((error) => {
          console.warn('Failed to update reminder title', error);
          setDraftTitle(reminder.title);
          setTitleNotice('タイトルを保存できませんでした');
        })
        .finally(() => {
          isTitleSaveRequestedRef.current = false;
          setIsTitleSaving(false);
        });
    });
  }, [draftTitle, onUpdateTitle, reminder]);

  const handleDeletePress = useCallback(() => {
    if (!reminder || isDeleting || isDeleteRequestedRef.current) {
      return;
    }

    discardTitleEdit();
    isDeleteRequestedRef.current = true;
    setIsDeleteConfirmationVisible(true);
  }, [discardTitleEdit, isDeleting, reminder]);

  const handleCancelDelete = useCallback(() => {
    setIsDeleteConfirmationVisible(false);
    isDeleteRequestedRef.current = false;
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!reminder || isDeleting || !isDeleteRequestedRef.current) {
      return;
    }

    setIsDeleteConfirmationVisible(false);
    isDeletingRef.current = true;
    setIsDeleting(true);
    pendingDeleteReminderRef.current = reminder;
    closingReminderIdRef.current = displayedReminderIdRef.current;
    isClosingRef.current = true;
    sheetRef.current?.dismiss();
  }, [isDeleting, reminder]);

  return (
    <>
      <BottomSheetModal
        name="reminder-detail"
        ref={sheetRef}
        stackBehavior="replace"
        enableDismissOnClose
        enableDynamicSizing
        enablePanDownToClose
        maxDynamicContentSize={detailMaxDynamicContentSize}
        onAnimate={handleSheetAnimate}
        onDismiss={handleDismiss}
        topInset={sheetTopInset}
        bottomInset={safeAreaInsets.bottom}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.sheetBackground}
      >
        <BottomSheetScrollView
          contentContainerStyle={[styles.content, { paddingBottom: detailContentBottomPadding }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.kicker}>ふわっと思い出す予定</Text>
              {isTitleEditing ? (
                <BottomSheetTextInput
                  ref={titleInputRef}
                  accessibilityLabel="リマインダーのタイトル"
                  value={draftTitle}
                  onChangeText={setDraftTitle}
                  onBlur={handleTitleBlur}
                  onSubmitEditing={() => titleInputRef.current?.blur()}
                  blurOnSubmit={false}
                  returnKeyType="done"
                  style={styles.titleInput}
                />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="タイトルを編集"
                  accessibilityState={{ disabled: !reminder || isTitleSaving }}
                  disabled={!reminder || isTitleSaving}
                  onPress={handleTitlePress}
                  style={({ pressed }) => [
                    styles.titlePressable,
                    pressed && !isTitleSaving ? styles.titlePressablePressed : null,
                  ]}
                >
                  <Text numberOfLines={2} ellipsizeMode="tail" style={styles.title}>
                    {reminder?.title ?? ''}
                  </Text>
                </Pressable>
              )}
              {titleNotice ? <Text style={styles.titleNotice}>{titleNotice}</Text> : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="詳細を閉じる"
              onPress={handleClosePress}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={palette.ink} />
            </Pressable>
          </View>

          {reminder ? <NotificationTimeline reminder={reminder} /> : null}

          <View style={styles.deleteActionSpacer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="このシャボン玉を削除する"
              accessibilityState={{ disabled: !reminder || isDeleting }}
              onPress={handleDeletePress}
              disabled={!reminder || isDeleting}
              style={({ pressed }) => [
                styles.deleteAction,
                pressed && !isDeleting ? styles.deleteActionPressed : null,
                !reminder || isDeleting ? styles.deleteActionDisabled : null,
              ]}
            >
              <View style={styles.deleteActionContent}>
                <Ionicons name="trash-outline" size={18} color={palette.peachDeep} />
                <Text style={styles.deleteActionText}>削除する</Text>
              </View>
            </Pressable>
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>

      <Modal
        visible={isDeleteConfirmationVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.deleteConfirmOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="削除確認を閉じる"
            onPress={handleCancelDelete}
            style={styles.deleteConfirmBackdrop}
          />
          <View accessibilityViewIsModal style={styles.deleteConfirmCard}>
            <View style={styles.deleteConfirmHeader}>
              <View style={styles.deleteConfirmBubble}>
                <Ionicons name="ellipse-outline" size={22} color={palette.lavenderDeep} />
              </View>
              <View style={styles.deleteConfirmCopy}>
                <Text style={styles.deleteConfirmTitle}>この泡を手放しますか？</Text>
                <Text style={styles.deleteConfirmBody}>
                  予約したお知らせも、いっしょに消えます。
                </Text>
              </View>
            </View>
            <View style={styles.deleteConfirmActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="削除をやめる"
                onPress={handleCancelDelete}
                style={({ pressed }) => [
                  styles.deleteConfirmCancel,
                  pressed ? styles.deleteConfirmActionPressed : null,
                ]}
              >
                <Text style={styles.deleteConfirmCancelText}>残しておく</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="このシャボン玉を削除する"
                onPress={handleConfirmDelete}
                style={({ pressed }) => [
                  styles.deleteConfirmDestructive,
                  pressed ? styles.deleteConfirmActionPressed : null,
                ]}
              >
                <Text style={styles.deleteConfirmDestructiveText}>手放す</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  headerCopy: {
    minWidth: 0,
    flex: 1,
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
  titlePressable: {
    minHeight: 44,
    justifyContent: 'center',
  },
  titlePressablePressed: {
    opacity: 0.68,
  },
  titleInput: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: palette.ink,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '900',
    borderRadius: 14,
    backgroundColor: '#F3F6FC',
  },
  titleNotice: {
    marginTop: 4,
    color: palette.peachDeep,
    fontSize: 12,
    fontWeight: '700',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F6FC',
  },
  timelineCard: {
    borderRadius: 24,
    padding: 12,
    backgroundColor: 'rgba(246,250,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(220,233,247,0.86)',
  },
  timelineItem: {
    minHeight: 108,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    paddingRight: 14,
  },
  targetTimelineItem: {
    borderRadius: 18,
    backgroundColor: palette.white,
  },
  timelineRail: {
    width: 40,
    alignItems: 'center',
    position: 'relative',
  },
  previousIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.sky,
  },
  targetIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.lavender,
  },
  timelineLine: {
    position: 'absolute',
    top: 36,
    bottom: -38,
    width: 2,
    backgroundColor: palette.line,
  },
  timelineContent: {
    minWidth: 0,
    flex: 1,
  },
  previousLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  previousDate: {
    marginTop: 8,
    color: palette.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  previousTime: {
    marginTop: 1,
    color: palette.ink,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '800',
  },
  targetLabel: {
    color: palette.lavenderDeep,
    fontSize: 13,
    fontWeight: '900',
  },
  targetDate: {
    marginTop: 8,
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  targetTime: {
    marginTop: 1,
    color: palette.ink,
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '900',
  },
  deleteActionSpacer: {
    marginTop: 28,
    alignItems: 'flex-end',
  },
  deleteAction: {
    minWidth: 132,
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(240,168,77,0.34)',
    backgroundColor: 'rgba(255,241,216,0.72)',
  },
  deleteActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteActionText: {
    color: palette.peachDeep,
    fontSize: 15,
    fontWeight: '800',
  },
  deleteActionPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: '#FFE4B8',
  },
  deleteActionDisabled: {
    opacity: 0.42,
  },
  deleteConfirmOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  deleteConfirmBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(38,49,81,0.36)',
  },
  deleteConfirmCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    padding: 20,
    backgroundColor: 'rgba(247,251,255,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 8,
  },
  deleteConfirmHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  deleteConfirmBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.lavender,
  },
  deleteConfirmCopy: {
    minWidth: 0,
    flex: 1,
  },
  deleteConfirmTitle: {
    color: palette.ink,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '900',
  },
  deleteConfirmBody: {
    marginTop: 5,
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  deleteConfirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  deleteConfirmCancel: {
    minHeight: 48,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.white,
  },
  deleteConfirmDestructive: {
    minHeight: 48,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(240,168,77,0.42)',
    backgroundColor: 'rgba(255,241,216,0.9)',
  },
  deleteConfirmCancelText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  deleteConfirmDestructiveText: {
    color: palette.peachDeep,
    fontSize: 14,
    fontWeight: '800',
  },
  deleteConfirmActionPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
