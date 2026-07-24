'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import styles from './ProfileFolder.module.css';
import { useAuth } from '../../app/auth/auth-query';

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

const FOLDER_BACK_PATH =
  'M50.7127 719.59L0.297643 719.444L0.13326 583.772C-0.155472 345.464 0.0533172 2.5216 0.487724 1.57243C0.858948 0.761302 3.0536 0.609629 19.3472 0.269046C50.7376 -0.387102 543.356 0.276576 548.06 0.981349C550.662 1.37127 552.905 2.0937 554.199 2.9588C557.314 5.04057 561.631 7.14567 566.063 8.74391C576.054 12.3463 577.271 15.8982 578.158 44.0207C579.04 72.0163 579.479 193.548 578.754 209.02C577.576 234.132 576.498 237.006 566.493 241.699C559.526 244.967 556.289 247.431 554.754 250.634L553.519 253.209L553.849 393.027C554.03 469.926 554.464 569.631 554.814 614.592C555.287 675.455 555.288 697.122 554.82 699.4C553.69 704.897 550.028 708.387 541.459 712.131C538.556 713.399 535.232 715.207 534.073 716.148C531.15 718.52 529.749 718.82 518.678 719.443C509.986 719.932 201.872 720.029 50.7127 719.59Z';

const FOLDER_FRONT_PATH =
  'M0.92884 0C76.101 0.378806 155.124 0.359509 231.146 0.414938L460.202 0.56122C473.299 5.53197 480.952 12.5094 487.949 29.1835L488.382 121.756C488.62 172.671 489.003 214.513 489.232 214.737C510.278 226.785 517.283 233.327 522.406 255.917L522.574 471.426C522.761 711.313 523.086 690.796 518.964 699.119C515.056 707.008 506.417 713.742 497.849 715.575C494.624 716.266 459.346 716.38 247.537 716.389L0.979437 716.399C3.4032 477.738 -2.08187 238.611 0.92884 0Z';

// Indicator and button inset positions within the 294×40px selector pill
const INDICATOR_INSETS: Record<Difficulty, { inset: string }> = {
  Beginner:     { inset: '4px calc(66.66% + 4px) 4px 4px' },
  Intermediate: { inset: '4px calc(33.33% - 1px) 4px calc(33.33% - 1px)' },
  Advanced:     { inset: '4px 4px 4px calc(66.66% + 4px)' },
};

const BUTTON_INSETS: Record<Difficulty, { inset: string }> = {
  Beginner:     { inset: '0 66.66% 0 0' },
  Intermediate: { inset: '0 33.33% 0 33.33%' },
  Advanced:     { inset: '0 0 0 66.66%' },
};

