import type { Dispatch, SetStateAction } from 'react';
import type { Leader, Order, TargetType, Yield } from '../../engine/types';
import type { ProjectedInventory } from '../util/projection';
import { ACTION_COSTS } from '../../engine/balance';
import LaunchCell from './LaunchCell';
import styles from './TargetRow.module.css';

interface Props {
  target: Leader;
  mood?: string;
  targetType: TargetType;
  onTargetTypeChange: (next: TargetType) => void;
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  apRemaining: number;
  projection: ProjectedInventory;
}

const YIELDS: Array<{ label: 'small' | 'med' | 'big'; yield: Yield }> = [
  { label: 'small', yield: 'small' },
  { label: 'med',   yield: 'medium' },
  { label: 'big',   yield: 'large' },
];

function findLastIndexMatching<T>(arr: T[], pred: (x: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (pred(arr[i])) return i;
  }
  return -1;
}

export default function TargetRow({
  target, mood, targetType, onTargetTypeChange, orders, setOrders, apRemaining, projection,
}: Props) {
  const flag = target.country.split(' ')[0];

  const wooed = orders.some((o) => o.kind === 'woo' && o.target === target.id);
  const propd  = orders.some((o) => o.kind === 'propaganda' && o.target === target.id);

  function toggleWoo() {
    if (wooed) {
      setOrders((prev) => prev.filter((o) => !(o.kind === 'woo' && o.target === target.id)));
    } else {
      if (apRemaining < ACTION_COSTS.woo) return;
      setOrders((prev) => [...prev, { kind: 'woo', target: target.id }]);
    }
  }
  function togglePropaganda() {
    if (propd) {
      setOrders((prev) => prev.filter((o) => !(o.kind === 'propaganda' && o.target === target.id)));
    } else {
      if (apRemaining < ACTION_COSTS.propaganda) return;
      setOrders((prev) => [...prev, { kind: 'propaganda', target: target.id }]);
    }
  }

  function warheadsLeftFor(y: Yield): number {
    if (y === 'small')  return projection.warheadsSmall;
    if (y === 'medium') return projection.warheadsMedium;
    return projection.warheadsLarge;
  }

  function launchCount(delivery: 'missile' | 'bomber', y: Yield): number {
    return orders.filter((o) =>
      o.kind === 'launch' && o.target === target.id && o.delivery === delivery && o.warhead === y && o.targetType === targetType,
    ).length;
  }

  function addLaunch(delivery: 'missile' | 'bomber', y: Yield) {
    setOrders((prev) => [...prev, {
      kind: 'launch', target: target.id, delivery, warhead: y, targetType,
    }]);
  }

  function removeLaunch(delivery: 'missile' | 'bomber', y: Yield) {
    setOrders((prev) => {
      const idx = findLastIndexMatching(prev, (o) =>
        o.kind === 'launch' && o.target === target.id && o.delivery === delivery && o.warhead === y && o.targetType === targetType,
      );
      if (idx === -1) return prev;
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  }

  const canLaunch = (delivery: 'missile' | 'bomber', y: Yield) => {
    const deliveryLeft = delivery === 'missile' ? projection.missiles : projection.bombers;
    if (deliveryLeft <= 0) return false;
    if (warheadsLeftFor(y) <= 0) return false;
    return apRemaining >= ACTION_COSTS.launch;
  };

  return (
    <div className={styles.row} aria-label={`Target row for ${target.name}`}>
      <div className={styles.head}>
        <span className={styles.flag}>{flag}</span>
        <span className={styles.name}>{target.name}</span>
        <span className={styles.tt}>
          <span
            className={`${styles.ttSeg} ${targetType === 'people' ? styles.ttOn : ''}`}
            onClick={() => onTargetTypeChange('people')}
          >people</span>
          <span
            className={`${styles.ttSeg} ${targetType === 'infra' ? styles.ttOn : ''}`}
            onClick={() => onTargetTypeChange('infra')}
          >infra</span>
        </span>
      </div>

      {mood && <div className={styles.mood}>{mood}</div>}

      <div className={styles.diplo}>
        <button
          type="button"
          className={`${styles.diploBtn} ${wooed ? styles.diploOn : ''}`}
          onClick={toggleWoo}
        >Woo<br/><span className={styles.cost}>1 AP</span></button>
        <button
          type="button"
          className={`${styles.diploBtn} ${propd ? styles.diploOn : ''}`}
          onClick={togglePropaganda}
        >Propaganda<br/><span className={styles.cost}>1 AP</span></button>
      </div>

      <div className={styles.rowLabel}>
        missiles <span className={styles.inv}>· {projection.missiles} left</span>
      </div>
      <div className={styles.lcGrid}>
        {YIELDS.map((Y) => (
          <LaunchCell
            key={`m-${Y.yield}`}
            sizeLabel={Y.label}
            warheadsLeft={warheadsLeftFor(Y.yield)}
            count={launchCount('missile', Y.yield)}
            canAdd={canLaunch('missile', Y.yield)}
            onInc={() => addLaunch('missile', Y.yield)}
            onDec={() => removeLaunch('missile', Y.yield)}
          />
        ))}
      </div>

      <div className={styles.rowLabel}>
        bombers <span className={`${styles.inv} ${projection.bombers === 0 ? styles.invEmpty : ''}`}>· {projection.bombers} left</span>
      </div>
      <div className={styles.lcGrid}>
        {YIELDS.map((Y) => (
          <LaunchCell
            key={`b-${Y.yield}`}
            sizeLabel={Y.label}
            warheadsLeft={warheadsLeftFor(Y.yield)}
            count={launchCount('bomber', Y.yield)}
            canAdd={canLaunch('bomber', Y.yield)}
            onInc={() => addLaunch('bomber', Y.yield)}
            onDec={() => removeLaunch('bomber', Y.yield)}
          />
        ))}
      </div>
    </div>
  );
}
