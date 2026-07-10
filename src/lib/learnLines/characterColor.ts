// Port of CharacterColors.kt (the 24-color speaker-name pastel palette) and
// PaperPalette.kt's inkColorFor (the HSV transform that darkens/saturates a character's
// pastel into a readable "ink" color for their name on cream paper). Web has no dark mode,
// so only the light-palette branch (`value = 0.45`) is ported.

const PALETTE_HEX: readonly string[] = [
  "#FFB3B3", // Blush Pink
  "#FFB3CC", // Rose
  "#FFCCAD", // Peach
  "#FFDDA0", // Apricot
  "#FFF5B0", // Lemon
  "#E8F5C0", // Lime
  "#BFEACC", // Mint
  "#B0EAD8", // Seafoam
  "#B0E8F0", // Ice Blue
  "#B0D8F8", // Sky Blue
  "#B0C4F8", // Cornflower
  "#C4B0F8", // Periwinkle
  "#D8B0F8", // Lavender
  "#EEB0F8", // Lilac
  "#F8B0E0", // Mauve
  "#F8B0C4", // Blush Mauve
  "#EED8A0", // Champagne
  "#E0D8B0", // Sand
  "#D4E0B0", // Sage
  "#B0D4D0", // Celadon
  "#D0C8F8", // Wisteria
  "#D0E8F8", // Powder Blue
  "#F0D0C8", // Dusty Rose
  "#E8D4C0", // Bisque
];

const INK_FALLBACK = "#2B2A26"; // LightPaperPalette.ink

export function colorFor(colorIndex: number): string | null {
  return colorIndex >= 1 && colorIndex <= PALETTE_HEX.length ? PALETTE_HEX[colorIndex - 1] : null;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return "#" + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : delta / max;
  const v = max;
  return [h, s, v];
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let [r1, g1, b1] = [0, 0, 0];
  if (h < 60) [r1, g1, b1] = [c, x, 0];
  else if (h < 120) [r1, g1, b1] = [x, c, 0];
  else if (h < 180) [r1, g1, b1] = [0, c, x];
  else if (h < 240) [r1, g1, b1] = [0, x, c];
  else if (h < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}

/** The character's pastel color rendered as a rich, dark "ink" suitable for a speaker name
 *  on cream paper — verbatim port of PaperPalette.kt's inkColorFor (light-palette branch). */
export function inkColorFor(colorIndex: number): string {
  const base = colorFor(colorIndex);
  if (!base) return INK_FALLBACK;
  const [r, g, b] = hexToRgb(base);
  const [h, s] = rgbToHsv(r, g, b);
  const sAdj = Math.min(1, Math.max(0.5, s * 1.6));
  const [rr, gg, bb] = hsvToRgb(h, sAdj, 0.45);
  return rgbToHex(rr, gg, bb);
}
