import { useState } from 'react';
import type { DeliveryType, GameState, LeaderId, Order, TargetType, Yield } from '../../engine/types';
import { validateOrderSequence, totalApCost } from '../../engine/orders';
import styles from './OrderForm.module.css';

export interface OrderFormProps {
  state: GameState;
  playerId: LeaderId;
  committedOrders: Order[];
  onAdd: (order: Order) => void;
}

type OrderKind = Order['kind'];

const ORDER_KINDS: { value: OrderKind; label: string }[] = [
  { value: 'build-factory', label: 'Build factory' },
  { value: 'build-missile', label: 'Build missile' },
  { value: 'build-bomber', label: 'Build bomber' },
  { value: 'build-warhead', label: 'Build warhead' },
  { value: 'build-defence', label: 'Build defence' },
  { value: 'launch', label: 'Launch' },
  { value: 'propaganda', label: 'Propaganda' },
  { value: 'woo', label: 'Woo' },
];

export default function OrderForm({ state, playerId, committedOrders, onAdd }: OrderFormProps) {
  const [kind, setKind] = useState<OrderKind>('build-factory');
  // For build-warhead the default 'small' is fine (it's the cheapest); for
  // launch we treat '' as unset so the user must explicitly pick a warhead.
  const [warheadBuild, setWarheadBuild] = useState<Yield>('small');
  const [warheadLaunch, setWarheadLaunch] = useState<Yield | ''>('');
  const [defenceType, setDefenceType] = useState<'shield' | 'aa'>('shield');
  const [target, setTarget] = useState<LeaderId | ''>('');
  const [delivery, setDelivery] = useState<DeliveryType | ''>('');
  const [targetType, setTargetType] = useState<TargetType>('people');
  const [points, setPoints] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const aliveOthers = state.cast.filter(
    (id) => id !== playerId && state.leaders[id]?.alive,
  );

  function buildOrder(): { order: Order } | { missing: string } {
    switch (kind) {
      case 'build-factory':
      case 'build-missile':
      case 'build-bomber':
        return { order: { kind } };
      case 'build-warhead':
        return { order: { kind, yield: warheadBuild } };
      case 'build-defence':
        return { order: { kind, type: defenceType } };
      case 'deploy-defence':
        return { order: { kind, type: defenceType } };
      case 'launch':
        if (!target) return { missing: 'target' };
        if (!delivery) return { missing: 'delivery' };
        if (!warheadLaunch) return { missing: 'warhead' };
        return { order: { kind, target, delivery, warhead: warheadLaunch, targetType } };
      case 'propaganda':
        if (!target) return { missing: 'target' };
        return { order: { kind, target } };
      case 'woo':
        if (!target) return { missing: 'target' };
        return { order: { kind, target } };
    }
  }

  function tryAdd() {
    const built = buildOrder();
    if ('missing' in built) {
      setErrorMsg(`Missing ${built.missing}.`);
      return;
    }
    const order = built.order;
    // Validate the FULL queue (existing + new) with stockpile projection —
    // catches multi-launch cases where individual launches each pass validateOrder
    // but the sequence would over-consume stockpile.
    const fullQueue = [...committedOrders, order];
    const v = validateOrderSequence(state, playerId, fullQueue);
    if (!v.ok) {
      // If the failure is on the NEW order (last index), surface its reason.
      // If it's on a prior order, that shouldn't happen if each was validated
      // when added — surface the indexed reason for debugging.
      const onNewOrder = v.orderIndex === fullQueue.length - 1;
      setErrorMsg(onNewOrder ? v.reason : `Prior order #${v.orderIndex + 1}: ${v.reason}`);
      return;
    }
    // AP check (validateOrderSequence does NOT check AP — that's the reducer's
    // final gate, but we mirror it here so the user gets immediate feedback)
    const totalCost = totalApCost(fullQueue);
    if (totalCost > state.leaders[playerId].ap) {
      setErrorMsg(`Over-budget: ${totalCost} AP > ${state.leaders[playerId].ap} AP available.`);
      return;
    }
    setErrorMsg(null);
    onAdd(order);
  }

  const needsTarget = kind === 'launch' || kind === 'propaganda' || kind === 'woo';
  const needsDefenceType = kind === 'build-defence';
  const needsDelivery = kind === 'launch';
  const needsTargetType = kind === 'launch';
  const needsPoints = kind === 'woo';

  return (
    <div className={styles.orderForm}>
      <label className={styles.field}>
        <span>Order kind</span>
        <select
          value={kind}
          onChange={(e) => { setKind(e.target.value as OrderKind); setErrorMsg(null); }}
          aria-label="Order kind"
        >
          {ORDER_KINDS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
      </label>

      {needsTarget && (
        <label className={styles.field}>
          <span>Target</span>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as LeaderId)}
            aria-label="Target"
          >
            <option value="">— pick —</option>
            {aliveOthers.map((id) => (
              <option key={id} value={id}>{state.leaders[id].name}</option>
            ))}
          </select>
        </label>
      )}

      {kind === 'build-warhead' && (
        <label className={styles.field}>
          <span>Yield</span>
          <select value={warheadBuild} onChange={(e) => setWarheadBuild(e.target.value as Yield)} aria-label="Yield">
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
      )}

      {kind === 'launch' && (
        <label className={styles.field}>
          <span>Warhead</span>
          <select value={warheadLaunch} onChange={(e) => setWarheadLaunch(e.target.value as Yield | '')} aria-label="Warhead">
            <option value="">— pick —</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
      )}

      {needsDefenceType && (
        <label className={styles.field}>
          <span>Defence type</span>
          <select
            value={defenceType}
            onChange={(e) => setDefenceType(e.target.value as 'shield' | 'aa')}
            aria-label="Defence type"
          >
            <option value="shield">Shield (vs missiles)</option>
            <option value="aa">AA (vs bombers)</option>
          </select>
        </label>
      )}

      {needsDelivery && (
        <label className={styles.field}>
          <span>Delivery</span>
          <select value={delivery} onChange={(e) => setDelivery(e.target.value as DeliveryType | '')} aria-label="Delivery">
            <option value="">— pick —</option>
            <option value="missile">Missile</option>
            <option value="bomber">Bomber</option>
          </select>
        </label>
      )}

      {needsTargetType && (
        <label className={styles.field}>
          <span>Impact</span>
          <select value={targetType} onChange={(e) => setTargetType(e.target.value as TargetType)} aria-label="Impact">
            <option value="people">People</option>
            <option value="infra">Infrastructure</option>
          </select>
        </label>
      )}

      {needsPoints && (
        <label className={styles.field}>
          <span>Woo points</span>
          <input
            type="number"
            min={1}
            max={5}
            value={points}
            onChange={(e) => setPoints(parseInt(e.target.value, 10) || 1)}
            aria-label="Woo points"
          />
        </label>
      )}

      <button type="button" onClick={tryAdd} className={styles.addButton}>
        Add
      </button>

      {errorMsg && <div className={styles.error}>{errorMsg}</div>}
    </div>
  );
}
