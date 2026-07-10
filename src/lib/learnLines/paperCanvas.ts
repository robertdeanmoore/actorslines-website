// Shared canvas-drawing helpers for the pencil-scribble hidden-text overlay. Kept separate
// from the React component so the math (seeding, jitter) is easy to unit-reason-about.

/** Deterministic small hash of a string into a 32-bit int, used to seed the PRNG so a given
 *  line's scribble doesn't re-jitter on every re-render (mirrors the app seeding pencil
 *  strokes by the line's stable id). */
export function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

/** mulberry32 PRNG — small, fast, good enough for cosmetic jitter (not cryptographic). */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRAPHITE = "#8C857B"; // LightPaperPalette.graphite

/** Draws one hand-jittered wavy pencil stroke across `[left, left+width)` at vertical
 *  position `y`, matching PaperStyle.kt's drawPencilOverRanges (6 segments, ~1.3px stroke,
 *  ~1.4px jitter amplitude, 0.8 alpha, round caps). */
export function drawPencilStroke(
  ctx: CanvasRenderingContext2D,
  rand: () => number,
  left: number,
  y: number,
  width: number,
): void {
  if (width <= 0) return;
  const segments = 6;
  const amplitude = 1.4;
  ctx.save();
  ctx.strokeStyle = GRAPHITE;
  ctx.globalAlpha = 0.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const x = left + (width * i) / segments;
    const jitter = (rand() - 0.5) * 2 * amplitude;
    if (i === 0) ctx.moveTo(x, y + jitter);
    else ctx.lineTo(x, y + jitter);
  }
  ctx.stroke();
  ctx.restore();
}
