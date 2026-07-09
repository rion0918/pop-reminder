export type AppTheme = 'sky' | 'lavender' | 'mint';

export const themeOptions: AppTheme[] = ['sky', 'lavender', 'mint'];

export const palette = {
  ink: '#263151',
  muted: '#7280A3',
  line: '#DCE9F7',
  white: '#FFFFFF',
  cloud: '#F7FBFF',
  sky: '#DCEBFF',
  skyDeep: '#2F6FE4',
  lavender: '#EDE5FF',
  lavenderDeep: '#7957D5',
  mint: '#DDF7EC',
  mintDeep: '#12866A',
  peach: '#FFF1D8',
  peachDeep: '#F0A84D',
  shadow: '#7DB5E8',
};

export const appThemes: Record<
  AppTheme,
  {
    background: string;
    surface: string;
    accent: string;
    accentSoft: string;
    secondary: string;
  }
> = {
  sky: {
    background: '#FFF7ED',
    surface: '#FFFFFF',
    accent: '#B45309',
    accentSoft: '#FFE8CC',
    secondary: '#FDE2E8',
  },
  lavender: {
    background: '#F5F3FF',
    surface: '#FFFFFF',
    accent: '#6750D8',
    accentSoft: '#E8E3FF',
    secondary: '#DDF4FF',
  },
  mint: {
    background: '#EFFCF7',
    surface: '#FFFFFF',
    accent: '#0F766E',
    accentSoft: '#D8F5EA',
    secondary: '#E8E3FF',
  },
};

export const homeVisualTokens = {
  bubbleTintMistOpacity: 0.46,
  bubbleInnerColorRimOpacity: 0.3,
  bubbleSurfaceElevation: 0,
} as const;

export const bubbleColors = [
  {
    background: 'rgba(167, 139, 250, 0.13)',
    gradient: ['rgba(255,255,255,0.84)', 'rgba(167, 139, 250, 0.12)', 'rgba(167, 139, 250, 0.04)'],
    border: 'rgba(167, 139, 250, 0.34)',
    accent: 'rgba(91, 71, 164, 0.82)',
  },
  {
    background: 'rgba(96, 165, 250, 0.12)',
    gradient: ['rgba(255,255,255,0.84)', 'rgba(96, 165, 250, 0.11)', 'rgba(96, 165, 250, 0.04)'],
    border: 'rgba(96, 165, 250, 0.32)',
    accent: 'rgba(31, 97, 157, 0.82)',
  },
  {
    background: 'rgba(52, 211, 153, 0.11)',
    gradient: ['rgba(255,255,255,0.84)', 'rgba(52, 211, 153, 0.10)', 'rgba(52, 211, 153, 0.04)'],
    border: 'rgba(52, 211, 153, 0.30)',
    accent: 'rgba(18, 111, 82, 0.82)',
  },
  {
    background: 'rgba(251, 191, 36, 0.11)',
    gradient: ['rgba(255,255,255,0.84)', 'rgba(251, 191, 36, 0.10)', 'rgba(251, 191, 36, 0.04)'],
    border: 'rgba(251, 191, 36, 0.32)',
    accent: 'rgba(143, 83, 14, 0.82)',
  },
  {
    background: 'rgba(244, 114, 182, 0.11)',
    gradient: ['rgba(255,255,255,0.84)', 'rgba(244, 114, 182, 0.10)', 'rgba(244, 114, 182, 0.04)'],
    border: 'rgba(244, 114, 182, 0.30)',
    accent: 'rgba(142, 67, 114, 0.82)',
  },
];

export const bubbleDueColors = {
  today: {
    background: 'rgba(248, 113, 113, 0.32)',
    gradient: ['rgba(255,255,255,0.78)', 'rgba(248, 113, 113, 0.28)', 'rgba(248, 113, 113, 0.14)'],
    border: 'rgba(248, 113, 113, 0.58)',
    accent: 'rgba(164, 45, 55, 0.92)',
  },
  tomorrow: {
    background: 'rgba(251, 146, 60, 0.30)',
    gradient: ['rgba(255,255,255,0.78)', 'rgba(251, 146, 60, 0.26)', 'rgba(251, 146, 60, 0.13)'],
    border: 'rgba(251, 146, 60, 0.56)',
    accent: 'rgba(154, 83, 23, 0.92)',
  },
  soon: {
    background: 'rgba(250, 204, 21, 0.28)',
    gradient: ['rgba(255,255,255,0.78)', 'rgba(250, 204, 21, 0.24)', 'rgba(250, 204, 21, 0.12)'],
    border: 'rgba(250, 204, 21, 0.52)',
    accent: 'rgba(132, 94, 12, 0.92)',
  },
  later: {
    background: 'rgba(125, 211, 252, 0.26)',
    gradient: ['rgba(255,255,255,0.78)', 'rgba(125, 211, 252, 0.22)', 'rgba(125, 211, 252, 0.11)'],
    border: 'rgba(125, 211, 252, 0.50)',
    accent: 'rgba(31, 97, 157, 0.90)',
  },
} as const;
