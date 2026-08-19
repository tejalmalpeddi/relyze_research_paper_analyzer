'use client';

import { useId } from 'react';
import Image from 'next/image';
import styles from './ProfileFolder.module.css';

export interface ProfilePreference {
  title: string;
}

const FOLDER_BACK_PATH =
  'M50.7127 719.59L0.297643 719.444L0.13326 583.772C-0.155472 345.464 0.0533172 2.5216 0.487724 1.57243C0.858948 0.761302 3.0536 0.609629 19.3472 0.269046C50.7376 -0.387102 543.356 0.276576 548.06 0.981349C550.662 1.37127 552.905 2.0937 554.199 2.9588C557.314 5.04057 561.631 7.14567 566.063 8.74391C576.054 12.3463 577.271 15.8982 578.158 44.0207C579.04 72.0163 579.479 193.548 578.754 209.02C577.576 234.132 576.498 237.006 566.493 241.699C559.526 244.967 556.289 247.431 554.754 250.634L553.519 253.209L553.849 393.027C554.03 469.926 554.464 569.631 554.814 614.592C555.287 675.455 555.288 697.122 554.82 699.4C553.69 704.897 550.028 708.387 541.459 712.131C538.556 713.399 535.232 715.207 534.073 716.148C531.15 718.52 529.749 718.82 518.678 719.443C509.986 719.932 201.872 720.029 50.7127 719.59Z';

const FOLDER_FRONT_PATH =
  'M0.92884 0C76.101 0.378806 155.124 0.359509 231.146 0.414938L460.202 0.56122C473.299 5.53197 480.952 12.5094 487.949 29.1835L488.382 121.756C488.62 172.671 489.003 214.513 489.232 214.737C510.278 226.785 517.283 233.327 522.406 255.917L522.574 471.426C522.761 711.313 523.086 690.796 518.964 699.119C515.056 707.008 506.417 713.742 497.849 715.575C494.624 716.266 459.346 716.38 247.537 716.389L0.979437 716.399C3.4032 477.738 -2.08187 238.611 0.92884 0Z';

// Never the real password -- always exactly 8 literal asterisks, regardless
// of the actual password's length. This field is display-only; the real
// value is never sent to or rendered by this component at all.
const MASKED_PASSWORD = '********';

interface PreferenceTabProps {
  title: string;
}

function PreferenceTab({ title }: PreferenceTabProps) {
  return (
    <li className={styles.prefTab} data-name="preference tab">
      <span aria-hidden className={styles.prefTabPaper} data-name="paper" />
      <p>{title}</p>
    </li>
  );
}

interface ProfileFolderProps {
  isOpen?: boolean;
  email?: string;
  profileSrc?: string;
  preferences?: ProfilePreference[];
  onPasswordEditClick?: () => void;
  onSignOut?: () => void | Promise<void>;
  onDeleteAccount?: () => void | Promise<void>;
}

export default function ProfileFolder({
  isOpen = true,
  email = '',
  profileSrc,
  preferences = [],
  onPasswordEditClick,
  onSignOut,
  onDeleteAccount,
}: ProfileFolderProps) {
  const emailFieldId = useId();

  return (
    <section className={styles.root} data-open={isOpen} aria-label="Account settings" data-name="folder">
      <div className={styles.folderBack} data-name="folder-back 1">
        <div className={styles.folderBackShape} data-name="path1">
          <svg className={styles.folderShapeSvg} fill="none" preserveAspectRatio="none" viewBox="0 0 579.118 719.871">
            <path d={FOLDER_BACK_PATH} fill="currentColor" />
          </svg>
        </div>

        <div className={styles.profilePage} data-name="profile page">
          <div className={styles.paperSurface} />

          <button type="button" className={styles.deleteBtn} onClick={onDeleteAccount}>
            Delete Account
          </button>

          <button type="button" className={styles.signOutBtn} onClick={onSignOut}>
            Sign Out
          </button>

          <section aria-labelledby={`${emailFieldId}-prefs-heading`}>
            <h3 id={`${emailFieldId}-prefs-heading`} className={styles.prefsHeaderLabel}>
              Papers
            </h3>
            <div className={styles.scrollFrame} data-name="scroll frame">
              <ul className={styles.scrollContent}>
                {preferences.map((pref, i) => (
                  <PreferenceTab
                    key={i}
                    title={pref.title}
                  />
                ))}
              </ul>
            </div>
          </section>

          <section aria-labelledby={`${emailFieldId}-account-heading`}>
            <h3 id={`${emailFieldId}-account-heading`} className={styles.accountHeaderLabel}>
              Account
            </h3>

            <span className={styles.emailBox} />
            <h4 className={styles.emailLabel}>Email</h4>
            <p className={styles.emailValue}>
              {email}
            </p>

            <span className={styles.passwordBox} />
            <h4 className={styles.passwordLabel}>Password</h4>
            {/* Display-only -- always exactly 8 asterisks, never the real
                password, never editable inline. Editing happens entirely
                through the Confirm Password / New Password popups,
                triggered by the pencil icon below. */}
            <p aria-label="Password (hidden)" className={styles.passwordValue}>
              {MASKED_PASSWORD}
            </p>
            <button
              aria-label="Edit password"
              className={styles.editIcon}
              type="button"
              onClick={onPasswordEditClick}
              data-name="edit"
            >
              <Image alt="" className={styles.editIconImg} fill sizes="20px" src="/icons/pencil.svg" />
            </button>
          </section>

          <div className={styles.profileCardOuter} data-name="Profile">
            <div className={styles.profileCardRotate}>
              <div className={styles.profileCardOverlay} />
              <div className={styles.profileCardImage}>
                {profileSrc ? (
                  <Image alt="Profile picture" fill src={profileSrc} className={styles.imgCover} />
                ) : (
                  <Image alt="Profile picture" fill src="/icons/profile-placeholder.svg" className={styles.profileCardPlaceholder} />
                )}
              </div>
            </div>
          </div>

          <div className={styles.paperclipOuter}>
            <div className={styles.paperclipRotate}>
              <Image alt="" width="55" height="115" src="/interface/paperclip.png" className={styles.imgDecorative} />
            </div>
          </div>
        </div>

        <div className={styles.spineOuter}>
          <div className={styles.spineRotate}>
            <h2 className={styles.spineText}>Account Settings</h2>
          </div>
        </div>
      </div>

      <div className={styles.folderFront}>
        <div className={styles.folderFrontInner} data-name="folder-front 1">
          <div className={styles.folderFrontShape}>
            <svg className={styles.folderShapeSvg} fill="none" preserveAspectRatio="none" viewBox="0 0 522.669 716.399">
              <path d={FOLDER_FRONT_PATH} fill="currentColor" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
