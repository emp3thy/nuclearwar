import type { Dispatch, SetStateAction } from 'react';
import type { Order } from '../../engine/types';
import { ACTION_COSTS } from '../../engine/balance';
import styles from './DefenceGrid.module.css';
import { findLastIndexMatching } from '../util/arrays';

interface Props {
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  apRemaining: number;
  projectedShieldsInStockpile: number;
  projectedAaInStockpile: number;
}

interface CellSpec {
  emoji: string;
  label: string;
  cost: number;
  matches: (o: Order) => boolean;
  make: () => Order;
  ownedHint?: number;
  canAddMore: boolean;
}

export default function DefenceGrid({
  orders, setOrders, apRemaining, projectedShieldsInStockpile, projectedAaInStockpile,
}: Props) {
  const cells: CellSpec[] = [
    {
      emoji: '🛡️', label: 'Build Shield', cost: ACTION_COSTS.buildDefence,
      matches: (o) => o.kind === 'build-defence' && o.type === 'shield',
      make: () => ({ kind: 'build-defence', type: 'shield' }),
      canAddMore: true,
    },
    {
      emoji: '🛡️↑', label: 'Deploy Shield', cost: ACTION_COSTS.deployDefence,
      matches: (o) => o.kind === 'deploy-defence' && o.type === 'shield',
      make: () => ({ kind: 'deploy-defence', type: 'shield' }),
      ownedHint: projectedShieldsInStockpile,
      canAddMore: projectedShieldsInStockpile > 0,
    },
    {
      emoji: '📡', label: 'Build AA', cost: ACTION_COSTS.buildDefence,
      matches: (o) => o.kind === 'build-defence' && o.type === 'aa',
      make: () => ({ kind: 'build-defence', type: 'aa' }),
      canAddMore: true,
    },
    {
      emoji: '📡↑', label: 'Deploy AA', cost: ACTION_COSTS.deployDefence,
      matches: (o) => o.kind === 'deploy-defence' && o.type === 'aa',
      make: () => ({ kind: 'deploy-defence', type: 'aa' }),
      ownedHint: projectedAaInStockpile,
      canAddMore: projectedAaInStockpile > 0,
    },
  ];

  return (
    <div className={styles.grid}>
      {cells.map((cell, i) => {
        const count = orders.filter(cell.matches).length;
        const canAdd = cell.canAddMore && apRemaining >= cell.cost;
        return (
          <div key={i} className={`${styles.cell} ${count > 0 ? styles.on : ''}`}>
            <div className={styles.emoji}>{cell.emoji}</div>
            <div className={styles.label}>{cell.label}</div>
            <div className={styles.cost}>
              {cell.cost} AP
              {cell.ownedHint !== undefined ? ` · ${cell.ownedHint} owned` : ''}
            </div>
            <div className={styles.stepper}>
              <button
                type="button"
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
