'use client';

import Image from 'next/image';
import styles from './NavBarSplit.module.css';

const NAV_TABS = [
  { label: 'Home Page', href: '/' },
  { label: 'Mind Map', href: '/mind-map' },
  { label: 'Background', href: '/background' },
  { label: 'Interactive Paper', href: '/paper' },
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
  return (
    <div className={styles.root} data-name="Nav Bar (Split)">
      <div className={styles.woodBar} data-name="wood 1">
        <img alt="" className={styles.woodImg} src="/background/wood.png" />
      </div>

      <div className={styles.logo} data-name="Logo">
        <p className={styles.logoText}>Relyze</p>
      </div>

      <div className={styles.tabs}>
        {NAV_TABS.map((tab) => (
          <button
            key={tab.href}
            className={styles.tab}
            data-name={tab.label}
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
            <div className={styles.profilePlaceholder} />
          )}
        </div>
      </button>

      <div className={styles.clip} data-name="clip 1">
        <Image alt="" fill src="/interface/clip.png" className={styles.imgDecorative} />
      </div>
    </div>
  );
}
