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
const sendIconPath =
  'M10.9203 21.9688C10.6845 21.8957 10.3661 21.6493 10.2389 21.4416C10.1711 21.3309 10.0977 21.1259 10.0741 20.9811C10.037 20.7538 10.0093 17.7594 10.0442 17.7594C10.0676 17.7594 14.6287 19.3366 14.641 19.3489C14.6719 19.38 11.9289 21.7855 11.7603 21.8752C11.5438 21.9904 11.1363 22.0358 10.9203 21.9688ZM19.3579 19.9648C19.2142 19.9279 11.2846 17.191 11.2653 17.1716C11.2512 17.1574 17.7562 9.05109 19.1497 7.34636C19.3056 7.15561 19.4064 7.01619 19.3736 7.03653C19.3409 7.05688 17.0585 9.19166 14.3017 11.7805C11.5449 14.3693 9.27868 16.4874 9.2657 16.4874C9.25272 16.4874 7.9827 16.0537 6.44344 15.5235C3.29381 14.4387 3.35022 14.465 3.10794 13.9654C2.89365 13.5235 3.0063 12.961 3.37597 12.627C3.48187 12.5313 6.80892 10.7521 12.1489 7.93539C16.8801 5.43976 20.9249 3.30836 21.1373 3.19894C21.4813 3.02168 21.5551 3 21.8141 3C22.4809 3 23 3.50474 23 4.15319C23 4.26272 22.4981 7.67979 21.8848 11.7467C21.0387 17.3562 20.7483 19.1852 20.6818 19.3239C20.4557 19.7948 19.8457 20.0901 19.3579 19.9648Z';

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
    </aside>
  );
}

function BottomChatBar() {
  const [chatMessage, setChatMessage] = useState('');
  const [isSendActive, setIsSendActive] = useState(false);

  function sendMessage() {
    if (chatMessage.trim()) {
      setChatMessage('');
    }
  }

  return (
    <section className={styles.bottomChatBar} aria-label="Paper assistant controls">
      <Image alt="" className={styles.bottomWoodImage} src="/background/wood.png" fill sizes="50vw" />
      <div className={styles.bottomControls}>
        <label className={styles.chatInputWrap}>
          <span className={styles.srOnly}>Ask about this paper</span>
          <input
            className={styles.chatInput}
            type="text"
            value={chatMessage}
            onChange={(event) => setChatMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                sendMessage();
              }
            }}
          />
        </label>
        <div className={styles.bottomActionRow}>
          <DifficultySelect />
          <button
            className={styles.sendButton}
            type="button"
            aria-label="Send message"
            data-active={isSendActive}
            onClick={sendMessage}
            onMouseEnter={() => setIsSendActive(true)}
            onMouseLeave={() => setIsSendActive(false)}
            onMouseDown={() => setIsSendActive(true)}
            onMouseUp={() => setIsSendActive(false)}
          >
            <svg className={styles.sendIcon} fill="none" height="25" viewBox="0 0 26 25" width="26" aria-hidden="true">
              <path d={sendIconPath} />
            </svg>
          </button>
        </div>
      </div>
    </section>
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
          <BottomChatBar />
        </section>
      </div>
    </main>
  );
}
