import { palette } from '../constants/colors';

export const widgetTheme = {
  primaryText: palette.ink,
  secondaryText: 'rgba(38,49,81,0.72)',
  cloudSurfaceBackground: '#A8D1F0',
  cloudSurfaceBorder: 'rgba(255,255,255,0.72)',
  glassVeil: 'rgba(247,251,255,0.38)',
  cardSurface: 'rgba(255,255,255,0.58)',
  cardBorder: 'rgba(255,255,255,0.78)',
  cardShadow: 'rgba(38,49,81,0.10)',
  plusButtonGradient: {
    from: '#9ED8FF',
    to: '#C4E8FF',
    orientation: 'TL_BR',
  },
  plusButtonBorder: 'rgba(255,255,255,0.84)',
  plusButtonText: palette.ink,
  textHalo: 'rgba(255,255,255,0.72)',
} as const;