function DifficultySelect({
  value,
  onChange,
}: {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
}) {
  return (
    <div className={styles.difficultyOuter} data-name="Difficulty Select">
      <div className={styles.difficultyPill}>
        <div className={styles.difficultyBg} />
        <div className={styles.difficultyIndicator} style={INDICATOR_INSETS[value]} />
        {(Object.keys(INDICATOR_INSETS) as Difficulty[]).map((d) => (
          <button
            key={d}
            className={styles.difficultyBtn}
            style={{ ...BUTTON_INSETS[d], color: value === d ? '#0a0908' : '#d9d9d9' }}
            onClick={() => onChange(d)}
          >
            <p className={styles.difficultyBtnText}>{d}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

interface PreferenceTabProps {
  title: string;
  initialDifficulty?: Difficulty;
  isLast?: boolean;
}

function PreferenceTab({ title, initialDifficulty = 'Beginner', isLast = false }: PreferenceTabProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);

  return (
    <div
      className={`${styles.prefTab}${isLast ? '' : ` ${styles.prefTabMargin}`}`}
      data-name="preference tab"
    >
      <div className={styles.prefTabBg} />
      <p className={styles.prefTabTitle}>{title}</p>
      <DifficultySelect value={difficulty} onChange={setDifficulty} />
      <div className={styles.prefTabPaper} data-name="paper" />
    </div>
  );
}

interface ProfileFolderProps {
  email?: string;
  profileSrc?: string;
  preferences?: { title: string; difficulty?: Difficulty }[];
  onSignOut?: () => void;
  onDeleteAccount?: () => void;
}

export default function ProfileFolder({
  email = 'username@email.com',
  profileSrc,
  preferences = Array(5).fill({ title: 'Example Long Paper Title' }),
  onSignOut,
  onDeleteAccount,
}: ProfileFolderProps) {
  const [emailValue, setEmailValue] = useState(email);
  const [passwordValue, setPasswordValue] = useState('');
  const [isPasswordEditing, setIsPasswordEditing] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  function handlePasswordEditClick() {
    setIsPasswordEditing(true);
    window.requestAnimationFrame(() => passwordInputRef.current?.focus());
  }

  return (
    <div className={styles.root} data-name="folder">
      <div className={styles.folderBack} data-name="folder-back 1">
        <div className={styles.folderBg} />
        <div className={styles.folderBackShape} data-name="path1">
          <svg className={styles.folderShapeSvg} fill="none" preserveAspectRatio="none" viewBox="0 0 579.118 719.871">
            <path d={FOLDER_BACK_PATH} fill="#927E67" />
          </svg>
        </div>

        <div className={styles.profilePage} data-name="profile page">
          <div className={styles.paperSurface} />

          <div className={styles.deleteBtnBox} data-name="Red Button">
            <div className={styles.btnSvgWrap}>
              <svg className={styles.btnSvg} fill="none" preserveAspectRatio="none" viewBox="0 0 189 79">
                <g filter="url(#delete-btn-shadow)">
                  <path d="M4 0H185V71H4V0Z" fill="#C1666B" />
                </g>
                <defs>
                  <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="79" id="delete-btn-shadow" width="189" x="0" y="0">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                    <feOffset dy="4" />
                    <feGaussianBlur stdDeviation="2" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                    <feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow" />
                    <feBlend in="SourceGraphic" in2="effect1_dropShadow" mode="normal" result="shape" />
                  </filter>
                </defs>
              </svg>
            </div>
          </div>
          <button className={styles.deleteBtnLabel} onClick={onDeleteAccount}>
            Delete Account
          </button>

          <div className={styles.signOutBtnBox} data-name="Brown Button">
            <div className={styles.btnSvgWrap}>
              <svg className={styles.btnSvg} fill="none" preserveAspectRatio="none" viewBox="0 0 189 79">
                <g filter="url(#signout-btn-shadow)">
                  <path d="M4 0H185V71H4V0Z" fill="#5E503F" />
                </g>
                <defs>
                  <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="79" id="signout-btn-shadow" width="189" x="0" y="0">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                    <feOffset dy="4" />
                    <feGaussianBlur stdDeviation="2" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                    <feBlend in2="BackgroundImageFix" mode="normal" result="effect1_dropShadow" />
                    <feBlend in="SourceGraphic" in2="effect1_dropShadow" mode="normal" result="shape" />
                  </filter>
                </defs>
              </svg>
            </div>
          </div>
          <button className={styles.signOutBtnLabel} onClick={onSignOut}>
            Sign Out
          </button>

          <div className={styles.prefsHeader} />
          <p className={styles.prefsHeaderLabel}>Preferences</p>
          <div className={styles.scrollFrame} data-name="scroll frame">
            <div className={styles.scrollContent}>
              {preferences.map((pref, i) => (
                <PreferenceTab
                  key={i}
                  title={pref.title}
                  initialDifficulty={pref.difficulty}
                  isLast={i === preferences.length - 1}
                />
              ))}
            </div>
            <div aria-hidden className={styles.scrollBorder} />
          </div>

          <div className={styles.accountHeader} />
          <p className={styles.accountHeaderLabel}>Account</p>
          <div className={styles.emailBox} />
          <p className={styles.emailLabel}>Email</p>
          <input
            aria-label="Email"
            className={styles.emailValue}
            type="email"
            value={emailValue}
            onChange={(event) => setEmailValue(event.target.value)}
          />
          <div className={styles.passwordBox} />
          <p className={styles.passwordLabel}>Password</p>
          <input
            aria-label="Password"
            className={styles.passwordValue}
            ref={passwordInputRef}
            type={isPasswordVisible ? 'text' : 'password'}
            value={passwordValue}
            readOnly={!isPasswordEditing}
            onClick={handlePasswordEditClick}
            onChange={(event) => setPasswordValue(event.target.value)}
          />
          <button
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
            className={styles.eyeIcon}
            type="button"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
          >
            <svg className={styles.eyeIconSvg} fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M2.5 12C4.7 7.8 8 5.7 12 5.7S19.3 7.8 21.5 12C19.3 16.2 16 18.3 12 18.3S4.7 16.2 2.5 12Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              {isPasswordVisible ? (
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
              ) : (
                <path d="M4 4L20 20" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              )}
            </svg>
          </button>
          <button
            aria-label="Edit password"
            aria-pressed={isPasswordEditing}
            className={styles.editIcon}
            type="button"
            onClick={handlePasswordEditClick}
            data-name="edit"
          >
            <img alt="" className={styles.editIconImg} src="/icons/pencil.svg" />
          </button>

          <div className={styles.profileCardOuter} data-name="Profile">
            <div className={styles.profileCardRotate}>
              <div className={styles.profileCardBg} />
              <div className={styles.profileCardOverlay} />
              <div className={styles.profileCardImage}>
                {profileSrc ? (
                  <Image alt="Profile picture" fill src={profileSrc} className={styles.imgCover} />
                ) : (
                  <Image alt="Profile picture" fill src="/icons/profile.png" className={styles.profileCardPlaceholder} />
                )}
              </div>
            </div>
          </div>

          <div className={styles.paperclipOuter}>
            <div className={styles.paperclipRotate}>
              <Image alt="" fill src="/interface/paperclip.png" className={styles.imgDecorative} />
            </div>
          </div>

          <div className={styles.editProfileOuter}>
            <div className={styles.editProfileRotate}>
              <img alt="Edit profile picture" className={styles.editIconImg} src="/icons/pencil.svg" />
            </div>
          </div>
        </div>

        <div className={styles.spineOuter}>
          <div className={styles.spineRotate}>
            <p className={styles.spineText}>Account Settings</p>
          </div>
        </div>
      </div>

      <div className={styles.folderFront}>
        <div className={styles.folderFrontInner} data-name="folder-front 1">
          <div className={styles.folderFrontShape}>
            <svg className={styles.folderShapeSvg} fill="none" preserveAspectRatio="none" viewBox="0 0 522.669 716.399">
              <path d={FOLDER_FRONT_PATH} fill="#C4AB8E" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
