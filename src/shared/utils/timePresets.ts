export type TimePreset = {
  label: string;
  time: string;
};

export const DEFAULT_TIME_PRESETS: TimePreset[] = [
  { label: '朝', time: '08:00' },
  { label: '昼', time: '12:00' },
  { label: '夕', time: '18:00' },
  { label: '夜', time: '20:00' },
];
