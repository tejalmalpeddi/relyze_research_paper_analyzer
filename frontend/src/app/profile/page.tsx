'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import ProfileFolder, { Difficulty, ProfilePreference } from '@/components/profile/ProfileFolder';
import styles from './page.module.css';
import { AuthProvider, useAuth } from '../auth/auth-query';

const DESIGN_VIEWPORT_WIDTH = 1440;
const FOLDER_DESKTOP_LEFT = 421;
const FOLDER_SHIFT_RATE = 0.5;
const FOLDER_MIN_LEFT = -20;
const API_BASE_URL = 'http://localhost:8000';

interface HistoryTitle {
  title: string;
}

function WoodBackground() {
  return (
    <div className={styles.woodBg}>
      <Image alt="" className={styles.woodBgImg} fill priority sizes="100vw" src="/background/wood.png" />
    </div>
  );
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === 'Beginner' || value === 'Intermediate' || value === 'Advanced';
}

function getSavedPreferences(metadata: Record<string, unknown> | undefined): ProfilePreference[] {
  if (!Array.isArray(metadata?.preferences)) return [];

  return metadata.preferences
    .map((pref) => {
      if (!pref || typeof pref !== 'object') return null;

      const { title, difficulty } = pref as Record<string, unknown>;
      if (typeof title !== 'string') return null;

      return {
        title,
        difficulty: isDifficulty(difficulty) ? difficulty : 'Beginner',
      };
    })
    .filter((pref): pref is ProfilePreference => Boolean(pref));
}

function getProfilePreferences(metadata: Record<string, unknown> | undefined, titles: string[]): ProfilePreference[] {
  const savedPreferences = getSavedPreferences(metadata);
  if (!titles.length) return savedPreferences;

  return titles.map((title) => {
    const savedPreference = savedPreferences.find((pref) => pref.title === title);
    return {
      title,
      difficulty: savedPreference?.difficulty ?? 'Beginner',
    };
  });
}

function getProfileImage(metadata: Record<string, unknown> | undefined) {
  return typeof metadata?.avatar_url === 'string' ? metadata.avatar_url : undefined;
}

function ProfilePageContent() {
  const [folderLeft, setFolderLeft] = useState(421);
  const [paperTitles, setPaperTitles] = useState<string[]>([]);
  const { user, editUser, logout, deleteUser } = useAuth();
  const metadata = useMemo(() => user?.raw_user_meta_data ?? {}, [user?.raw_user_meta_data]);
  const preferences = useMemo(() => getProfilePreferences(metadata, paperTitles), [metadata, paperTitles]);

  useEffect(() => {
    function updateFolderLeft() {
      const widthBelowDesign = Math.max(0, DESIGN_VIEWPORT_WIDTH - window.innerWidth);
      setFolderLeft(Math.max(FOLDER_MIN_LEFT, FOLDER_DESKTOP_LEFT - widthBelowDesign * FOLDER_SHIFT_RATE));
    }

    updateFolderLeft();
    window.addEventListener('resize', updateFolderLeft);
    return () => window.removeEventListener('resize', updateFolderLeft);
  }, []);

  useEffect(() => {
    let isActive = true;

    if (!user) {
      return;
    }

    fetch(`${API_BASE_URL}/history/get_title`, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to load history titles');
        return response.json() as Promise<HistoryTitle[]>;
      })
      .then((history) => {
        if (!isActive) return;
        setPaperTitles(history.map((item) => item.title).filter(Boolean));
      })
      .catch(() => {
        if (!isActive) return;
        setPaperTitles([]);
      });

    return () => {
      isActive = false;
    };
  }, [user]);

  async function handleEmailSave(email: string) {
    if (!user || email === user.email) return;
    await editUser({ email });
  }

  async function handlePasswordSave(password: string) {
    if (!user) return;
    await editUser({ password });
  }

  async function handlePreferenceDifficultyChange(index: number, difficulty: Difficulty) {
    if (!user) return;

    const nextPreferences = preferences.map((pref, i) => (i === index ? { ...pref, difficulty } : pref));
    await editUser({
      raw_user_meta_data: {
        ...metadata,
        preferences: nextPreferences,
      },
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.stage}>
        <WoodBackground />
        <div className={styles.folderWrapper} style={{ left: folderLeft }}>
          <div className={styles.folderRotate}>
            <div className={styles.folderSize}>
              <ProfileFolder
                key={user?.id ?? 'guest'}
                email={user?.email ?? ''}
                profileSrc={getProfileImage(metadata)}
                preferences={user ? preferences : []}
                onDeleteAccount={async () => {
                  await deleteUser();
                }}
                onEmailSave={handleEmailSave}
                onPasswordSave={handlePasswordSave}
                onPreferenceDifficultyChange={handlePreferenceDifficultyChange}
                onSignOut={async () => {
                  await logout();
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthProvider>
      <ProfilePageContent />
    </AuthProvider>
  );
}
