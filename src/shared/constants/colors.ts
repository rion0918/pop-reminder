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
    background: 'rgba(167, 139, 250, 0.22)',
    gradient: ['rgba(255,255,255,0.76)', 'rgba(167, 139, 250, 0.22)', 'rgba(167, 139, 250, 0.08)'],
    border: 'rgba(167, 139, 250, 0.52)',
    accent: '#6D55BA',
  },
  {
    background: 'rgba(96, 165, 250, 0.20)',
    gradient: ['rgba(255,255,255,0.76)', 'rgba(96, 165, 250, 0.20)', 'rgba(96, 165, 250, 0.07)'],
    border: 'rgba(96, 165, 250, 0.48)',
    accent: '#246FB4',
  },
  {
    background: 'rgba(52, 211, 153, 0.18)',
    gradient: ['rgba(255,255,255,0.76)', 'rgba(52, 211, 153, 0.18)', 'rgba(52, 211, 153, 0.07)'],
    border: 'rgba(52, 211, 153, 0.46)',
    accent: '#16805E',
  },
  {
    background: 'rgba(251, 191, 36, 0.18)',
    gradient: ['rgba(255,255,255,0.76)', 'rgba(251, 191, 36, 0.18)', 'rgba(251, 191, 36, 0.07)'],
    border: 'rgba(251, 191, 36, 0.48)',
    accent: '#A66010',
  },
  {
    background: 'rgba(244, 114, 182, 0.18)',
    gradient: ['rgba(255,255,255,0.76)', 'rgba(244, 114, 182, 0.18)', 'rgba(244, 114, 182, 0.07)'],
    border: 'rgba(244, 114, 182, 0.46)',
    accent: '#A34D83',
  },
];
