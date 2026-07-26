import { runLevel } from './runner';
import type { Difficulty } from '../../src/engine/types';

// Usage: vite-node scripts/playability/run.ts <level> <count> [outRoot]
const [levelArg, countArg, outArg] = process.argv.slice(2);

const level = (levelArg ?? 'normal') as Difficulty;
if (!['easy', 'normal', 'hard'].includes(level)) {
  throw new Error(`invalid level '${level}' (expected easy|normal|hard)`);
}
const count = Number(countArg ?? '100');
if (!Number.isFinite(count) || count < 1) {
  throw new Error(`invalid count '${countArg}'`);
}
const outRoot = outArg ?? 'docs/playability';

const t0 = Date.now();
const res = runLevel(level, count, outRoot);
const secs = ((Date.now() - t0) / 1000).toFixed(1);
// eslint-disable-next-line no-console
console.log(`played ${res.count} ${res.level} games in ${secs}s → ${res.dir}`);
