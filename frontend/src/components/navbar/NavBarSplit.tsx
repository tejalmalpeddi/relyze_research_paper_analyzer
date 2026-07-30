'use client';

import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import styles from './NavBarSplit.module.css';

const NAV_TABS = [
  { label: 'Home Page', href: '/' },
  { label: 'Mind Map', href: '/mindmap' },
  { label: 'Background', href: '/background' },
  { label: 'Interactive Paper', href: '/paper' },
  { label: 'Relevant Papers', href: '/relevant-papers' },
];

const PROFILE_TAB = { label: 'Profile', href: '/profile' };
const MENU_TABS = [...NAV_TABS, PROFILE_TAB];

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
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const resolvedActiveTab = activeTab ?? pathname ?? '/';
  const activeTabItem = useMemo(
    () => MENU_TABS.find((tab) => tab.href === resolvedActiveTab) ?? NAV_TABS[0],
    [resolvedActiveTab],
  );
  const isProfileActive = resolvedActiveTab === PROFILE_TAB.href;
  const inactiveTabs = MENU_TABS.filter((tab) => tab.href !== resolvedActiveTab);

  function handleNavClick(href: string) {
    if (onTabClick) {
      onTabClick(href);
    } else {
      router.push(href);
    }
    setIsMenuOpen(false);
  }

  return (
    <div className={styles.root} data-name="Nav Bar (Split)">
      <div className={styles.woodBar} data-name="wood 1">
        <img alt="" className={styles.woodImg} src="/background/wood.png" />
      </div>

      <button
        type="button"
        onClick={() => handleNavClick('/')}
        style={{ all: 'unset', cursor: 'pointer' }}
        aria-label="Go to homepage"
      >
        <div className={styles.logo} data-name="Logo">
          <p className={styles.logoText}>Relyze</p>
        </div>
      </button>

      <div className={styles.menu}>
        {isProfileActive ? (
          <button
            className={styles.profileMenuButton}
            type="button"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <div className={styles.clip} data-name="clip 1">
              <Image alt="" fill src="/interface/clip.png" className={styles.imgDecorative} />
            </div>
            <span className={styles.profileMenuLabel}>{activeTabItem.label}</span>
            <div className={styles.profileMenuImage}>
              {profileSrc ? (
                <Image alt="Profile" fill src={profileSrc} className={styles.imgCover} />
              ) : (
                <Image alt="Profile" fill src="/icons/profile.png" className={styles.profilePlaceholder} />
              )}
            </div>
          </button>
        ) : (
          <button
            className={styles.menuButton}
            type="button"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <div className={styles.clip} data-name="clip 1">
              <Image alt="" fill src="/interface/clip.png" className={styles.imgDecorative} />
            </div>
            <span className={styles.activeMenuLabel}>{activeTabItem.label}</span>
          </button>
        )}

        {isMenuOpen && (
          <div className={styles.menuPanel}>
            {inactiveTabs.map((tab) => (
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
    </div>
  );
}
