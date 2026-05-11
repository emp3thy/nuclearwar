import { useState } from 'react';
import type { ScreenProps } from '../App';
import type { Difficulty, LeaderId } from '../../engine/types';
import { LEADER_PROFILES } from '../../engine/balance';
import { isHuman } from '../../engine/state';
import styles from './Setup.module.css';

const AI_IDS: LeaderId[] = (Object.keys(LEADER_PROFILES) as LeaderId[]).filter(
  (id) => !isHuman(id),
);

function generateSeed(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function Setup({ dispatch }: ScreenProps) {
  const [name, setName] = useState('Rufus T. Firefly');
  const [country, setCountry] = useState('🦆 Freedonia');
  const [selectedAi, setSelectedAi] = useState<LeaderId[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [seedInput, setSeedInput] = useState('');

  const canStart = selectedAi.length >= 2 && selectedAi.length <= 4;

  function toggleAi(id: LeaderId) {
    setSelectedAi((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  function start() {
    if (!canStart) return;
    dispatch({
      type: 'START_GAME',
      opts: {
        cast: ['player1', ...selectedAi],
        difficulty,
        seed: seedInput || generateSeed(),
        config: {
          playerProfiles: { player1: { name, country } },
        },
      },
    });
  }

  return (
    <div className={styles.setup}>
      <h1 className={styles.title}>New Game</h1>

      <section className={styles.playerPanel}>
        <label>
          Your name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rufus T. Firefly"
          />
        </label>
        <label>
          Country
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="🦆 Freedonia"
          />
        </label>
      </section>

      <section className={styles.castPicker}>
        <h2 className={styles.sectionTitle}>AI cast (pick 2–4)</h2>
        {AI_IDS.map((id) => {
          const profile = LEADER_PROFILES[id];
          const selected = selectedAi.includes(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              className={`${styles.castCard} ${selected ? styles.selected : ''}`}
              onClick={() => toggleAi(id)}
            >
              <span className={styles.castFlag}>{profile.country}</span>
              <span className={styles.castName}>{profile.name}</span>
              <span className={styles.castPop}>{profile.startPop}M</span>
            </button>
          );
        })}
      </section>

      <section className={styles.difficulty}>
        <h2 className={styles.sectionTitle}>Difficulty</h2>
        {(['easy', 'normal', 'hard'] as const).map((d) => (
          <label key={d} className={styles.diffRadio}>
            <input
              type="radio"
              name="difficulty"
              value={d}
              checked={difficulty === d}
              onChange={() => setDifficulty(d)}
            />
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </label>
        ))}
      </section>

      <section className={styles.seed}>
        <label>
          Seed (optional)
          <input
            type="text"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            placeholder="(random)"
          />
        </label>
      </section>

      <button
        type="button"
        disabled={!canStart}
        onClick={start}
        className={styles.newGameButton}
      >
        New Game
      </button>
    </div>
  );
}
