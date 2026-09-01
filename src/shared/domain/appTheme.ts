export const APP_THEME_OPTIONS = ['sky', 'lavender', 'mint'] as const;

export type AppTheme = (typeof APP_THEME_OPTIONS)[number];

export function coerceAppTheme(value: string): AppTheme {
  return APP_THEME_OPTIONS.includes(value as AppTheme) ? (value as AppTheme) : 'lavender';
}
