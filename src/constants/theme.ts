/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

import type { ArrowTone } from '@/engine';

/** The Poster palette: warm paper and ink, inverted in dark mode. */
export const Colors = {
  light: {
    text: '#111111',
    background: '#F4F1EA',
    backgroundElement: '#E9E5DB',
    backgroundSelected: '#DDD7C8',
    textSecondary: '#4B4B4B',
    /** Fill of primary buttons and selected segments. */
    ink: '#111111',
    onInk: '#FFFFFF',
  },
  dark: {
    text: '#F4F1EA',
    background: '#141311',
    backgroundElement: '#23211D',
    backgroundSelected: '#33302A',
    textSecondary: '#B8B2A6',
    ink: '#F4F1EA',
    onInk: '#111111',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Arrow tones. Each one fills the home screen's hero block under white type,
 * so all of them hold white text. `amber` is the too-fast warning orange.
 * Still needs a colorblind pass before release (SPEC §11).
 */
export const ToneColors: Record<ArrowTone, string> = {
  big_green: '#0F7A3A',
  light_green: '#3E7F5B',
  gray: '#5B616B',
  light_red: '#B05656',
  red: '#B91C1C',
  amber: '#C2410C',
};

/** Darker shade of each tone, drawn under the arrow as its 3D lip. */
export const ToneShadeColors: Record<ArrowTone, string> = {
  big_green: '#0A5C2B',
  light_green: '#2C5F43',
  gray: '#41464E',
  light_red: '#874040',
  red: '#8A1414',
  amber: '#7C2D12',
};

export type HeroPalette = {
  /** The block's fill. */
  block: string;
  arrow: string;
  /** Drawn under the arrow, a little lower, as its lip. */
  lip: string;
  /** Headline, subline and icons. */
  text: string;
  /** Fill of the round buttons and the state chip. */
  wash: string;
};

/**
 * The home hero for each tone. Optimal and On target (`big_green`) are the
 * "on fire" block: ink, with a bright green arrow riding a fire trail. Too
 * slow is the one light block, with ink type and arrow.
 */
export const HeroColors: Record<ArrowTone, HeroPalette> = {
  big_green: { block: '#111111', arrow: '#22C55E', lip: '#0A5C2B', text: '#FFFFFF', wash: 'rgba(255,255,255,0.14)' },
  light_green: { block: '#86D9A3', arrow: '#111111', lip: '#4FAE70', text: '#111111', wash: 'rgba(255,255,255,0.5)' },
  gray: { block: '#4B5563', arrow: '#FFFFFF', lip: '#262C35', text: '#FFFFFF', wash: 'rgba(0,0,0,0.22)' },
  light_red: { block: '#B05656', arrow: '#FFFFFF', lip: '#6E3030', text: '#FFFFFF', wash: 'rgba(0,0,0,0.22)' },
  red: { block: '#B91C1C', arrow: '#FFFFFF', lip: '#6B1010', text: '#FFFFFF', wash: 'rgba(0,0,0,0.22)' },
  amber: { block: '#C2410C', arrow: '#FFFFFF', lip: '#7C2D12', text: '#FFFFFF', wash: 'rgba(0,0,0,0.22)' },
};

/** The green period after a celebrating headline. */
export const HeroAccent = '#22C55E';

/** Celebration confetti: flat poster pieces over the hero block. */
export const ConfettiColors = ['#FFFFFF', '#FACC15', '#111111', '#FFFFFF', '#FACC15'];

/** Archivo faces, loaded in the root layout. Each weight is its own family. */
export const Type = {
  display: 'ArchivoBlack_400Regular',
  medium: 'Archivo_500Medium',
  semiBold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
