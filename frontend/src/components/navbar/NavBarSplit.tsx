'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './NavBarSplit.module.css';

const NAV_TABS = [
  { label: 'Home Page', href: '/' },
  { label: 'Mind Map', href: '/mind-map' },
  { label: 'Background', href: '/background' },
  { label: 'Interactive Paper', href: '/paper' },
  { label: 'Relevant Papers', href: '/relevant-papers' },
];

interface NavBarSplitProps {
  profileSrc?: string;
  activeTab?: string;
  onTabClick?: (href: string) => void;
  onProfileClick?: () => void;
}

export default function NavBarSplit({
  profileSrc,
  activeTab,
  onTabClick,
  onProfileClick,
}: NavBarSplitProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  function handleNavClick(href: string) {
    if (onTabClick) {
      onTabClick(href);
    } else {
      window.location.href = href;
    }
    setIsMenuOpen(false);
  }

  return (
    <div className={styles.root} data-name="Nav Bar (Split)">
      <div className={styles.woodBar} data-name="wood 1">
        <img alt="" className={styles.woodImg} src="/background/wood.png" />
      </div>

      <div className={styles.logo} data-name="Logo">
        <p className={styles.logoText}>Relyze</p>
      </div>

      <div className={styles.menu}>
        <button
          className={styles.menuButton}
          type="button"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          Menu
        </button>
        {isMenuOpen && (
          <div className={styles.menuPanel}>
            {NAV_TABS.map((tab) => (
              <button
                key={tab.href}
                className={styles.menuItem}
                data-name={tab.label}
                type="button"
                onClick={() => handleNavClick(tab.href)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.tabs}>
        {NAV_TABS.map((tab) => (
          <button
            key={tab.href}
            className={styles.tab}
            data-name={tab.label}
            type="button"
            onClick={() => onTabClick?.(tab.href)}
          >
            <p
              className={styles.tabLabel}
              style={{ opacity: activeTab === tab.href ? 0.6 : 1 }}
            >
              {tab.label}
            </p>
          </button>
        ))}
      </div>

      <div className={styles.clip} data-name="clip 1">
        <Image alt="" fill src="/interface/clip.png" className={styles.imgDecorative} />
        <button
          className={styles.profileTab}
          data-name="Profile"
          onClick={onProfileClick}
        >
          <div className={styles.profileOverlay} />
          <div className={styles.profileImage}>
            {profileSrc ? (
              <Image alt="Profile" fill src={profileSrc} className={styles.imgCover} />
            ) : (
              <Image alt="Profile" fill src="/icons/profile.png" className={styles.profilePlaceholder} />
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
