import type { Leader } from '../../engine/types';
import styles from './LeaderCard.module.css';

export interface LeaderCardProps {
  leader: Leader;
  playerHits: number;     // recentAggressionFrom value against player
  playerFav: number;      // favourability *they* have toward me (player wooing them)
  myFav: number;          // favourability *I* have toward them (they wooed me)
  playerGrudge: number;   // their grudge against player
}

export default function LeaderCard({
  leader,
  playerHits,
  playerFav,
  myFav,
  playerGrudge,
}: LeaderCardProps) {
  const arsenalCount =
    leader.stockpile.missiles +
    leader.stockpile.bombers +
    leader.stockpile.warheadsSmall +
    leader.stockpile.warheadsMedium +
    leader.stockpile.warheadsLarge;

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.flag}>{leader.country.split(' ')[0]}</span>
        <span className={styles.name}>{leader.name}</span>
      </div>
      <div className={styles.stats}>
        Pop {leader.population}M · Factories {leader.factories} · Arsenal {arsenalCount}
      </div>
      <div className={styles.badges}>
        {playerHits > 0 && <span className={`${styles.badge} ${styles.hitYou}`}>hit you</span>}
        {playerFav > 0 && <span className={`${styles.badge} ${styles.wooingYou}`}>you wooed</span>}
        {myFav > 0 && <span className={`${styles.badge} ${styles.youWooed}`}>they wooed you</span>}
        {playerGrudge > 0 && <span className={`${styles.badge} ${styles.grudge}`}>grudge ({playerGrudge})</span>}
      </div>
      {/* mood-line slot — empty in thin P3, P4a fills with flavor */}
      <div className={styles.moodSlot} />
    </div>
  );
}
