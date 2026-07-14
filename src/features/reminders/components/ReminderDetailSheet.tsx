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
import { TimePickerModal } from '../../../shared/components/TimePickerModal';
import type { UpdateReminderTargetTimeResult } from '../application/reminderUseCases';
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
  onUpdateTargetTime: (
    reminder: Reminder,
    targetTime: string,
  ) => Promise<UpdateReminderTargetTimeResult>;
};

const DETAIL_SHEET_BOTTOM_CLEARANCE = 24;
const DETAIL_SHEET_MIN_DYNAMIC_CONTENT_SIZE = 320;
const DETAIL_SHEET_BASE_BOTTOM_PADDING = 28;
const reminderDetailBubbles = require('../../../../assets/reminder-detail-bubbles.png');

type NotificationTimelineProps = {
  reminder: Reminder;
  isTargetTimeEditingDisabled: boolean;
  onEditTargetTime: () => void;
};

function NotificationTimeline({
  reminder,
  isTargetTimeEditingDisabled,
  onEditTargetTime,
}: NotificationTimelineProps) {
  const showPreviousNotification = shouldShowPreviousNotification(reminder.previousNotifyAt);
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
        accessibilityLabel="当日のお知らせ時刻を編集"
        accessibilityHint={targetAccessibilityDateTime}
        accessibilityState={{ disabled: isTargetTimeEditingDisabled }}
        disabled={isTargetTimeEditingDisabled}
        onPress={onEditTargetTime}
        style={({ pressed }) => [
          styles.targetScheduleCard,
          pressed && !isTargetTimeEditingDisabled ? styles.targetScheduleCardPressed : null,
          isTargetTimeEditingDisabled ? styles.targetScheduleCardDisabled : null,
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
            <Text style={styles.targetTimeHintText}>タップして時間を変更</Text>
          </View>
        </ImageBackground>
      </Pressable>

      {showPreviousNotification ? (
        <>
          <View style={styles.scheduleDivider} />
          <View
            accessible
            accessibilityRole="text"
            accessibilityLabel={`前日のお知らせ、${previousAccessibilityDateTime}`}
            style={styles.previousScheduleRow}
          >
            <View style={styles.previousScheduleIcon}>
              <Ionicons name="notifications-outline" size={19} color={palette.muted} />
            </View>
            <View style={styles.previousScheduleContent}>
              <View style={styles.previousScheduleLabelRow}>
                <Text style={styles.previousScheduleLabel}>まず、前日にお知らせ</Text>
                <View style={styles.sharedTimeBadge}>
                  <Text style={styles.sharedTimeBadgeText}>すべての泡に共通</Text>
                </View>
              </View>
              <Text style={styles.previousScheduleDate}>
                {formatReminderDetailDate(reminder.previousNotifyAt)}
              </Text>
              <Text style={styles.previousScheduleTime}>
                {formatReminderDetailTime(reminder.previousNotifyAt)}
              </Text>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

export function ReminderDetailSheet({
  reminder,
  onClose,
  onDelete,
  onUpdateTitle,
  onUpdateTargetTime,
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
  const targetTimeEditSessionRef = useRef(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [isTitleSaving, setIsTitleSaving] = useState(false);
  const [titleNotice, setTitleNotice] = useState<string | null>(null);
  const [isTargetTimePickerOpen, setIsTargetTimePickerOpen] = useState(false);
  const [isTargetTimeSaving, setIsTargetTimeSaving] = useState(false);
  const [timeNotice, setTimeNotice] = useState<string | null>(null);
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

  const discardTargetTimeEdit = useCallback(() => {
    targetTimeEditSessionRef.current += 1;
    setIsTargetTimePickerOpen(false);
    setIsTargetTimeSaving(false);
    setTimeNotice(null);
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
    discardTargetTimeEdit();

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
  }, [discardTargetTimeEdit, discardTitleEdit, onClose, onDelete]);

  const handleClosePress = useCallback(() => {
    discardTitleEdit();
    discardTargetTimeEdit();
    closingReminderIdRef.current = displayedReminderIdRef.current;
    isClosingRef.current = true;
    sheetRef.current?.dismiss();
  }, [discardTargetTimeEdit, discardTitleEdit]);

  const handleSheetAnimate = useCallback(
    (_fromIndex: number, toIndex: number) => {
      if (toIndex === -1) {
        discardTitleEdit();
        discardTargetTimeEdit();
      }
    },
    [discardTargetTimeEdit, discardTitleEdit],
  );

  const handleTitlePress = useCallback(() => {
    if (!reminder || isTitleSaving || isTargetTimeSaving || isTargetTimePickerOpen) {
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
  }, [isTargetTimePickerOpen, isTargetTimeSaving, isTitleSaving, reminder]);

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

  const handleTargetTimePress = useCallback(() => {
    if (!reminder || isTitleEditing || isTitleSaving || isTargetTimeSaving) {
      return;
    }

    setTimeNotice(null);
    setIsTargetTimePickerOpen(true);
  }, [isTargetTimeSaving, isTitleEditing, isTitleSaving, reminder]);

  const handleTargetTimeConfirm = useCallback(
    async (targetTime: string) => {
      if (!reminder || isTargetTimeSaving) {
        return;
      }

      const [hours, minutes] = targetTime.split(':').map(Number);
      const nextTarget = new Date(reminder.targetAt);
      nextTarget.setHours(hours, minutes, 0, 0);
      if (nextTarget.getTime() <= Date.now()) {
        setTimeNotice('過去の時刻には変更できません');
        return;
      }

      const editSession = targetTimeEditSessionRef.current + 1;
      targetTimeEditSessionRef.current = editSession;
      setTimeNotice(null);
      setIsTargetTimeSaving(true);

      try {
        const result = await onUpdateTargetTime(reminder, targetTime);
        if (editSession !== targetTimeEditSessionRef.current) {
          return;
        }

        setTimeNotice(
          result.notification.status === 'scheduled' || result.notification.status === 'unchanged'
            ? null
            : '時刻は変更しましたが、通知を予約できませんでした',
        );
      } catch (error) {
        if (editSession !== targetTimeEditSessionRef.current) {
          return;
        }

        console.warn('Failed to update reminder target time', error);
        setTimeNotice(
          error instanceof Error && error.message.includes('future')
            ? '過去の時刻には変更できません'
            : '時刻を保存できませんでした',
        );
      } finally {
        if (editSession === targetTimeEditSessionRef.current) {
          setIsTargetTimeSaving(false);
        }
      }
    },
    [isTargetTimeSaving, onUpdateTargetTime, reminder],
  );

  const handleDeletePress = useCallback(() => {
    if (!reminder || isDeleting || isTargetTimeSaving || isDeleteRequestedRef.current) {
      return;
    }

    discardTitleEdit();
    discardTargetTimeEdit();
    isDeleteRequestedRef.current = true;
    setIsDeleting(true);
    pendingDeleteReminderRef.current = reminder;
    closingReminderIdRef.current = displayedReminderIdRef.current;
    isClosingRef.current = true;
    sheetRef.current?.dismiss();
  }, [discardTargetTimeEdit, discardTitleEdit, isDeleting, isTargetTimeSaving, reminder]);

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
                    disabled: !reminder || isTitleSaving || isTargetTimeSaving,
                  }}
                  disabled={!reminder || isTitleSaving || isTargetTimeSaving}
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
              isTargetTimeEditingDisabled={
                isTitleEditing || isTitleSaving || isTargetTimeSaving || isDeleting
              }
              onEditTargetTime={handleTargetTimePress}
            />
          ) : null}

          {timeNotice ? <Text style={styles.timeNotice}>{timeNotice}</Text> : null}

          <View style={styles.deleteActionSpacer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="このシャボン玉を削除する"
              accessibilityState={{ disabled: !reminder || isDeleting || isTargetTimeSaving }}
              onPress={handleDeletePress}
              disabled={!reminder || isDeleting || isTargetTimeSaving}
              style={({ pressed }) => [
                styles.deleteAction,
                pressed && !isDeleting ? styles.deleteActionPressed : null,
                !reminder || isDeleting || isTargetTimeSaving ? styles.deleteActionDisabled : null,
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

      <TimePickerModal
        visible={isTargetTimePickerOpen && reminder !== null}
        value={reminder ? formatReminderDetailTime(reminder.targetNotifyAt) : '08:00'}
        title="当日のお知らせ時刻"
        hint="この泡だけ、当日のお知らせ時刻を変更します"
        onConfirm={handleTargetTimeConfirm}
        onClose={() => setIsTargetTimePickerOpen(false)}
      />
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
  sharedTimeBadge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: palette.sky,
  },
  sharedTimeBadgeText: {
    color: palette.muted,
    fontSize: 10,
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
