import { useState } from 'react';
import type { ScreenProps } from '../App';
import type { GameState, LeaderId, Order, TargetType, Yield } from '../../engine/types';
import { isHuman } from '../../engine/state';
import { totalApCost, apCostOf, analyseOrderSequence } from '../../engine/orders';
import { AP_BANK_CAP } from '../../engine/balance';
import { pickMasthead } from '../../engine/masthead';
import { HoldButton, Panel, RoundBadge, Stat } from '../components/comic';
import Portrait from '../components/Portrait';
import { extractFlag, stripFlag } from '../portraits';
import ApBudget from '../components/ApBudget';
import BuildGrid from '../components/BuildGrid';
import DefenceGrid from '../components/DefenceGrid';
import TargetRow from '../components/TargetRow';
import SoftWarnPanel from '../components/SoftWarnPanel';
import { projectInventory } from '../util/projection';
import styles from './Planning.module.css';

const YIELD_SHORT: Record<Yield, string> = { small: 'small', medium: 'med', large: 'big' };

function orderIcon(o: Order): string {
  switch (o.kind) {
    case 'build-factory':  return '🏭';
    case 'build-missile':  return '🚀';
    case 'build-bomber':   return '✈️';
    case 'build-warhead':  return '💥';
    case 'build-defence':  return o.type === 'shield' ? '🛡️' : '📡';
    case 'deploy-defence': return o.type === 'shield' ? '🛡️↑' : '📡↑';
    case 'launch':         return '↯';
    case 'propaganda':     return '📃';
    case 'woo':            return '🤝';
  }
}

