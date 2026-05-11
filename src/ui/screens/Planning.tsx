import { useEffect, useRef, useState, useCallback } from 'react';
import type { ScreenProps } from '../App';
import type { GameState, LeaderId, Order } from '../../engine/types';
import { isHuman } from '../../engine/state';
import { totalApCost } from '../../engine/orders';
import LeaderCard from '../components/LeaderCard';
import ApBudget from '../components/ApBudget';
import OrderForm from '../components/OrderForm';
import styles from './Planning.module.css';

const HOLD_MS = 600;

export default function Planning({ state, dispatch }: ScreenProps) {
  const game = state.game!;
  const player = game.leaders.player1;
  const aiLeaders = game.cast.filter((id) => !isHuman(id) && game.leaders[id].alive);

  const [orders, setOrders] = useState<Order[]>([]);
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<number | null>(null);

  function addOrder(o: Order) { setOrders((q) => [...q, o]); }
  function removeOrder(i: number) { setOrders((q) => q.filter((_, idx) => idx !== i)); }

  const startHold = useCallback(() => {
    setHolding(true);
    holdTimer.current = window.setTimeout(() => {
      setHolding(false);
      holdTimer.current = null;
      dispatch({ type: 'PLAYER_SUBMIT', orders });
    }, HOLD_MS);
  }, [orders, dispatch]);

  const cancelHold = useCallback(() => {
    setHolding(false);
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  useEffect(() => () => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  const apUsed = totalApCost(orders);
  const apTotal = player.ap; // engine's ap already factors banked + bonus per resolution
  const overBudget = apUsed > apTotal;

  const lastRoundChips = game.orderHistory.length > 0
    ? Object.entries(game.orderHistory[game.orderHistory.length - 1])
        .flatMap(([id, os]) =>
          (os ?? []).filter((o) => o.kind === 'launch' || o.kind === 'propaganda').map((o) => ({ id, o })),
        )
    : [];

  return (
    <div className={styles.planning}>
      <header className={styles.header}>Round {game.round}</header>

      <section className={styles.ownPanel}>
        <h2 className={styles.sectionTitle}>{player.country} {player.name} (you)</h2>
        <div className={styles.statsRow}>
          <span>Pop {player.population}M</span>
          <span>Factories {player.factories}</span>
        </div>
        <div className={styles.statsRow}>
          <span>Missiles {player.stockpile.missiles}</span>
          <span>Bombers {player.stockpile.bombers}</span>
          <span>Shields {player.stockpile.shields}</span>
          <span>AA {player.stockpile.aa}</span>
        </div>
        <ApBudget ap={player.ap} apBanked={player.apBanked} />
      </section>

      <section className={styles.historyStrip}>
        <h2 className={styles.sectionTitle}>Last round</h2>
        {lastRoundChips.length === 0 ? (
          <div className={styles.chip}>—</div>
        ) : (
          lastRoundChips.map((c, i) => (
            <div key={i} className={`${styles.chip} ${styles.attack}`}>
              {game.leaders[c.id as LeaderId]?.country.split(' ')[0]}{' '}
              {c.o.kind === 'launch'
                ? `→ ${game.leaders[c.o.target].country.split(' ')[0]}`
                : c.o.kind === 'propaganda'
                ? `📰 ${game.leaders[c.o.target].country.split(' ')[0]}`
                : ''}
            </div>
          ))
        )}
      </section>

      <section className={styles.tableGrid}>
        {aiLeaders.map((id) => {
          const leader = game.leaders[id];
          return (
            <LeaderCard
              key={id}
              leader={leader}
              playerHits={leader.recentAggressionFrom.player1 ?? 0}
              playerFav={leader.favourability.player1 ?? 0}
              myFav={player.favourability[id] ?? 0}
              playerGrudge={leader.grudge.player1 ?? 0}
            />
          );
        })}
      </section>

      <section className={styles.ordersList}>
        <h2 className={styles.sectionTitle}>Your orders</h2>
        {orders.length === 0 ? (
          <div className={styles.empty}>No orders yet.</div>
        ) : (
          orders.map((o, i) => (
            <div key={i} className={styles.orderRow}>
              <span className={styles.orderLabel}>{formatOrder(o, game)}</span>
              <button type="button" className={styles.removeBtn} onClick={() => removeOrder(i)}>×</button>
            </div>
          ))
        )}
        <div className={`${styles.apSummary} ${overBudget ? styles.over : ''}`}>
          AP used: {apUsed} / {apTotal}
        </div>
      </section>

      <OrderForm state={game} playerId="player1" committedOrders={orders} onAdd={addOrder} />

      <div className={styles.sealWrap}>
        <button
          type="button"
          className={`${styles.sealBtn} ${holding ? styles.holding : ''}`}
          disabled={overBudget}
          onPointerDown={startHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
        >
          <span className={styles.sealLabel}>Hold to Seal Orders</span>
          <span className={styles.sealProgress} />
        </button>
      </div>
    </div>
  );
}

function formatOrder(o: Order, game: GameState): string {
  switch (o.kind) {
    case 'build-factory': return 'Build factory (3 AP)';
    case 'build-missile': return 'Build missile (1 AP)';
    case 'build-bomber': return 'Build bomber (1 AP)';
    case 'build-warhead': return `Build ${o.yield} warhead (${o.yield === 'small' ? 1 : o.yield === 'medium' ? 2 : 3} AP)`;
    case 'build-defence': return `Build ${o.type === 'shield' ? 'shield' : 'AA'} (2 AP)`;
    case 'launch': return `Launch ${o.warhead} at ${game.leaders[o.target].name} (${o.targetType}, 2 AP)`;
    case 'propaganda': return `Propaganda → ${game.leaders[o.target].name} (1 AP)`;
    case 'woo': return `Woo ${game.leaders[o.target].name} × ${o.points} (${o.points} AP)`;
  }
}
