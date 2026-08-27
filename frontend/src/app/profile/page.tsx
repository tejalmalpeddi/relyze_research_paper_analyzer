'use client';

import { useEffect, useMemo, useState } from 'react';
import ProfileFolder, { ProfilePreference } from '@/components/profile/ProfileFolder';
import Popup from '@/components/popups/popup';
import styles from './page.module.css';
import { useAuth } from '@/app/auth/auth-query';
import { useDocumentScrollLock } from '@/lib/useDocumentScrollLock';

const DESIGN_VIEWPORT_WIDTH = 1440;
const FOLDER_DESKTOP_LEFT = 421;
const FOLDER_SHIFT_RATE = 0.5;
const FOLDER_MIN_LEFT = -20;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface HistoryTitle {
  title: string;
}

// Which of the manually-triggered popups (if any) is currently open. The
// login popup isn't tracked here -- it's shown automatically whenever the
// user isn't authenticated, independent of anything the user clicked.
type ActivePopup = 'signOutConfirm' | 'deleteAccountConfirm' | 'confirmPassword' | null;

function getSavedPreferences(metadata: Record<string, unknown> | undefined): ProfilePreference[] {
  if (!Array.isArray(metadata?.preferences)) return [];

  return metadata.preferences
    .map((pref) => {
      if (!pref || typeof pref !== 'object') return null;

      const { title } = pref as Record<string, unknown>;
      if (typeof title !== 'string') return null;

      return {
        title,
      };
    })
    .filter((pref): pref is ProfilePreference => Boolean(pref));
}

function getProfilePreferences(metadata: Record<string, unknown> | undefined, titles: string[]): ProfilePreference[] {
  const savedPreferences = getSavedPreferences(metadata);
  if (!titles.length) return savedPreferences;

  return titles.map((title) => {
    return {
      title,
    };
  });
}

function getProfileImage(metadata: Record<string, unknown> | undefined) {
  return typeof metadata?.avatar_url === 'string' ? metadata.avatar_url : undefined;
}

function ProfilePageContent() {
  useDocumentScrollLock();

  const [folderLeft, setFolderLeft] = useState(421);
  const [paperTitles, setPaperTitles] = useState<string[]>([]);
  const { user, isLoading, isAuthenticated } = useAuth();
  const metadata = useMemo(() => user?.raw_user_meta_data ?? {}, [user?.raw_user_meta_data]);
  const preferences = useMemo(() => getProfilePreferences(metadata, paperTitles), [metadata, paperTitles]);

  // Which popup (if any) the user manually opened via a button.
  const [activePopup, setActivePopup] = useState<ActivePopup>(null);
  // Tracks whether the user dismissed the login popup themselves (clicking
  // outside it) -- without this, it would just reopen every re-render while
  // still unauthenticated.
  const [loginDismissed, setLoginDismissed] = useState(false);

  // Being logged out always takes priority: the login popup shows itself
  // (no button needed to open it) whenever there's no authenticated user
  // and it hasn't been dismissed, and it "should already be centered on
  // the page" because PopupShell renders its own fixed, full-screen,
  // centered backdrop -- no extra wrapper needed here.
  //
  // Requiring activePopup === null here is what fixes the delete-account
  // bug: without it, the instant deleteUser() succeeds, isAuthenticated
  // flips false, showLogin flips true, and the deleteAccountConfirm popup
  // gets yanked away (unmounted, losing its own "done" stage) in favor of
  // the login popup -- before the user ever sees "Account Deleted." Now
  // the login popup only auto-shows once no other popup is already open;
  // the delete-success screen's own "Log In to Another Account" button
  // calls onClose(), which clears activePopup and lets this take over
  // naturally on the next render.
  const showLogin = !isLoading && !isAuthenticated && !loginDismissed && activePopup === null;

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

  return (
    <main className={styles.page}>
      <div className={styles.folderWrapper} style={{ left: folderLeft }}>
        <div className={styles.folderRotate}>
          <ProfileFolder
            isOpen={isAuthenticated}
            email={isAuthenticated ? (user?.email || "Guest (Anonymous)") : ""}
            profileSrc={getProfileImage(metadata)}
            preferences={user ? preferences : []}
            onDeleteAccount={async () => {
              // Opens the confirm/delete popup instead of deleting
              // directly -- it collects and verifies the password
              // itself, then calls the real deleteUser().
              setActivePopup('deleteAccountConfirm');
            }}
            onPasswordEditClick={() => {
              // Opens Confirm Password, which (on success) leads to New
              // Password and saves the real new password itself via
              // useAuth's editUser(). ProfileFolder no longer collects
              // or displays the real password at all.
              setActivePopup('confirmPassword');
            }}
            onSignOut={async () => {
              setActivePopup('signOutConfirm');
            }}
          />
        </div>
      </div>

      {showLogin && <Popup type="login" onClose={() => setLoginDismissed(true)} />}

      {activePopup === 'signOutConfirm' && (
        <Popup type="signOutConfirm" onClose={() => setActivePopup(null)} />
      )}

      {activePopup === 'deleteAccountConfirm' && (
        <Popup type="deleteAccountConfirm" onClose={() => setActivePopup(null)} />
      )}

      {activePopup === 'confirmPassword' && (
        <Popup type="confirmPassword" onClose={() => setActivePopup(null)} />
      )}
    </main>
  );
}

export default function ProfilePage() {
  return (
      <ProfilePageContent />
  );
}
