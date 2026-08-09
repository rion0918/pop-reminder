import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps, ElementRef } from 'react';
import {
  Alert,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '../../../constants/colors';
import type {
  UpdateReminderScheduleInput,
  UpdateReminderScheduleResult,
} from '../application/reminderUseCases';
import type { Reminder } from '../types/reminder';
import { reminderTitleSchema } from '../schemas/reminderSchema';
import { ReminderScheduleEditorModal } from './ReminderScheduleEditorModal';
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
  onUpdateSchedule: (
    reminder: Reminder,
    input: UpdateReminderScheduleInput,
  ) => Promise<UpdateReminderScheduleResult>;
};

const DETAIL_SHEET_BOTTOM_CLEARANCE = 24;
const DETAIL_SHEET_MIN_DYNAMIC_CONTENT_SIZE = 320;
const DETAIL_SHEET_BASE_BOTTOM_PADDING = 28;
const reminderDetailBubbles = require('../../../../assets/reminder-detail-bubbles.png');

type NotificationTimelineProps = {
  reminder: Reminder;
  isScheduleEditingDisabled: boolean;
  onEditSchedule: () => void;
};

function NotificationTimeline({
  reminder,
  isScheduleEditingDisabled,
  onEditSchedule,
}: NotificationTimelineProps) {
  const isPreviousNotificationPast = !shouldShowPreviousNotification(reminder.previousNotifyAt);
  const previousAccessibilityDateTime = formatReminderDetailAccessibilityDateTime(
    reminder.previousNotifyAt,
  );
  const targetAccessibilityDateTime = formatReminderDetailAccessibilityDateTime(
    reminder.targetNotifyAt,
  );

  return (
    <View style={styles.scheduleSection}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="当日のお知らせ日時を編集"
        accessibilityHint={targetAccessibilityDateTime}
        accessibilityState={{ disabled: isScheduleEditingDisabled }}
        disabled={isScheduleEditingDisabled}
        onPress={onEditSchedule}
        style={({ pressed }) => [
          styles.targetScheduleCard,
          pressed && !isScheduleEditingDisabled ? styles.targetScheduleCardPressed : null,
          isScheduleEditingDisabled ? styles.targetScheduleCardDisabled : null,
        ]}
      >
        <ImageBackground
          source={reminderDetailBubbles}
          resizeMode="cover"
          style={styles.targetScheduleBackground}
          imageStyle={styles.targetScheduleBackgroundImage}
        >
          <View style={styles.targetScheduleHeader}>
            <View style={styles.targetScheduleIcon}>
              <Ionicons name="notifications-outline" size={24} color={palette.lavenderDeep} />
            </View>
            <Text style={styles.targetScheduleLabel}>当日にもう一度お知らせ</Text>
          </View>
          <Text style={styles.targetScheduleDate}>
            {formatReminderDetailDate(reminder.targetNotifyAt)}
          </Text>
          <Text style={styles.targetScheduleTime}>
            {formatReminderDetailTime(reminder.targetNotifyAt)}
          </Text>
          <View style={styles.targetTimeHint}>
            <Text style={styles.targetTimeHintText}>タップして日時を変更</Text>
          </View>
        </ImageBackground>
      </Pressable>

      <View style={styles.scheduleDivider} />
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`前日のお知らせ、${previousAccessibilityDateTime}`}
        style={[
          styles.previousScheduleRow,
          isPreviousNotificationPast ? styles.previousScheduleRowPast : null,
        ]}
      >
        <View style={styles.previousScheduleIcon}>
          <Ionicons name="notifications-outline" size={19} color={palette.muted} />
        </View>
        <View style={styles.previousScheduleContent}>
          <View style={styles.previousScheduleLabelRow}>
            <Text style={styles.previousScheduleLabel}>まず、前日にお知らせ</Text>
          </View>
          <Text style={styles.previousScheduleDate}>
            {formatReminderDetailDate(reminder.previousNotifyAt)}
          </Text>
          <Text style={styles.previousScheduleTime}>
            {formatReminderDetailTime(reminder.previousNotifyAt)}
          </Text>
          {isPreviousNotificationPast ? (
            <Text style={styles.previousSchedulePastNotice}>前日のお知らせ時刻は過ぎています</Text>
          ) : null}
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
  onUpdateSchedule,
}: ReminderDetailSheetProps) {
  const safeAreaInsets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetRef = useRef<BottomSheetModal>(null);
  const titleInputRef = useRef<ElementRef<typeof BottomSheetTextInput>>(null);
  const draftTitleRef = useRef(reminder?.title ?? '');
  const isPresentedRef = useRef(false);
  const isClosingRef = useRef(false);
  const isDeleteRequestedRef = useRef(false);
  const displayedReminderIdRef = useRef<string | null>(null);
  const closingReminderIdRef = useRef<string | null>(null);
  const latestReminderIdRef = useRef<string | null>(null);
  const pendingDeleteReminderRef = useRef<Reminder | null>(null);
  const titleEditSessionRef = useRef(0);
  const shouldDiscardTitleEditRef = useRef(false);
  const isTitleSaveRequestedRef = useRef(false);
  const scheduleEditSessionRef = useRef(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [isTitleSaving, setIsTitleSaving] = useState(false);
  const [titleNotice, setTitleNotice] = useState<string | null>(null);
  const [isScheduleEditorOpen, setIsScheduleEditorOpen] = useState(false);
  const [isScheduleSaving, setIsScheduleSaving] = useState(false);
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null);
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

  const discardTitleEdit = useCallback(() => {
    titleEditSessionRef.current += 1;
    shouldDiscardTitleEditRef.current = true;
    isTitleSaveRequestedRef.current = false;
    setIsTitleEditing(false);
    setIsTitleSaving(false);
    draftTitleRef.current = reminder?.title ?? '';
    setTitleNotice(null);
  }, [reminder?.title]);

  const discardScheduleEdit = useCallback(() => {
    scheduleEditSessionRef.current += 1;
    setIsScheduleEditorOpen(false);
    setIsScheduleSaving(false);
    setScheduleNotice(null);
  }, []);

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
    discardScheduleEdit();

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
  }, [discardScheduleEdit, discardTitleEdit, onClose, onDelete]);

  const handleClosePress = useCallback(() => {
    discardTitleEdit();
    discardScheduleEdit();
    closingReminderIdRef.current = displayedReminderIdRef.current;
    isClosingRef.current = true;
    sheetRef.current?.dismiss();
  }, [discardScheduleEdit, discardTitleEdit]);

  const handleSheetAnimate = useCallback(
    (_fromIndex: number, toIndex: number) => {
      if (toIndex === -1) {
        discardTitleEdit();
        discardScheduleEdit();
      }
    },
    [discardScheduleEdit, discardTitleEdit],
  );

  const handleTitlePress = useCallback(() => {
    if (!reminder || isTitleSaving || isScheduleSaving || isScheduleEditorOpen) {
      return;
    }

    titleEditSessionRef.current += 1;
    shouldDiscardTitleEditRef.current = false;
    isTitleSaveRequestedRef.current = false;
    draftTitleRef.current = reminder.title;
    setTitleNotice(null);
    setIsTitleEditing(true);

    requestAnimationFrame(() => {
      titleInputRef.current?.focus();
    });
  }, [isScheduleEditorOpen, isScheduleSaving, isTitleSaving, reminder]);

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

      const normalizedTitle = draftTitleRef.current.trim();
      const parsedTitle = reminderTitleSchema.safeParse(normalizedTitle);

      if (!parsedTitle.success) {
        draftTitleRef.current = reminder.title;
        setTitleNotice('タイトルは1〜40文字で入力してください');
        return;
      }

      if (parsedTitle.data === reminder.title) {
        draftTitleRef.current = reminder.title;
        setTitleNotice(null);
        return;
      }

      isTitleSaveRequestedRef.current = true;
      setIsTitleSaving(true);
      void onUpdateTitle(reminder, parsedTitle.data)
        .then((updatedReminder) => {
          draftTitleRef.current = updatedReminder.title;
          setTitleNotice(null);
        })
        .catch((error) => {
          console.warn('Failed to update reminder title', error);
          draftTitleRef.current = reminder.title;
          setTitleNotice('タイトルを保存できませんでした');
        })
        .finally(() => {
          isTitleSaveRequestedRef.current = false;
          setIsTitleSaving(false);
        });
    });
  }, [onUpdateTitle, reminder]);

  const handleSchedulePress = useCallback(() => {
    if (!reminder || isTitleEditing || isTitleSaving || isScheduleSaving) {
      return;
    }

    setScheduleNotice(null);
    setIsScheduleEditorOpen(true);
  }, [isScheduleSaving, isTitleEditing, isTitleSaving, reminder]);

  const handleScheduleConfirm = useCallback(
    async (input: UpdateReminderScheduleInput) => {
      if (!reminder || isScheduleSaving) {
        return;
      }

      const editSession = scheduleEditSessionRef.current + 1;
      scheduleEditSessionRef.current = editSession;
      setScheduleNotice(null);
      setIsScheduleSaving(true);

      try {
        const result = await onUpdateSchedule(reminder, input);
        if (editSession !== scheduleEditSessionRef.current) {
          return;
        }

        setIsScheduleEditorOpen(false);
        if (result.notification.status === 'not-scheduled') {
          setScheduleNotice('日時は変更しましたが、通知を予約できませんでした');
        } else if (result.notification.status === 'partial') {
          setScheduleNotice('日時は変更しましたが、前日通知を予約できませんでした');
        } else {
          setScheduleNotice(null);
        }
      } catch (error) {
        if (editSession !== scheduleEditSessionRef.current) {
          return;
        }

        console.warn('Failed to update reminder schedule', error);
        setScheduleNotice('日時を保存できませんでした');
      } finally {
        if (editSession === scheduleEditSessionRef.current) {
          setIsScheduleSaving(false);
        }
      }
    },
    [isScheduleSaving, onUpdateSchedule, reminder],
  );

  const handleDeletePress = useCallback(() => {
    if (!reminder || isDeleting || isScheduleSaving || isDeleteRequestedRef.current) {
      return;
    }

    discardTitleEdit();
    discardScheduleEdit();
    isDeleteRequestedRef.current = true;
    setIsDeleting(true);
    pendingDeleteReminderRef.current = reminder;
    closingReminderIdRef.current = displayedReminderIdRef.current;
    isClosingRef.current = true;
    sheetRef.current?.dismiss();
  }, [discardScheduleEdit, discardTitleEdit, isDeleting, isScheduleSaving, reminder]);

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
                  defaultValue={draftTitleRef.current}
                  onChangeText={(text) => {
                    draftTitleRef.current = text;
                  }}
                  onBlur={handleTitleBlur}
                  onSubmitEditing={() => titleInputRef.current?.blur()}
                  keyboardType="default"
                  autoCorrect
                  spellCheck={false}
                  autoCapitalize="none"
                  blurOnSubmit={false}
                  returnKeyType="done"
                  style={styles.titleInput}
                />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="タイトルを編集"
                  accessibilityState={{
                    disabled: !reminder || isTitleSaving || isScheduleSaving,
                  }}
                  disabled={!reminder || isTitleSaving || isScheduleSaving}
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
              <Ionicons name="close" size={24} color={palette.ink} />
            </Pressable>
          </View>

          {reminder ? (
            <NotificationTimeline
              reminder={reminder}
              isScheduleEditingDisabled={
                isTitleEditing || isTitleSaving || isScheduleSaving || isDeleting
              }
              onEditSchedule={handleSchedulePress}
            />
          ) : null}

          {scheduleNotice ? <Text style={styles.timeNotice}>{scheduleNotice}</Text> : null}

          <View style={styles.deleteActionSpacer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="このシャボン玉を削除する"
              accessibilityState={{ disabled: !reminder || isDeleting || isScheduleSaving }}
              onPress={handleDeletePress}
              disabled={!reminder || isDeleting || isScheduleSaving}
              style={({ pressed }) => [
                styles.deleteAction,
                pressed && !isDeleting ? styles.deleteActionPressed : null,
                !reminder || isDeleting || isScheduleSaving ? styles.deleteActionDisabled : null,
              ]}
            >
              <View style={styles.deleteActionContent}>
                <Ionicons name="trash-outline" size={19} color={palette.peachDeep} />
                <Text style={styles.deleteActionText}>削除する</Text>
              </View>
            </Pressable>
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>

      {reminder ? (
        <ReminderScheduleEditorModal
          visible={isScheduleEditorOpen}
          reminder={reminder}
          isSaving={isScheduleSaving}
          onConfirm={handleScheduleConfirm}
          onClose={() => setIsScheduleEditorOpen(false)}
        />
      ) : null}
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
    marginBottom: 22,
  },
  headerCopy: {
    minWidth: 0,
    flex: 1,
  },
  kicker: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  title: {
    color: palette.ink,
    fontSize: 28,
    lineHeight: 34,
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
    fontSize: 28,
    lineHeight: 34,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F6FC',
  },
  scheduleSection: {
    width: '100%',
  },
  targetScheduleCard: {
    minHeight: 252,
    overflow: 'hidden',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(211,213,251,0.72)',
    backgroundColor: palette.lavender,
  },
  targetScheduleCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  targetScheduleCardDisabled: {
    opacity: 0.5,
  },
  targetScheduleBackground: {
    minHeight: 252,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  targetScheduleBackgroundImage: {
    borderRadius: 25,
  },
  targetScheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  targetScheduleIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.84)',
    backgroundColor: 'rgba(255,255,255,0.68)',
  },
  targetScheduleLabel: {
    minWidth: 0,
    flex: 1,
    color: palette.lavenderDeep,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
  },
  targetScheduleDate: {
    marginTop: 14,
    marginLeft: 68,
    color: palette.lavenderDeep,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  targetScheduleTime: {
    marginTop: 2,
    marginLeft: 68,
    color: palette.ink,
    fontSize: 50,
    lineHeight: 58,
    fontWeight: '900',
    letterSpacing: -1,
  },
  targetTimeHint: {
    alignSelf: 'flex-start',
    marginTop: 12,
    marginLeft: 68,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(151,132,214,0.18)',
    backgroundColor: 'rgba(255,255,255,0.52)',
  },
  targetTimeHintText: {
    color: palette.lavenderDeep,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  scheduleDivider: {
    height: 1,
    marginHorizontal: 6,
    marginVertical: 20,
    backgroundColor: palette.line,
  },
  previousScheduleRow: {
    minHeight: 108,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingHorizontal: 10,
  },
  previousScheduleRowPast: {
    opacity: 0.72,
  },
  previousScheduleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.sky,
  },
  previousScheduleContent: {
    minWidth: 0,
    flex: 1,
  },
  previousScheduleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  previousScheduleLabel: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  previousScheduleDate: {
    marginTop: 10,
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  previousScheduleTime: {
    marginTop: 2,
    color: palette.ink,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
  },
  previousSchedulePastNotice: {
    marginTop: 2,
    color: palette.muted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  timeNotice: {
    marginTop: 8,
    paddingHorizontal: 6,
    color: palette.peachDeep,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  deleteActionSpacer: {
    marginTop: 34,
    paddingTop: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  deleteAction: {
    minWidth: 124,
    minHeight: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteActionText: {
    color: palette.peachDeep,
    fontSize: 16,
    fontWeight: '800',
  },
  deleteActionPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: 'rgba(255,228,184,0.46)',
  },
  deleteActionDisabled: {
    opacity: 0.42,
  },
});
