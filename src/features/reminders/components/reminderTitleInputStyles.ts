import { StyleSheet } from 'react-native';

import { palette } from '../../../constants/colors';

export const reminderTitleInputStyles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  input: {
    width: '100%',
    minHeight: 56,
    borderRadius: 18,
    paddingLeft: 16,
    paddingRight: 64,
    paddingVertical: 14,
    color: palette.ink,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '700',
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.line,
  },
  inputFocused: {
    borderColor: 'rgba(121,87,213,0.62)',
    shadowColor: palette.lavenderDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  count: {
    position: 'absolute',
    right: 12,
    bottom: 7,
    color: palette.muted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  countWarning: {
    color: '#8B6F2D',
  },
  countOverLimit: {
    color: '#B34B58',
  },
});
