'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './page.module.css';

const paragraphs = [
  'Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas.',
  'Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.',
  'Pulvinar vivamus fringilla lacus nec metus bibendum egestas. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor.',
  'Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. Iaculis massa nisl malesuada lacinia integer nunc posuere.',
];

const difficulties = ['Beginner', 'Intermediate', 'Advanced'] as const;

function PaperPage({ pageNumber }: { pageNumber: number }) {
  return (
    <article className={styles.paperPage} aria-label={`Sample page ${pageNumber}`}>
      <div className={styles.paperText}>
        <h2>Paper Overview</h2>
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
      <span className={styles.pageNumber}>{pageNumber}</span>
    </article>
  );
}

function PaperScrollContainer() {
  return (
    <section className={styles.paperPanel} aria-label="Paper preview">
      <Tools />
      <div className={styles.paperScroll}>
        {[1, 2, 3].map((pageNumber) => (
          <PaperPage key={pageNumber} pageNumber={pageNumber} />
        ))}
      </div>
    </section>
  );
}

function ToolIcon({ type }: { type: 'highlighter' | 'pencil' | 'eraser' }) {
  if (type === 'highlighter') {
    return (
      <svg className={styles.toolIcon} viewBox="0 0 112 72" aria-hidden="true">
        <path d="M66 27H88L98 55H66Z" fill="#C1666B" />
        <path d="M-98 -34C-52 -8 -2 13 42 21V61C-2 69 -52 90 -98 116Z" fill="#535353" />
        <path d="M42 21H48V61H42Z" fill="#535353" />
        <path d="M63 27H67V55H63Z" fill="#535353" />
        <rect x="42" y="21" width="24" height="40" rx="4" fill="#0A0909" />
      </svg>
    );
  }

  if (type === 'pencil') {
    return (
      <svg className={styles.toolIcon} viewBox="0 0 112 56" aria-hidden="true">
        <path d="M-20 0L54 16V40L-20 56Z" fill="#EAE0D5" />
        <path d="M54 16L112 28L54 40Z" fill="#C1666B" />
      </svg>
    );
  }

  return (
    <svg className={styles.toolIcon} viewBox="0 0 93 138" aria-hidden="true">
      <rect x="0" y="0" width="93" height="138" fill="#D9D9D9" />
      <rect x="0" y="0" width="42" height="138" fill="#22333B" />
    </svg>
  );
}

function Tools() {
  return (
    <aside className={styles.tools} aria-label="Paper annotation tools">
      <button className={`${styles.toolButton} ${styles.highlighterButton}`} type="button" aria-label="Highlight">
        <ToolIcon type="highlighter" />
      </button>
      <button className={`${styles.toolButton} ${styles.pencilButton}`} type="button" aria-label="Draw">
        <ToolIcon type="pencil" />
      </button>
      <button className={styles.eraserButton} type="button" aria-label="Erase">
        <ToolIcon type="eraser" />
      </button>
    </aside>
  );
}

function DifficultySelect() {
  const [difficulty, setDifficulty] = useState<(typeof difficulties)[number]>('Beginner');

  return (
    <div className={styles.difficultySelect} aria-label="Difficulty preference">
      <span className={styles.difficultyTrack} />
      <span className={styles.difficultyIndicator} data-difficulty={difficulty} />
      {difficulties.map((level) => (
        <button
          key={level}
          className={styles.difficultyButton}
          type="button"
          data-active={difficulty === level}
          onClick={() => setDifficulty(level)}
        >
          {level}
        </button>
      ))}
    </div>
  );
}

function InsightPanel() {
  return (
    <aside className={styles.insightPanel} aria-label="Paper assistant">
      <div className={styles.userMessage}>This is a chat message from the user.</div>
      <div className={styles.answerCard}>
        Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem
        placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar
        vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere.
        Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.
      </div>
      <DifficultySelect />
    </aside>
  );
}

export default function PaperViewPage() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <PaperScrollContainer />
        <section className={styles.corkPanel} aria-label="Interactive paper workspace">
          <Image alt="" className={styles.corkboardImage} src="/background/corkboard.jpg" fill sizes="50vw" priority />
          <InsightPanel />
        </section>
      </div>
    </main>
  );
}
