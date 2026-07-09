import assert from 'node:assert/strict';
import { test } from 'node:test';

import { appThemes } from './colors';

test('app themes map reminder moods to calm backgrounds and readable accents', () => {
  assert.deepEqual(appThemes.sky, {
    background: '#FFF7ED',
    surface: '#FFFFFF',
    accent: '#B45309',
    accentSoft: '#FFE8CC',
    secondary: '#FDE2E8',
  });
  assert.deepEqual(appThemes.lavender, {
    background: '#F5F3FF',
    surface: '#FFFFFF',
    accent: '#6750D8',
    accentSoft: '#E8E3FF',
    secondary: '#DDF4FF',
  });
  assert.deepEqual(appThemes.mint, {
    background: '#EFFCF7',
    surface: '#FFFFFF',
    accent: '#0F766E',
    accentSoft: '#D8F5EA',
    secondary: '#E8E3FF',
  });
});
