import { forwardRef, memo, useCallback, useImperativeHandle, useRef, useState } from 'react';
import type { ComponentProps, ElementRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';

import { palette } from '../../../constants/colors';
import { REMINDER_TITLE_MAX_LENGTH } from '../schemas/reminderSchema';

export type ImeSafeReminderTitleInputHandle = {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  replaceText: (text: string) => void;
  isFocused: () => boolean;
};

type ImeSafeReminderTitleInputProps = {
  accessibilityLabel: string;
  initialValue?: string;
  placeholder?: string;
  placeholderTextColor?: string;
  editable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  focusedInputStyle?: StyleProp<TextStyle>;
  countStyle?: StyleProp<TextStyle>;
  countWarningStyle?: StyleProp<TextStyle>;
  countOverLimitStyle?: StyleProp<TextStyle>;
  onTextChange?: (text: string) => void;
  onEndEditing?: (text: string) => void;
};

type BottomSheetTextInputProps = ComponentProps<typeof BottomSheetTextInput>;

const ImeSafeReminderTitleInputComponent = forwardRef<
  ImeSafeReminderTitleInputHandle,
  ImeSafeReminderTitleInputProps
>(function ImeSafeReminderTitleInput(
  {
    accessibilityLabel,
    initialValue = '',
    placeholder,
    placeholderTextColor = '#A6B2CE',
    editable = true,
    containerStyle,
    inputStyle,
    focusedInputStyle,
    countStyle,
    countWarningStyle,
    countOverLimitStyle,
    onTextChange,
    onEndEditing,
  },
  providedRef,
) {
  const inputRef = useRef<ElementRef<typeof BottomSheetTextInput>>(null);
  const nativeTextRef = useRef(initialValue);
  const [nativeRevision, setNativeRevision] = useState(0);
  const [titleLength, setTitleLength] = useState(initialValue.length);
  const [isFocused, setIsFocused] = useState(false);

  const recordText = useCallback(
    (text: string) => {
      nativeTextRef.current = text;
      setTitleLength(text.length);
      onTextChange?.(text);
    },
    [onTextChange],
  );

  const replaceText = useCallback(
    (text: string) => {
      recordText(text);
      setNativeRevision((revision) => revision + 1);
    },
    [recordText],
  );

  useImperativeHandle(
    providedRef,
    () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      clear: () => replaceText(''),
      replaceText,
      isFocused: () => inputRef.current?.isFocused() ?? false,
    }),
    [replaceText],
  );

  const handleChangeText = useCallback(
    (text: string) => {
      recordText(text);
    },
    [recordText],
  );

  const handleEndEditing = useCallback<NonNullable<BottomSheetTextInputProps['onEndEditing']>>(
    (event) => {
      const text = event.nativeEvent.text;
      recordText(text);
      onEndEditing?.(text);
    },
    [onEndEditing, recordText],
  );

  const isTitleCountWarning = titleLength >= REMINDER_TITLE_MAX_LENGTH - 5;
  const isTitleOverLimit = titleLength > REMINDER_TITLE_MAX_LENGTH;
  const titleCountAccessibilityLabel = isTitleOverLimit
    ? `タイトルは${titleLength}文字、上限を${titleLength - REMINDER_TITLE_MAX_LENGTH}文字超えています`
    : `タイトルは${titleLength}文字、あと${REMINDER_TITLE_MAX_LENGTH - titleLength}文字入力できます`;

  return (
    <View style={containerStyle}>
      <BottomSheetTextInput
        key={nativeRevision}
        ref={inputRef}
        accessibilityLabel={accessibilityLabel}
        defaultValue={nativeTextRef.current}
        onChangeText={handleChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onEndEditing={handleEndEditing}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        editable={editable}
        keyboardType="default"
        autoCorrect
        spellCheck={false}
        autoCapitalize="none"
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        multiline={false}
        style={[inputStyle, isFocused ? focusedInputStyle : null]}
      />
      <Text
        accessibilityRole="text"
        accessibilityLabel={titleCountAccessibilityLabel}
        style={[
          styles.count,
          countStyle,
          isTitleCountWarning ? countWarningStyle : null,
          isTitleOverLimit ? countOverLimitStyle : null,
        ]}
      >
        {titleLength} / {REMINDER_TITLE_MAX_LENGTH}
      </Text>
    </View>
  );
});

export const ImeSafeReminderTitleInput = memo(ImeSafeReminderTitleInputComponent);

const styles = StyleSheet.create({
  count: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
