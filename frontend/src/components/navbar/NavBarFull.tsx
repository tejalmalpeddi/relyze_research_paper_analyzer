'use client';

import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import styles from './NavBarFull.module.css';

interface NavTab {
  label: string;
  href: string;
}

const NAV_TABS: NavTab[] = [
  { label: 'Home Page', href: '/' },
  { label: 'Mind Map', href: '/mindmap' },
  { label: 'Background', href: '/background' },
  { label: 'Interactive Paper', href: '/paper' },
  { label: 'Relevant Papers', href: '/relevant-papers' },
];

// Pixel positions from design (assumes 1440px wide container)
const TAB_POSITIONS = [
  { left: 468, top: 76 },
  { left: 661, top: 76 },
  { left: 856, top: 75 },
  { left: 1049, top: 75 },
  { left: 1244, top: 75 },
];

const PROFILE_TAB_POSITION = {
  left: 1318,
  top: 76,
};

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
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const resolvedActiveTab = activeTab ?? pathname ?? '/';
  const isProfileActive = resolvedActiveTab === '/profile';
  const activeTabIndex = useMemo(
    () => NAV_TABS.findIndex((tab) => tab.href === resolvedActiveTab),
    [resolvedActiveTab],
  );

  function handleNavClick(href: string) {
    if (onTabClick) {
      onTabClick(href);
    } else {
      router.push(href);
    }
    setIsMenuOpen(false);
  }

  const activeTabOffset = 16;
  const activeClipLeft =
    activeTabIndex >= 0
      ? TAB_POSITIONS[activeTabIndex].left + 90 - 43.5
      : PROFILE_TAB_POSITION.left + 90 - 43.5;
  const clipStyle = isProfileActive
    ? {
        left: 'auto',
        right: 'calc(2rem - 12px)',
        top: 0,
      }
    : {
        left: activeClipLeft,
        right: 'auto',
        top: 0,
      };

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
          style={{
            left: TAB_POSITIONS[i].left,
            top: TAB_POSITIONS[i].top + (activeTabIndex === i ? activeTabOffset : 0),
          }}
          onClick={() => handleNavClick(tab.href)}
        >
          <p
            className={styles.tabLabel}
            style={{ opacity: resolvedActiveTab === tab.href ? 0.6 : 1 }}
          >
            {tab.label}
          </p>
        </button>
      ))}

      <div className={styles.menu}>
        <button
          className={styles.menuButton}
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span className={styles.menuBar} />
          <span className={styles.menuBar} />
          <span className={styles.menuBar} />
        </button>
        {isMenuOpen && (
          <div className={styles.menuPanel}>
            {NAV_TABS.map((tab) => (
              <button
                key={tab.href}
                className={styles.menuItem}
                type="button"
                onClick={() => handleNavClick(tab.href)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        className={styles.profileTab}
        data-name="Profile"
        style={{
          position: 'fixed',
          left: 'auto',
          right: '2rem',
          top: PROFILE_TAB_POSITION.top + (isProfileActive ? activeTabOffset : 0),
          transform: 'translate(0, 0)',
        }}
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

      <div
        className={styles.clip}
        data-name="clip 1"
        style={clipStyle}
      >
        <Image alt="" fill src="/interface/clip.png" className={styles.imgDecorative} />
      </div>

      <button
        type="button"
        onClick={() => handleNavClick('/')}
        style={{ all: 'unset', cursor: 'pointer' }}
        aria-label="Go to homepage"
      >
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
      </button>
    </div>
  );
}
