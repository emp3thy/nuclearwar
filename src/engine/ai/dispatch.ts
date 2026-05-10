import type { GameState, LeaderId, Order } from '../types';
import { planChump } from './chump';
import { planCarnage } from './carnage';
import { planKhameneverhere } from './khameneverhere';
import { planNetanyahoo } from './netanyahoo';
import { planStarmless } from './starmless';
import { planMileighHem } from './mileighhem';

/**
 * Route a leader to their per-personality baseline planner.
 * Per-leader files are pure baseline planners: they know nothing about
 * difficulty levels or lookahead. Hard-mode orchestration lives in planAi
 * (index.ts), which calls this function then post-processes for lookahead.
 */
export function dispatch(state: GameState, leaderId: LeaderId): Order[] {
  switch (leaderId) {
    case 'chump': return planChump(state, leaderId);
    case 'carnage': return planCarnage(state, leaderId);
    case 'khameneverhere': return planKhameneverhere(state, leaderId);
    case 'netanyahoo': return planNetanyahoo(state, leaderId);
    case 'starmless': return planStarmless(state, leaderId);
    case 'mileigh-hem': return planMileighHem(state, leaderId);
  }
}
