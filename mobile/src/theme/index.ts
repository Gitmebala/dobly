import { Appearance } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const DARK_COLORS = {
  background: '#161614',
  surface: '#1C1C1A',
  surfaceElevated: '#252523',
  primary: '#C4501A',
  primaryHover: '#A64315',
  primaryMuted: '#C4501A33',
  text: '#F5EDE4',
  textSecondary: 'rgba(245, 237, 228, 0.6)',
  textMuted: 'rgba(245, 237, 228, 0.36)',
  textDim: 'rgba(245, 237, 228, 0.24)',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#6366F1',
  border: 'rgba(245, 237, 228, 0.08)',
  borderHover: 'rgba(245, 237, 228, 0.16)',
  logoBar1: 'rgba(196, 80, 26, 0.22)',
  logoBar2: 'rgba(196, 80, 26, 0.55)',
  logoBar3: '#C4501A',
};

const LIGHT_COLORS = {
  background: '#F7F1E8',
  surface: '#FFF9F2',
  surfaceElevated: '#F2E8DC',
  primary: '#C4501A',
  primaryHover: '#A64315',
  primaryMuted: 'rgba(196, 80, 26, 0.14)',
  text: '#2B2118',
  textSecondary: 'rgba(43, 33, 24, 0.68)',
  textMuted: 'rgba(43, 33, 24, 0.44)',
  textDim: 'rgba(43, 33, 24, 0.26)',
  success: '#0F8A63',
  warning: '#D08712',
  error: '#C2413A',
  info: '#5B67D8',
  border: 'rgba(43, 33, 24, 0.08)',
  borderHover: 'rgba(43, 33, 24, 0.16)',
  logoBar1: 'rgba(196, 80, 26, 0.18)',
  logoBar2: 'rgba(196, 80, 26, 0.42)',
  logoBar3: '#C4501A',
};

export type ColorPalette = typeof DARK_COLORS;

export const COLORS: ColorPalette = { ...DARK_COLORS };

let currentPreference: ThemePreference = 'system';
let currentResolvedTheme: ResolvedTheme = 'dark';

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') {
    return Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
  }

  return preference;
}

export function applyThemePreference(preference: ThemePreference): ResolvedTheme {
  currentPreference = preference;
  currentResolvedTheme = resolveTheme(preference);
  const nextPalette = currentResolvedTheme === 'light' ? LIGHT_COLORS : DARK_COLORS;
  Object.assign(COLORS, nextPalette);
  return currentResolvedTheme;
}

export function getThemePreference(): ThemePreference {
  return currentPreference;
}

export function getResolvedTheme(): ResolvedTheme {
  return currentResolvedTheme;
}

applyThemePreference('system');

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 36,
};

export const BORDER_RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};
