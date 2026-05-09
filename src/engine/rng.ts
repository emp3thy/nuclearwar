// Mulberry32 — small, fast, well-distributed PRNG. Pure-functional API:
// caller threads `state` through; no mutable closures so saves capture rng
// position cleanly.

export interface RngStep {
  value: number;
  state: number;
}

export function nextRandom(state: number): RngStep {
  const t = (state + 0x6d2b79f5) >>> 0;
  let r = t;
  r = Math.imul(r ^ (r >>> 15), r | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  return {
    value: ((r ^ (r >>> 14)) >>> 0) / 4294967296,
    state: t,
  };
}

export function nextInt(state: number, maxExclusive: number): RngStep {
  const r = nextRandom(state);
  return { value: Math.floor(r.value * maxExclusive), state: r.state };
}

// FNV-1a 32-bit string hash → seed.
export function seedFromString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Order-sensitive integer mixer (xxhash-style avalanche). Useful for deriving
// per-leader sub-seeds without advancing the main game RNG.
export function mix32(a: number, b: number, c: number): number {
  let h = (a ^ Math.imul(b, 0x9e3779b1) ^ Math.imul(c, 0x85ebca6b)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}
