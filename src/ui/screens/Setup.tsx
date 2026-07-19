import { useState } from 'react';
import type { ScreenProps } from '../App';
import type { Difficulty, LeaderId } from '../../engine/types';
import { LEADER_PROFILES } from '../../engine/balance';
import { isHuman } from '../../engine/state';
import { Btn, Panel, Ribbon, Stamp, Tag } from '../components/comic';
import Portrait from '../components/Portrait';
import { extractFlag, stripFlag } from '../portraits';
import { CAST_COPY } from '../content/cast';
import styles from './Setup.module.css';

const AI_IDS: LeaderId[] = (Object.keys(LEADER_PROFILES) as LeaderId[]).filter(
  (id) => !isHuman(id),
);
const HUMAN_IDS: LeaderId[] = ['player1', 'player2', 'player3', 'player4', 'player5'];

/** Handoff per-tile stat-tag overrides (screens-1.jsx lines 70–72). */
const TILE_TAG_STYLE = { fontSize: 9, padding: '2px 5px' } as const;

const DIFFICULTIES: ReadonlyArray<{ id: Difficulty; label: string; sub: string }> = [
  { id: 'easy', label: 'Fine, Probably', sub: "30% random AI · what's the worst that could happen" },
  { id: 'normal', label: 'Not Great', sub: '10% random · things are getting spicy' },
  { id: 'hard', label: "We're Cooked", sub: '0% random + lookahead · kiss the kids' },
];

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
    setSelectedAi((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      if (current.length >= 4) return [...current.slice(1), id];
      return [...current, id];
    });
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
    <div className={`screen paper ${styles.setup}`}>
      <div className={styles.wrap}>
        <header className={styles.header}>
          <div>
            <div className={`display ${styles.kicker}`}>A Parody In Poor Taste</div>
            <h1 className={`display ${styles.title}`}>
              NUKE<span className={styles.bang}>!</span>
            </h1>
            <div className={`tabloid italic ${styles.tagline}`}>
              "Everybody plays. <strong>Nobody</strong> wins."
            </div>
          </div>
          <Ribbon color="yellow" rotate={2} style={{ whiteSpace: 'nowrap' }}>
            Select Your Enemies
          </Ribbon>
        </header>

        <div className={styles.grid}>
          <Panel title="The Table" halftone halftoneColor="rgba(212,38,68,0.08)">
            <div className={styles.castGrid}>
              {AI_IDS.map((id, i) => {
                const profile = LEADER_PROFILES[id];
                const copy = CAST_COPY[id];
                const picked = selectedAi.includes(id);
                const tilts = [-1.4, 0.8, -0.5, 1.2, -0.9, 0.4];
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={picked}
                    className={`${styles.castTile} ${picked ? styles.picked : ''}`}
                    style={{ transform: `rotate(${tilts[i % tilts.length]}deg)` }}
                    onClick={() => toggleAi(id)}
                  >
                    {picked && (
                      <Stamp color="magenta" rotate={-12} style={{ position: 'absolute', top: 6, right: 6, fontSize: 10, padding: '3px 7px', zIndex: 2 }}>
                        Picked
                      </Stamp>
                    )}
                    <div className={styles.tileRow}>
                      <Portrait leaderId={id} size={64} />
                      <div className={styles.tileBody}>
                        <div className={`display ${styles.tileName}`}>{profile.name}</div>
                        <div className={`mono ${styles.tileMeta}`}>
                          {stripFlag(profile.country)} · {copy.profile}
                        </div>
                        <div className={`hand ${styles.tileMood}`}>"{copy.mood}"</div>
                        <div className={styles.tileTags}>
                          <Tag color="ink" style={TILE_TAG_STYLE}>POP {profile.startPop}M</Tag>
                          <Tag color="outline" style={TILE_TAG_STYLE}>⚙{profile.startFactories}</Tag>
                          <Tag color="outline" style={TILE_TAG_STYLE}>AP {profile.startAp}</Tag>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className={styles.castHint}>Pick 2–4 opponents. You're already at the table.</div>
          </Panel>

          <div className="col gap-4">
            <Panel title="The Humans" tilt={1}>
              {humans.map((h, idx) => (
                <div key={h.id} className={styles.humanCard}>
                  <Portrait leaderId={h.id} size={56} flag={extractFlag(h.country)} />
                  <div className={styles.humanFields}>
                    <input
                      type="text"
                      aria-label={`Name for P${idx + 1}`}
                      className={`display ${styles.nameInput}`}
                      value={h.name}
                      onChange={(e) => updateHuman(idx, 'name', e.target.value)}
                      placeholder="Name"
                    />
                    <input
                      type="text"
                      aria-label={`Country for P${idx + 1}`}
                      className={styles.countryInput}
                      value={h.country}
                      onChange={(e) => updateHuman(idx, 'country', e.target.value)}
                      placeholder="🌐 Country"
                    />
                  </div>
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
                className={`btn ${styles.addBtn}`}
                onClick={addHuman}
                disabled={humans.length >= 5}
              >
                + Add another human {humans.length >= 5 && '(max 5)'}
              </button>
              <div className={styles.humanHint}>
                Default: Rufus T. Firefly of Freedonia (<em>Duck Soup</em>, 1933). Change if
                you'd prefer to die under a different name.
              </div>
            </Panel>

            <Panel title="Difficulty" tilt={-1}>
              <div className={styles.diffList}>
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={difficulty === d.id}
                    className={`${styles.diffOption} ${difficulty === d.id ? styles.diffSelected : ''}`}
                    onClick={() => setDifficulty(d.id)}
                  >
                    <span className={styles.diffCheck} />
                    <span className={styles.diffText}>
                      <span className={`display ${styles.diffLabel}`}>{d.label}</span>
                      <span className={styles.diffSub}>{d.sub}</span>
                    </span>
                  </button>
                ))}
              </div>
              <label className={styles.seedBlock}>
                <span className={`display ${styles.seedLabel}`}>Optional Seed</span>
                <input
                  type="text"
                  className={`mono ${styles.seedInput}`}
                  value={seedInput}
                  placeholder="leave blank for chaos"
                  onChange={(e) => setSeedInput(e.target.value)}
                />
              </label>
            </Panel>

            <Panel>
              <div className={styles.beginRow}>
                <div>
                  <div className={`display ${styles.countLabel}`}>Opponents Picked</div>
                  <div
                    data-testid="opponent-count"
                    className={`display ${styles.countValue} ${selectedAi.length < 2 ? styles.countLow : ''}`}
                  >
                    {selectedAi.length}
                    <span className={styles.countMax}>/4</span>
                  </div>
                </div>
                <Btn variant="primary" size="lg" disabled={!canStart} onClick={start}>
                  Begin the End ↯
                </Btn>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
