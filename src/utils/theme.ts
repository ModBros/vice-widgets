import { useColorField, useFontField } from '@modbros/dashboard-sdk';
import { color as parseColor } from 'd3-color';

// the neon sunset colors of Leonida and the colors of the game HUD
export const colors = {
  pink: '#ff2e88',
  orange: '#ff8a3d',
  gold: '#ffc83d',
  teal: '#22e4d9',
  purple: '#9b3cf0',
  night: '#140a26',
  cash: '#72cc72',
  health: '#5fbe54',
  armor: '#4a9be0',
  special: '#f2c230',
  alert: '#e8233e',
  white: '#ffffff',
  up: '#3ddc84',
  down: '#ff4d6d',
};

// Pricedown is the lettering of the game logos, used if the user has it installed
export const displayFontFamily = "Pricedown, 'Pricedown Bl', Impact, Haettenschweiler, 'Arial Narrow', sans-serif";

// Bahnschrift ships with Windows and comes close to the HUD lettering
export const uiFontFamily = "Chalet, Bahnschrift, 'Segoe UI', Arial, sans-serif";

export const defaultAlertThreshold = 90;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// the css color with its alpha multiplied by `opacity`
export function withAlpha(css: string, opacity: number): string {
  const parsed = parseColor(css);

  if (!parsed) {
    return css;
  }

  parsed.opacity = clamp(parsed.opacity * opacity, 0, 1);

  return parsed.formatRgb();
}

// a color picked by the user, or the default if the field is empty
export function useColor(field: string, defaultColor: string): string {
  const color = useColorField({ field });

  return color.isEmpty() ? defaultColor : color.toRgbaCss();
}

// the font picked in the "font" field in front of the default font stack
export function useFontFamily(fallback: string): string {
  const font = useFontField({ field: 'font' });

  return font ? `"${font.replace(/["\\]/g, '')}", ${fallback}` : fallback;
}

// the thick dark outline of the HUD texts, as a text-shadow
export function outline(size: number, color = 'rgba(0, 0, 0, 0.85)'): string {
  const s = Math.max(1, size).toFixed(1);

  return [
    `${s}px 0 0 ${color}`,
    `-${s}px 0 0 ${color}`,
    `0 ${s}px 0 ${color}`,
    `0 -${s}px 0 ${color}`,
    `${s}px ${s}px 0 ${color}`,
    `-${s}px ${s}px 0 ${color}`,
    `${s}px -${s}px 0 ${color}`,
    `-${s}px -${s}px 0 ${color}`,
  ].join(', ');
}

// a font size set by the user, or `auto` if the field is empty
export function fontSizeOf(fontSize: number | null, auto: number): number {
  return Math.max(1, fontSize !== null && fontSize > 0 ? fontSize : auto);
}

// deterministic pseudo random numbers, so the drawings look the same on every render
export function random(seed: number): () => number {
  let state = seed % 2147483647 || 1;

  return () => {
    state = (state * 48271) % 2147483647;

    return (state - 1) / 2147483646;
  };
}
