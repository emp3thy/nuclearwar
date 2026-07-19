import type { GameState, LeaderId, Order } from '../types';
import { planChump } from './chump';
import { planCarnage } from './carnage';
import { planKhameneverhere } from './khameneverhere';
import { planNetanyahoo } from './netanyahoo';
import { planBurnem } from './burnem';
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
    case 'burnem': return planBurnem(state, leaderId);
    case 'mileigh-hem': return planMileighHem(state, leaderId);
    case 'player1':
    case 'player2':
    case 'player3':
    case 'player4':
    case 'player5':
      throw new Error(
        `dispatch() called for human player slot '${leaderId}'. ` +
        `Human leaders submit orders via SUBMIT_ORDERS, not via the AI dispatcher.`,
      );
  }
}
