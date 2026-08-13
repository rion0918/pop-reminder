import { type AppTheme, appThemes, palette } from '../constants/colors';

export type WidgetThemeTokens = {
  primaryText: string;
  secondaryText: string;
  accent: string;
  accentSoft: string;
  surfaceGradient: {
    from: string;
    to: string;
    orientation: 'TL_BR';
  };
  surfaceBorder: string;
  ambientPrimary: string;
  ambientSecondary: string;
  ambientTertiary: string;
  countSurface: string;
  heroGradient: {
    from: string;
    to: string;
    orientation: 'TL_BR';
  };
  heroBorder: string;
  heroShadow: string;
  queueSurface: string;
  queueBorder: string;
  queueShadow: string;
  rowActionSurface: string;
  addButtonGradient: {
    from: string;
    to: string;
    orientation: 'TOP_BOTTOM';
  };
  addButtonBorder: string;
  addButtonText: string;
};

export const widgetThemes: Record<AppTheme, WidgetThemeTokens> = {
  sky: {
    primaryText: palette.ink,
    secondaryText: 'rgba(38,49,81,0.66)',
    accent: appThemes.sky.accent,
    accentSoft: appThemes.sky.accentSoft,
    surfaceGradient: { from: '#FFFCF7', to: '#FFF1DE', orientation: 'TL_BR' },
    surfaceBorder: 'rgba(255,255,255,0.92)',
    ambientPrimary: '#F6AD55',
    ambientSecondary: '#F9A8D4',
    ambientTertiary: '#7DD3FC',
    countSurface: 'rgba(255,255,255,0.64)',
    heroGradient: { from: '#FFFFFF', to: '#FFE8CC', orientation: 'TL_BR' },
    heroBorder: 'rgba(255,255,255,0.96)',
    heroShadow: 'rgba(144,84,28,0.13)',
    queueSurface: 'rgba(255,255,255,0.72)',
    queueBorder: 'rgba(255,255,255,0.90)',
    queueShadow: 'rgba(98,64,38,0.08)',
    rowActionSurface: 'rgba(255,255,255,0.54)',
    addButtonGradient: { from: '#D97706', to: '#B45309', orientation: 'TOP_BOTTOM' },
    addButtonBorder: 'rgba(255,255,255,0.94)',
    addButtonText: palette.white,
  },
  lavender: {
    primaryText: palette.ink,
    secondaryText: 'rgba(38,49,81,0.66)',
    accent: appThemes.lavender.accent,
    accentSoft: appThemes.lavender.accentSoft,
    surfaceGradient: { from: '#FEFCFF', to: '#EEEAFE', orientation: 'TL_BR' },
    surfaceBorder: 'rgba(255,255,255,0.92)',
    ambientPrimary: '#A78BFA',
    ambientSecondary: '#7DD3FC',
    ambientTertiary: '#F9A8D4',
    countSurface: 'rgba(255,255,255,0.62)',
    heroGradient: { from: '#FFFFFF', to: '#E8E3FF', orientation: 'TL_BR' },
    heroBorder: 'rgba(255,255,255,0.96)',
    heroShadow: 'rgba(82,66,145,0.14)',
    queueSurface: 'rgba(255,255,255,0.70)',
    queueBorder: 'rgba(255,255,255,0.90)',
    queueShadow: 'rgba(63,53,112,0.08)',
    rowActionSurface: 'rgba(255,255,255,0.52)',
    addButtonGradient: { from: '#8069E8', to: '#6750D8', orientation: 'TOP_BOTTOM' },
    addButtonBorder: 'rgba(255,255,255,0.94)',
    addButtonText: palette.white,
  },
  mint: {
    primaryText: palette.ink,
    secondaryText: 'rgba(38,49,81,0.66)',
    accent: appThemes.mint.accent,
    accentSoft: appThemes.mint.accentSoft,
    surfaceGradient: { from: '#FBFFFD', to: '#E1F8EF', orientation: 'TL_BR' },
    surfaceBorder: 'rgba(255,255,255,0.92)',
    ambientPrimary: '#6EE7B7',
    ambientSecondary: '#93C5FD',
    ambientTertiary: '#C4B5FD',
    countSurface: 'rgba(255,255,255,0.62)',
    heroGradient: { from: '#FFFFFF', to: '#D8F5EA', orientation: 'TL_BR' },
    heroBorder: 'rgba(255,255,255,0.96)',
    heroShadow: 'rgba(22,107,85,0.13)',
    queueSurface: 'rgba(255,255,255,0.70)',
    queueBorder: 'rgba(255,255,255,0.90)',
    queueShadow: 'rgba(21,85,70,0.08)',
    rowActionSurface: 'rgba(255,255,255,0.52)',
    addButtonGradient: { from: '#159985', to: '#0F766E', orientation: 'TOP_BOTTOM' },
    addButtonBorder: 'rgba(255,255,255,0.94)',
    addButtonText: palette.white,
  },
};

export function getWidgetTheme(theme: string | undefined): WidgetThemeTokens {
  if (theme === 'sky' || theme === 'lavender' || theme === 'mint') {
    return widgetThemes[theme];
  }

  return widgetThemes.lavender;
}
