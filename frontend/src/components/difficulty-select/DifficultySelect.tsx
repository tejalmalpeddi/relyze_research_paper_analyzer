'use client';

import styles from './DifficultySelect.module.css';

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

const DIFFICULTIES: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced'];

// Indicator and button inset positions within the 294x40px selector pill
const INDICATOR_INSETS: Record<Difficulty, string> = {
  Beginner: '4px calc(66.66% + 4px) 4px 4px',
  Intermediate: '4px calc(33.33% - 1px) 4px calc(33.33% - 1px)',
  Advanced: '4px 4px 4px calc(66.66% + 4px)',
};

const BUTTON_INSETS: Record<Difficulty, string> = {
  Beginner: '0 66.66% 0 0',
  Intermediate: '0 33.33% 0 33.33%',
  Advanced: '0 0 0 66.66%',
};

interface DifficultySelectProps {
  value: Difficulty;
  onChange: (difficulty: Difficulty) => void;
}

/**
 * Standalone 3-way difficulty toggle (Beginner / Intermediate / Advanced).
 * Renders at a fixed 294x40px size — position/place it from the parent
 * page via a wrapping element, so it stays reusable across pages.
 */
export default function DifficultySelect({ value, onChange }: DifficultySelectProps) {
  return (
    <div className={styles.pill} role="radiogroup" aria-label="Difficulty">
      <span className={styles.indicator} style={{ inset: INDICATOR_INSETS[value] }} />
      {DIFFICULTIES.map((difficulty) => (
        <button
          key={difficulty}
          type="button"
          role="radio"
          aria-checked={value === difficulty}
          className={styles.btn}
          style={{
            inset: BUTTON_INSETS[difficulty],
            color: value === difficulty ? '#0a0908' : '#d9d9d9',
          }}
          onClick={() => onChange(difficulty)}
        >
          {difficulty}
        </button>
      ))}
    </div>
  );
}