function orderLabel(o: Order, game: GameState): string {
  switch (o.kind) {
    case 'build-factory':  return 'Build factory';
    case 'build-missile':  return 'Build missile';
    case 'build-bomber':   return 'Build bomber';
    case 'build-warhead':  return `Build ${o.yield} warhead`;
    case 'build-defence':  return `Build ${o.type === 'shield' ? 'shield' : 'AA'}`;
    case 'deploy-defence': return `Deploy ${o.type === 'shield' ? 'shield' : 'AA'}`;
    case 'launch':
      return `Launch on ${game.leaders[o.target].name} · ${o.delivery} · ${YIELD_SHORT[o.warhead]} · ${o.targetType}`;
    case 'propaganda':     return `Propaganda → ${game.leaders[o.target].name}`;
    case 'woo':            return `Woo ${game.leaders[o.target].name}`;
  }
}

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

  const totalWarheads =
    player.stockpile.warheadsSmall + player.stockpile.warheadsMedium + player.stockpile.warheadsLarge;

  function removeOrderAt(index: number) {
    setOrders((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className={`screen paper ${styles.planning}`}>
      <div className={styles.wrap}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <RoundBadge round={game.round} label="Round" />
            <div className={styles.headerName}>
              <div className={`display ${styles.leaderLine}`}>
                {player.name} <span className={styles.headerDot}>·</span>{' '}
                {stripFlag(player.country)} {extractFlag(player.country)}
              </div>
            </div>
          </div>
        </header>

        <div className={styles.grid}>
          {/* Left column — Your Country */}
          <div className={`col gap-4 ${styles.colOwn}`}>
            <Panel title="Your Country" tilt={-1} halftone halftoneColor="rgba(29,127,176,0.08)">
              <div className={styles.ownRow}>
                <Portrait leaderId={activeId} size={70} flag={extractFlag(player.country)} />
                <div className={styles.statGrid}>
                  <Stat label="POP" value={`${player.population}M`} />
                  <Stat label="FACTORIES" value={player.factories} />
                  <Stat
                    label="ARSENAL"
                    value={`${player.stockpile.missiles} / ${player.stockpile.bombers}`}
                    sub={`miss / bomb · ${totalWarheads}W`}
                  />
                  <Stat
                    label="DEFENCE"
                    value={`${player.stockpile.shields} / ${player.stockpile.aa}`}
                    sub="shield / AA"
                  />
                </div>
              </div>
              <ApBudget used={apUsed} max={apTotal} banked={player.apBanked} />
            </Panel>
            <SoftWarnPanel warnings={softWarnings} game={game} />
          </div>

          {/* Centre column — The Table + Build Yard + Civil Defence */}
          <div className={`col gap-4 ${styles.colTable}`}>
            <div className={styles.tableHead}>
              <h2 className={`display ${styles.tableTitle}`}>The Table</h2>
              <span className={`hand ${styles.tableSub}`}>
                Queue launches, woos, and propaganda per leader.
              </span>
            </div>
            <div className={styles.tableGrid}>
              {aiLeaders.map((id, i) => (
                <TargetRow
                  key={id}
                  tilt={i % 2 === 0 ? -1 : 1}
                  target={game.leaders[id]}
                  mood={moodByLeader[id]}
                  targetType={targetTypes[id] ?? 'people'}
                  onTargetTypeChange={(next) => {
                    setTargetTypes((prev) => ({ ...prev, [id]: next }));
                    // Retarget every launch already queued at this leader so the
                    // toggle and the orders never disagree.
                    setOrders((prev) => prev.map((o) =>
                      o.kind === 'launch' && o.target === id ? { ...o, targetType: next } : o,
                    ));
                  }}
                  orders={orders}
                  setOrders={setOrders}
                  apRemaining={apRemaining}
                  projection={projection}
                />
              ))}
            </div>

            <Panel title="Build Yard" tilt={-1}>
              <BuildGrid orders={orders} setOrders={setOrders} apRemaining={apRemaining} />
            </Panel>

            <Panel title="Civil Defence" tilt={1}>
              <DefenceGrid
                orders={orders}
                setOrders={setOrders}
                apRemaining={apRemaining}
                projectedShieldsInStockpile={projection.shieldsInStockpile}
                projectedAaInStockpile={projection.aaInStockpile}
              />
            </Panel>
          </div>

          {/* Right column — Your Orders + masthead teaser */}
          <div className={`col gap-4 ${styles.colOrders}`}>
            <Panel title="Your Orders" tilt={1} style={{ minHeight: 320 }}>
              {orders.length === 0 ? (
                <div className={`hand ${styles.emptyOrders}`}>
                  No orders yet. Banking is fine. (Cap {AP_BANK_CAP}.)
                </div>
              ) : (
                <div className={styles.orderList}>
                  {orders.map((o, i) => (
                    <div key={i} className={styles.orderRow}>
                      <span className={styles.orderIcon}>{orderIcon(o)}</span>
                      <span className={styles.orderLabel}>{orderLabel(o, game)}</span>
                      <span className={`mono ${styles.orderAp}`}>{apCostOf(o)} AP</span>
                      <button
                        type="button"
                        className={styles.xBtn}
                        aria-label="remove"
                        onClick={() => removeOrderAt(i)}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.subtotal}>
                <div className="between">
                  <span className={`display ${styles.subtotalLabel}`}>SUBTOTAL</span>
                  <span
                    className={`mono ${styles.subtotalValue} ${overBudget ? styles.subtotalOver : ''}`}
                  >
                    {apUsed} <span className={styles.subtotalMax}>/ {apTotal} AP</span>
                  </span>
                </div>
                {overBudget && (
                  <div className={`hand ${styles.overLine}`}>
                    Over budget by {apUsed - apTotal}. Drop something. Or don't, and panic.
                  </div>
                )}
              </div>

              <div className={styles.sealWrap}>
                <HoldButton
                  duration={600}
                  disabled={overBudget}
                  onComplete={() => dispatch({ type: 'PLAYER_SUBMIT', leaderId: activeId, orders })}
                  style={{ width: '100%', fontSize: 22, padding: '16px 20px' }}
                >
                  SEAL ORDERS — HOLD ↯
                </HoldButton>
                <div className={styles.sealHint}>Hold 0.6s. Irreversible.</div>
              </div>
            </Panel>

            <Panel tilt={-1} dark>
              <div className={`display ${styles.mastKicker}`}>TONIGHT'S MASTHEAD</div>
              <div className={`tabloid ${styles.mastTitle}`}>
                {pickMasthead(game.mastheadOrder, game.round, null)}
              </div>
              <div className={`hand ${styles.mastSub}`}>
                "Vol. IV · Round {game.round} · Morning Edition"
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
