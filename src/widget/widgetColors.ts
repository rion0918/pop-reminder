import { palette } from '../constants/colors';

export const widgetTheme = {
  primaryText: palette.ink,
  secondaryText: 'rgba(38,49,81,0.68)',
  surface: '#F6F7FA',
  surfaceBorder: 'rgba(38,49,81,0.06)',
  cardSurface: '#FFFFFF',
  cardBorder: 'rgba(38,49,81,0.07)',
  cardShadow: 'rgba(38,49,81,0.07)',
  rowActionSurface: '#F2F4F8',
  plusButtonSurface: '#E7EEF8',
  plusButtonBorder: 'rgba(80,101,143,0.16)',
  plusButtonText: '#50658F',
} as const;
