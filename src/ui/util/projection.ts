import type { Leader, Order } from '../../engine/types';

export interface ProjectedInventory {
  missiles: number;
  bombers: number;
  warheadsSmall: number;
  warheadsMedium: number;
  warheadsLarge: number;
  shieldsInStockpile: number;
  aaInStockpile: number;
  deployedShields: number;
  deployedAA: number;
}

/**
 * Project a leader's inventory forward given a queue of orders. Builds add,
 * launches subtract (deliveries + warheads), deploys move from stockpile to
 * deployed pool. Clamps every count at 0 — UI consumers can use these values
 * directly to enable/disable + steppers.
 */
export function projectInventory(leader: Leader, orders: Order[]): ProjectedInventory {
  const p: ProjectedInventory = {
    missiles: leader.stockpile.missiles,
    bombers: leader.stockpile.bombers,
    warheadsSmall: leader.stockpile.warheadsSmall,
    warheadsMedium: leader.stockpile.warheadsMedium,
    warheadsLarge: leader.stockpile.warheadsLarge,
    shieldsInStockpile: leader.stockpile.shields,
    aaInStockpile: leader.stockpile.aa,
    deployedShields: leader.deployedShields,
    deployedAA: leader.deployedAA,
  };

  for (const o of orders) {
    switch (o.kind) {
      case 'build-missile':
        p.missiles += 1;
        break;
      case 'build-bomber':
        p.bombers += 1;
        break;
      case 'build-warhead':
        if (o.yield === 'small') p.warheadsSmall += 1;
        else if (o.yield === 'medium') p.warheadsMedium += 1;
        else p.warheadsLarge += 1;
        break;
      case 'build-defence':
        if (o.type === 'shield') p.shieldsInStockpile += 1;
        else p.aaInStockpile += 1;
        break;
      case 'deploy-defence':
        if (o.type === 'shield') {
          p.shieldsInStockpile = Math.max(0, p.shieldsInStockpile - 1);
          p.deployedShields += 1;
        } else {
          p.aaInStockpile = Math.max(0, p.aaInStockpile - 1);
          p.deployedAA += 1;
        }
        break;
      case 'launch':
        if (o.delivery === 'missile') p.missiles = Math.max(0, p.missiles - 1);
        else p.bombers = Math.max(0, p.bombers - 1);
        if (o.warhead === 'small') p.warheadsSmall = Math.max(0, p.warheadsSmall - 1);
        else if (o.warhead === 'medium') p.warheadsMedium = Math.max(0, p.warheadsMedium - 1);
        else p.warheadsLarge = Math.max(0, p.warheadsLarge - 1);
        break;
      // build-factory / propaganda / woo: no stockpile mutation
      default:
        break;
    }
  }

  return p;
}
