'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import styles from './NavBar.module.css';

interface NavTab {
  label: string;
  href: string;
}

const NAV_TABS: NavTab[] = [
  { label: 'Home Page', href: '/' },
  { label: 'Mind Map', href: '/map' },
  { label: 'Background', href: '/background' },
  { label: 'Interactive Paper', href: '/paper' },
  { label: 'Relevant Papers', href: '/relevant-papers' },
];

const PROFILE_TAB: NavTab = { label: 'Profile', href: '/profile' };
const MENU_TABS = [...NAV_TABS, PROFILE_TAB];

// Pixel positions from design (assumes 1440px wide container) — used by the "full" horizontal layout.
// Anchored from the RIGHT edge so tabs track the screen edge as it shrinks.
const TAB_POSITIONS = [
  { right: 892, top: 76 },
  { right: 699, top: 76 },
  { right: 504, top: 75 },
  { right: 311, top: 75 },
  { right: 116, top: 75 },
];

const PROFILE_TAB_POSITION_TOP = 76;

// Fallback clip anchor for the (rare) case where the active route matches
// neither a NAV_TABS entry nor the profile tab.
const FALLBACK_CLIP_RIGHT = 16 + 46.5;

// Clip image intrinsic size (aspect ratio 145:185, scaled to a width of 87px)
const CLIP_WIDTH = 87;
const CLIP_HEIGHT = 111; // 87 * (185 / 145)

interface NavBarProps {
  profileSrc?: string;
  activeTab?: string;
  onTabClick?: (href: string) => void;
  onProfileClick?: () => void;
}

export default function NavBar({
  profileSrc,
  activeTab,
  onTabClick,
  onProfileClick,
}: NavBarProps) {
  const pathname = usePathname();
  const [isSplitMenuOpen, setIsSplitMenuOpen] = useState(false);

  const resolvedActiveTab = activeTab ?? pathname ?? '/';
  const isProfileActive = resolvedActiveTab === PROFILE_TAB.href;

  const activeTabIndex = useMemo(
    () => NAV_TABS.findIndex((tab) => tab.href === resolvedActiveTab),
    [resolvedActiveTab],
  );
  const activeTabItem = useMemo(
    () => MENU_TABS.find((tab) => tab.href === resolvedActiveTab) ?? NAV_TABS[0],
    [resolvedActiveTab],
  );
  const inactiveTabs = MENU_TABS.filter((tab) => tab.href !== resolvedActiveTab);

  function handleNavClick(href: string) {
    if (onTabClick) {
      onTabClick(href);
    } else {
      window.location.href = href;
    }
    setIsSplitMenuOpen(false);
  }

  function handleProfileClick() {
    if (onProfileClick) {
      onProfileClick();
    } else {
      handleNavClick(PROFILE_TAB.href);
    }
    setIsSplitMenuOpen(false);
  }

  const activeTabOffset = 16;
  const activeClipRight =
    activeTabIndex >= 0
      ? TAB_POSITIONS[activeTabIndex].right + 46.5
      : FALLBACK_CLIP_RIGHT;
  const fullClipStyle = isProfileActive
    ? {
        left: 'auto' as const,
        right: 'calc(2rem - 12px)',
        top: 0,
      }
    : {
        left: 'auto' as const,
        right: activeClipRight,
        top: 0,
      };

  return (
    <header className={styles.root} data-name="Nav Bar">
      <h1 className={styles.logo}>Relyze</h1>

      {/* ---------- Full (horizontal) variant — toggle via CSS with .full ---------- */}
      <nav className="full" data-name="Nav Bar (Full)">
        <ul className={styles.tabList}>
          {NAV_TABS.map((tab, i) => {
            const isActive = resolvedActiveTab === tab.href;
            return (
              <li key={tab.href} className={styles.tabListItem}>
                <button
                  className={styles.tab}
                  data-name={tab.label}
                  style={{
                    left: 'auto',
                    right: TAB_POSITIONS[i].right,
                    top: TAB_POSITIONS[i].top + (isActive ? activeTabOffset : 0),
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => handleNavClick(tab.href)}
                >
                  <span className={styles.tabLabel}>{tab.label}</span>
                </button>
              </li>
            );
          })}

          <li className={styles.tabListItem}>
            <button
              className={styles.profileTab}
              data-name="Profile"
              style={{
                position: 'fixed',
                left: 'auto',
                right: '2rem',
                top: PROFILE_TAB_POSITION_TOP + (isProfileActive ? activeTabOffset : 0),
              }}
              aria-current={isProfileActive ? 'page' : undefined}
              onClick={handleProfileClick}
            >
              {profileSrc ? (
                <Image
                  alt="Profile"
                  width={50}
                  height={50}
                  src={profileSrc}
                  className={`${styles.profileImage} ${styles.imgCover}`}
                />
              ) : (
                <Image
                  alt="Profile"
                  width={50}
                  height={50}
                  src="/icons/profile.png"
                  className={styles.profileImage}
                />
              )}
            </button>
          </li>
        </ul>

        <Image
          alt=""
          width={CLIP_WIDTH}
          height={CLIP_HEIGHT}
          src="/interface/clip.png"
          data-name="clip 1"
          className={`${styles.clip} ${styles.imgDecorative}`}
          style={fullClipStyle}
        />
      </nav>

      {/* ---------- Split (vertical) variant — toggle via CSS with .split ---------- */}
      <nav className="split" data-name="Nav Bar (Split)">
        <button
          className={styles.menuButton}
          type="button"
          aria-expanded={isSplitMenuOpen}
          aria-current={isProfileActive ? 'page' : undefined}
          onClick={() => setIsSplitMenuOpen((open) => !open)}
        >
          <Image
            alt=""
            width={CLIP_WIDTH}
            height={CLIP_HEIGHT}
            src="/interface/clip.png"
            data-name="clip 1"
            className={`${styles.clip} ${styles.imgDecorative}`}
          />
          <span className={styles.activeMenuLabel}>{activeTabItem.label}</span>
        </button>

        {isSplitMenuOpen && (
          <ul className={styles.menuPanel}>
            {inactiveTabs.map((tab) => (
              <li key={tab.href} className={styles.menuPanelItem}>
                <button
                  className={styles.menuItem}
                  data-name={tab.label}
                  type="button"
                  onClick={() => handleNavClick(tab.href)}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </header>
  );
}