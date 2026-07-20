'use client';

import Image from 'next/image';
import styles from './NavBarFull.module.css';

interface NavTab {
  label: string;
  href: string;
}

const NAV_TABS: NavTab[] = [
  { label: 'Home Page', href: '/' },
  { label: 'Mind Map', href: '/mind-map' },
  { label: 'Background', href: '/background' },
  { label: 'Interactive Paper', href: '/paper' },
  { label: 'Relevant Papers', href: '/relevant-papers' },
];

// Pixel positions from design (assumes 1440px wide container)
const TAB_POSITIONS = [
  { left: 345, top: 76 },
  { left: 538, top: 76 },
  { left: 733, top: 75 },
  { left: 926, top: 75 },
  { left: 1121, top: 75 },
];

interface NavBarFullProps {
  profileSrc?: string;
  activeTab?: string;
  onTabClick?: (href: string) => void;
  onProfileClick?: () => void;
}

export default function NavBarFull({
  profileSrc,
  activeTab,
  onTabClick,
  onProfileClick,
}: NavBarFullProps) {
  return (
    <div className={styles.root} data-name="Nav Bar (Full)">
      <div className={styles.woodBar} data-name="wood 1">
        <img alt="" className={styles.woodImg} src="/background/wood.png" />
      </div>

      {NAV_TABS.map((tab, i) => (
        <button
          key={tab.href}
          className={styles.tab}
          data-name={tab.label}
          style={{ left: TAB_POSITIONS[i].left, top: TAB_POSITIONS[i].top }}
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

      <div className={styles.logoOuter} data-name="Logo">
        <div className={styles.logoCard}>
          <div className={styles.logoCardBg} />
        </div>
      </div>
      <div className={styles.logoTextOuter}>
        <div className={styles.logoTextInner}>
          <p className={styles.logoText}>Relyze</p>
        </div>
      </div>
    </div>
  );
}
