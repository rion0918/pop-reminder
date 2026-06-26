export type AppTheme = 'sky' | 'lavender' | 'mint';

export const themeOptions: AppTheme[] = ['sky', 'lavender', 'mint'];

export const palette = {
  ink: '#263151',
  muted: '#7280A3',
  line: '#DCE9F7',
  white: '#FFFFFF',
  cloud: '#F7FBFF',
  sky: '#DFF3FF',
  skyDeep: '#74BDF6',
  lavender: '#EDE6FF',
  lavenderDeep: '#A891F5',
  mint: '#DCF8EC',
  mintDeep: '#65CDA8',
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
    background: '#EFF8FF',
    surface: '#FFFFFF',
    accent: '#74BDF6',
    accentSoft: '#DFF3FF',
    secondary: '#EDE6FF',
  },
  lavender: {
    background: '#F7F2FF',
    surface: '#FFFFFF',
    accent: '#A891F5',
    accentSoft: '#EDE6FF',
    secondary: '#DFF3FF',
  },
  mint: {
    background: '#F1FCF7',
    surface: '#FFFFFF',
    accent: '#65CDA8',
    accentSoft: '#DCF8EC',
    secondary: '#DFF3FF',
  },
};

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
    background: 'rgba(248, 113, 113, 0.14)',
    gradient: ['rgba(255,255,255,0.84)', 'rgba(248, 113, 113, 0.13)', 'rgba(248, 113, 113, 0.05)'],
    border: 'rgba(248, 113, 113, 0.36)',
    accent: 'rgba(164, 45, 55, 0.84)',
  },
  tomorrow: {
    background: 'rgba(251, 146, 60, 0.13)',
    gradient: ['rgba(255,255,255,0.84)', 'rgba(251, 146, 60, 0.12)', 'rgba(251, 146, 60, 0.05)'],
    border: 'rgba(251, 146, 60, 0.34)',
    accent: 'rgba(154, 83, 23, 0.84)',
  },
  soon: {
    background: 'rgba(250, 204, 21, 0.12)',
    gradient: ['rgba(255,255,255,0.84)', 'rgba(250, 204, 21, 0.11)', 'rgba(250, 204, 21, 0.04)'],
    border: 'rgba(250, 204, 21, 0.32)',
    accent: 'rgba(132, 94, 12, 0.84)',
  },
  later: {
    background: 'rgba(125, 211, 252, 0.11)',
    gradient: ['rgba(255,255,255,0.84)', 'rgba(125, 211, 252, 0.10)', 'rgba(52, 211, 153, 0.04)'],
    border: 'rgba(125, 211, 252, 0.30)',
    accent: 'rgba(31, 97, 157, 0.82)',
  },
} as const;
