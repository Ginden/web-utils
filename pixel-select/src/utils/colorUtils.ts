// src/utils/colorUtils.ts

/**
 * Converts a hex color string (#RRGGBB or RRGGBB) to an RGB array [r, g, b].
 * Returns [0, 0, 0] for invalid hex strings.
 */
export function hexToRgb(hex: string): [number, number, number] {
  const sanitizedHex = hex.startsWith('#') ? hex.slice(1) : hex;
  if (!/^[0-9A-Fa-f]{6}$/.test(sanitizedHex)) {
    return [0, 0, 0]; // Default to black for invalid hex
  }
  const r = parseInt(sanitizedHex.substring(0, 2), 16);
  const g = parseInt(sanitizedHex.substring(2, 4), 16);
  const b = parseInt(sanitizedHex.substring(4, 6), 16);
  return [r, g, b];
}

/**
 * Converts an RGB array [r, g, b] to a hex color string (RRGGBB, no # prefix).
 * Clamps RGB values to 0-255.
 */
export function rgbToHex(rgb: [number, number, number]): string {
  const [r, g, b] = rgb.map((val) => Math.max(0, Math.min(255, Math.round(val)))); // Clamp and round
  return ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase();
}

/**
 * Converts an RGB array [r, g, b] to a hex color string (#RRGGBB).
 */
export function rgbToHashHex(rgb: [number, number, number]): string {
  return '#' + rgbToHex(rgb);
}
