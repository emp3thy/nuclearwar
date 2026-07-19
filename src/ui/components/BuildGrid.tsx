import type { Dispatch, SetStateAction } from 'react';
import type { Order } from '../../engine/types';
import { ACTION_COSTS } from '../../engine/balance';
import styles from './BuildGrid.module.css';
import { findLastIndexMatching } from '../util/arrays';

interface Props {
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  apRemaining: number;
}

interface CellSpec {
  emoji: string;
  label: string;
  cost: number;
  matches: (o: Order) => boolean;
  make: () => Order;
}

const CELLS: CellSpec[] = [
  { emoji: '🏭', label: 'Factory',     cost: ACTION_COSTS.buildFactory,       matches: (o) => o.kind === 'build-factory', make: () => ({ kind: 'build-factory' }) },
  { emoji: '🚀', label: 'Missile',     cost: ACTION_COSTS.buildMissile,       matches: (o) => o.kind === 'build-missile', make: () => ({ kind: 'build-missile' }) },
  { emoji: '✈️', label: 'Bomber',      cost: ACTION_COSTS.buildBomber,        matches: (o) => o.kind === 'build-bomber',  make: () => ({ kind: 'build-bomber' }) },
  { emoji: '💥', label: 'Sm Warhead',  cost: ACTION_COSTS.buildWarheadSmall,  matches: (o) => o.kind === 'build-warhead' && o.yield === 'small',  make: () => ({ kind: 'build-warhead', yield: 'small' }) },
  { emoji: '💥', label: 'Md Warhead',  cost: ACTION_COSTS.buildWarheadMedium, matches: (o) => o.kind === 'build-warhead' && o.yield === 'medium', make: () => ({ kind: 'build-warhead', yield: 'medium' }) },
  { emoji: '💥', label: 'Lg Warhead',  cost: ACTION_COSTS.buildWarheadLarge,  matches: (o) => o.kind === 'build-warhead' && o.yield === 'large',  make: () => ({ kind: 'build-warhead', yield: 'large' }) },
];

export default function BuildGrid({ orders, setOrders, apRemaining }: Props) {
  return (
    <div className={styles.grid}>
      {CELLS.map((cell, i) => {
        const count = orders.filter(cell.matches).length;
        const canAdd = apRemaining >= cell.cost;
        return (
          <div key={i} className={`${styles.tile} ${count > 0 ? styles.on : ''}`}>
            <div className={styles.emoji}>{cell.emoji}</div>
            <div className={`display ${styles.label}`}>{cell.label}</div>
            <div className={`mono ${styles.cost}`}>{cell.cost} AP</div>
            <div className={styles.stepper}>
              <button
                type="button"
                aria-label={`remove ${cell.label}`}
                disabled={count === 0}
                onClick={() => setOrders((prev) => {
                  const idx = findLastIndexMatching(prev, cell.matches);
                  if (idx === -1) return prev;
                  return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
                })}
              >−</button>
              <span className={styles.num}>{count}</span>
              <button
                type="button"
                aria-label={`add ${cell.label}`}
                disabled={!canAdd}
                onClick={() => setOrders((prev) => [...prev, cell.make()])}
              >+</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
