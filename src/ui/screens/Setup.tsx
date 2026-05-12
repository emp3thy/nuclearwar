import { useState } from 'react';
import type { ScreenProps } from '../App';
import type { Difficulty, LeaderId } from '../../engine/types';
import { LEADER_PROFILES } from '../../engine/balance';
import { isHuman } from '../../engine/state';
import styles from './Setup.module.css';

const AI_IDS: LeaderId[] = (Object.keys(LEADER_PROFILES) as LeaderId[]).filter(
  (id) => !isHuman(id),
);
const HUMAN_IDS: LeaderId[] = ['player1', 'player2', 'player3', 'player4', 'player5'];

interface HumanRow {
  id: LeaderId;
  name: string;
  country: string;
}

function generateSeed(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function Setup({ dispatch }: ScreenProps) {
  const [humans, setHumans] = useState<HumanRow[]>([
    { id: 'player1', name: 'Rufus T. Firefly', country: '🦆 Freedonia' },
  ]);
  const [selectedAi, setSelectedAi] = useState<LeaderId[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [seedInput, setSeedInput] = useState('');

  const allHumansComplete = humans.every((h) => h.name.trim() !== '' && h.country.trim() !== '');
  const canStart = selectedAi.length >= 2 && selectedAi.length <= 4 && allHumansComplete;

  function addHuman() {
    if (humans.length >= 5) return;
    const nextId = HUMAN_IDS[humans.length];
    setHumans((prev) => [...prev, { id: nextId, name: '', country: '' }]);
  }

  function removeHuman(idx: number) {
    if (idx === 0) return; // P1 cannot be removed
    setHumans((prev) => {
      const without = prev.filter((_, i) => i !== idx);
      // Re-key by index so we don't have holes in player1..playerN
      return without.map((h, i) => ({ ...h, id: HUMAN_IDS[i] }));
    });
  }

  function updateHuman(idx: number, field: 'name' | 'country', value: string) {
    setHumans((prev) => prev.map((h, i) => (i === idx ? { ...h, [field]: value } : h)));
  }

  function toggleAi(id: LeaderId) {
    setSelectedAi((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  function start() {
    if (!canStart) return;
    const playerProfiles: Partial<Record<LeaderId, { name: string; country: string }>> = {};
    for (const h of humans) {
      playerProfiles[h.id] = { name: h.name, country: h.country };
    }
    dispatch({
      type: 'START_GAME',
      opts: {
        cast: [...humans.map((h) => h.id), ...selectedAi],
        difficulty,
        seed: seedInput || generateSeed(),
        config: { playerProfiles },
      },
    });
  }

  return (
    <div className={styles.setup}>
      <h1 className={styles.title}>New Game</h1>

      <section className={styles.humanRoster}>
        <h2 className={styles.sectionTitle}>Humans (1–5)</h2>
        {humans.map((h, idx) => (
          <div key={h.id} className={styles.humanCard}>
            <span className={styles.humanLabel}>P{idx + 1}</span>
            <input
              type="text"
              aria-label={`Name for P${idx + 1}`}
              value={h.name}
              onChange={(e) => updateHuman(idx, 'name', e.target.value)}
              placeholder="Name"
            />
            <input
              type="text"
              aria-label={`Country for P${idx + 1}`}
              value={h.country}
              onChange={(e) => updateHuman(idx, 'country', e.target.value)}
              placeholder="🌐 Country"
            />
            {idx > 0 && (
              <button
                type="button"
                aria-label={`Remove P${idx + 1}`}
                className={styles.removeBtn}
                onClick={() => removeHuman(idx)}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className={styles.addBtn}
          onClick={addHuman}
          disabled={humans.length >= 5}
        >
          + Add another human {humans.length >= 5 && '(max 5)'}
        </button>
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
        Start ({humans.length} human{humans.length === 1 ? '' : 's'} + {selectedAi.length} AI)
      </button>
    </div>
  );
}
