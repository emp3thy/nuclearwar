export type LeaderId =
  | 'chump'
  | 'khameneverhere'
  | 'starmless'
  | 'carnage'
  | 'mileigh-hem'
  | 'netanyahoo'
  | 'player1'
  | 'player2'
  | 'player3'
  | 'player4'
  | 'player5';

export type Difficulty = 'easy' | 'normal' | 'hard';

export type Yield = 'small' | 'medium' | 'large';

export type DeliveryType = 'missile' | 'bomber';

export type DefenceType = 'shield' | 'aa';

export type TargetType = 'people' | 'infra';

export type WinType = 'survivor' | 'pyrrhic' | 'apocalypse' | 'dominance';

export type BonusRule = 'chump-defence-waste' | 'mileigh-aggression-bonus' | 'netanyahoo-launch-bonus';

export interface Stockpile {
  missiles: number;
  bombers: number;
  warheadsSmall: number;
  warheadsMedium: number;
  warheadsLarge: number;
  shields: number;
  aa: number;
}

export interface Leader {
  id: LeaderId;
  name: string;
  country: string;
  population: number;
  factories: number;
  stockpile: Stockpile;
  ap: number;
  apBanked: number;
  alive: boolean;
  /** how friendly *they* feel toward me; raised by my wooing */
  favourability: Partial<Record<LeaderId, number>>;
  /** Khameneverhere grudge counter; raised when *they* hit me */
  grudge: Partial<Record<LeaderId, number>>;
  /** Carnage threat-doubling input; rounds since *they* hit me */
  recentAggressionFrom: Partial<Record<LeaderId, number>>;
  bonusRule?: BonusRule;
}

export type Order =
  | { kind: 'build-factory' }
  | { kind: 'build-missile' }
  | { kind: 'build-bomber' }
  | { kind: 'build-warhead'; yield: Yield }
  | { kind: 'build-defence'; type: DefenceType }
  | {
      kind: 'launch';
      target: LeaderId;
      delivery: DeliveryType;
      warhead: Yield;
      targetType: TargetType;
    }
  | { kind: 'propaganda'; target: LeaderId }
  | { kind: 'woo'; target: LeaderId; points: number };

/**
 * A resolved launch passed to `applyLaunches`. Stripped-down variant of the
 * launch order without the `kind` discriminator. Shared between the regular
 * launch phase (`collectLaunches` → `consumeStockFor` → `applyLaunches`) and
 * Final Retaliation (synthesises Launch[] from a dead leader's stockpile).
 */
export interface Launch {
  from: LeaderId;
  to: LeaderId;
  delivery: DeliveryType;
  warhead: Yield;
  targetType: TargetType;
}

export interface SealedOrders {
  leaderId: LeaderId;
  orders: Order[];
  apSpent: number;
}

export interface GameConfig {
  startPopOverride?: Partial<Record<LeaderId, number>>;
  dominanceThreshold: number;
  fastPlay: boolean;
}

export type WinOutcome =
  | { type: 'apocalypse' }
  | { type: 'survivor' | 'pyrrhic' | 'dominance'; winner: LeaderId };

export interface GameState {
  round: number;
  cast: LeaderId[];
  difficulty: Difficulty;
  seed: string;
  rngState: number;
  leaders: Record<LeaderId, Leader>;
  pendingOrders: Partial<Record<LeaderId, SealedOrders>>;
  /** The most recent round's submitted orders for each leader. Populated by RESOLVE_ROUND before pendingOrders is cleared. Used by Hard-mode lookahead to project human opponents' likely behaviour. */
  lastOrders: Partial<Record<LeaderId, Order[]>>;
  log: ResolutionEvent[];
  outcome: WinOutcome | null;
  config: GameConfig;
}

export type Action =
  | {
      type: 'NEW_GAME';
      cast: LeaderId[];
      difficulty: Difficulty;
      seed: string;
      config?: Partial<GameConfig>;
    }
  | { type: 'SUBMIT_ORDERS'; leaderId: LeaderId; orders: Order[] }
  | { type: 'RESOLVE_ROUND' }
  | { type: 'LOAD_STATE'; state: GameState };

export type ResolutionEvent =
  | { kind: 'OrdersSealed'; leaderId: LeaderId; orderCount: number }
  | { kind: 'FactoryBuilt'; by: LeaderId }
  | { kind: 'DeliveryBuilt'; by: LeaderId; type: DeliveryType }
  | { kind: 'WarheadBuilt'; by: LeaderId; yield: Yield }
  | { kind: 'DefenceBuilt'; by: LeaderId; type: DefenceType }
  | {
      kind: 'MissileLaunched';
      from: LeaderId;
      to: LeaderId;
      delivery: DeliveryType;
      warhead: Yield;
      targetType: TargetType;
    }
  | {
      kind: 'MissileIntercepted';
      from: LeaderId;
      to: LeaderId;
      delivery: DeliveryType;
      warhead: Yield;
    }
  | {
      kind: 'ImpactPeople';
      from: LeaderId;
      target: LeaderId;
      warhead: Yield;
      deaths: number;
    }
  | {
      kind: 'ImpactInfrastructure';
      from: LeaderId;
      target: LeaderId;
      warhead: Yield;
      factoriesDestroyed: number;
    }
  | { kind: 'PropagandaTransfer'; from: LeaderId; to: LeaderId; amount: number }
  | { kind: 'WooApplied'; from: LeaderId; to: LeaderId; points: number }
  | { kind: 'LeaderEliminated'; id: LeaderId }
  | { kind: 'FinalRetaliationTriggered'; by: LeaderId; targets: LeaderId[] }
  | { kind: 'OutcomeReached'; outcome: WinOutcome };
