import { useState } from 'react';
import type { ScreenProps } from '../App';
import type { LeaderId, Order, TargetType } from '../../engine/types';
import { isHuman } from '../../engine/state';
import { totalApCost, analyseOrderSequence } from '../../engine/orders';
import BuildGrid from '../components/BuildGrid';
import DefenceGrid from '../components/DefenceGrid';
import TargetRow from '../components/TargetRow';
import SoftWarnPanel from '../components/SoftWarnPanel';
import { projectInventory } from '../util/projection';
import styles from './Planning.module.css';

export default function Planning({ state, dispatch }: ScreenProps) {
  const game = state.game!;
  const activeId = state.activeHumanTurn ?? 'player1';
  const player = game.leaders[activeId];

  const aiLeaders = game.cast.filter((id) => !isHuman(id) && game.leaders[id].alive);

  const [orders, setOrders] = useState<Order[]>([]);
  const [targetTypes, setTargetTypes] = useState<Partial<Record<LeaderId, TargetType>>>({});

  const apUsed = totalApCost(orders);
  const apTotal = player.ap;
  const apRemaining = Math.max(0, apTotal - apUsed);
  const overBudget = apUsed > apTotal;

  const projection = projectInventory(player, orders);
  const softWarnings = analyseOrderSequence(game, activeId, orders);

  const moodByLeader: Partial<Record<LeaderId, string>> = {};
  for (const e of state.events) {
    if (e.kind === 'PreRoundMood') moodByLeader[e.leaderId] = e.quote;
  }

  return (
    <div className={styles.planning}>
      <header className={styles.header}>
        Round {game.round}{state.activeHumanTurn ? ` · ${player.name}` : ''}
      </header>

      <div className={styles.apBanner}>
        <span>AP used: {apUsed} / {apTotal}</span>
        <span>{apRemaining} left</span>
      </div>

      <SoftWarnPanel warnings={softWarnings} game={game} />

      <div className={styles.sectionTitle}>Build</div>
      <BuildGrid orders={orders} setOrders={setOrders} apRemaining={apRemaining} />

      <div className={styles.sectionTitle}>Defence</div>
      <DefenceGrid
        orders={orders}
        setOrders={setOrders}
        apRemaining={apRemaining}
        projectedShieldsInStockpile={projection.shieldsInStockpile}
        projectedAaInStockpile={projection.aaInStockpile}
      />

      <div className={styles.sectionTitle}>Actions by target</div>
      {aiLeaders.map((id) => (
        <TargetRow
          key={id}
          target={game.leaders[id]}
          mood={moodByLeader[id]}
          targetType={targetTypes[id] ?? 'people'}
          onTargetTypeChange={(next) => setTargetTypes((prev) => ({ ...prev, [id]: next }))}
          orders={orders}
          setOrders={setOrders}
          apRemaining={apRemaining}
          projection={projection}
        />
      ))}

      <button
        type="button"
        className={styles.sealBtn}
        disabled={overBudget}
        onClick={() => dispatch({ type: 'PLAYER_SUBMIT', leaderId: activeId, orders })}
      >Seal Orders</button>
    </div>
  );
}
