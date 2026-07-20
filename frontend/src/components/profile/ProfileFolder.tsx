'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './ProfileFolder.module.css';

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

// Indicator and button inset positions within the 294×40px selector pill
const INDICATOR_INSETS: Record<Difficulty, { inset: string }> = {
  Beginner:     { inset: '11.54% 75.2% 11.54% 2.61%' },
  Intermediate: { inset: '11.54% 37.45% 11.54% 35.65%' },
  Advanced:     { inset: '11.54% 3.63% 11.54% 75.46%' },
};

const BUTTON_INSETS: Record<Difficulty, { inset: string }> = {
  Beginner:     { inset: '23.08% 76.35% 13.46% 4.18%' },
  Intermediate: { inset: '23.08% 37.45% 13.46% 35.65%' },
  Advanced:     { inset: '23.08% 3.63% 30.92% 75.46%' },
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
  return (
    <div className={styles.root} data-name="folder">
      <div className={styles.folderBack} data-name="folder-back 1">
        <div className={styles.folderBg} />
        <div className={styles.folderBackShape} data-name="path1">
          <img alt="" className={styles.folderImgFill} src="/interface/folder-back.svg" />
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
          <p className={styles.emailValue}>{email}</p>
          <div className={styles.passwordBox} />
          <p className={styles.passwordLabel}>Password</p>
          <p className={styles.passwordValue}>************</p>
          <div className={styles.editIcon} data-name="edit">
            <img alt="Edit password" className={styles.editIconImg} src="/icons/pencil.svg" />
          </div>

          <div className={styles.profileCardOuter} data-name="Profile">
            <div className={styles.profileCardRotate}>
              <div className={styles.profileCardBg} />
              <div className={styles.profileCardOverlay} />
              <div className={styles.profileCardImage}>
                {profileSrc ? (
                  <Image alt="Profile picture" fill src={profileSrc} className={styles.imgCover} />
                ) : (
                  <div className={styles.profileCardPlaceholder} />
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
            <img alt="" className={styles.folderImgFill} src="/interface/folder-front.svg" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Indicator and button inset positions within the 294×40px selector pill
const DIFFICULTY_CONFIG: Record<Difficulty, { indicator: string; button: string }> = {
  Beginner: {
    indicator: 'inset-[11.54%_75.2%_11.54%_2.61%]',
    button: 'inset-[23.08%_76.35%_13.46%_4.18%]',
  },
  Intermediate: {
    indicator: 'inset-[11.54%_37.45%_11.54%_35.65%]',
    button: 'inset-[23.08%_37.45%_13.46%_35.65%]',
  },
  Advanced: {
    indicator: 'inset-[11.54%_3.63%_11.54%_75.46%]',
    button: 'inset-[23.08%_3.63%_30.92%_75.46%]',
  },
};

function DifficultySelect({
  value,
  onChange,
}: {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
}) {
  return (
    <div className="absolute inset-[55.37%_2.91%_11.57%_25.91%]" data-name="Difficulty Select">
      <div className="absolute h-[40px] left-0 top-0 w-[294px]">
        <div className="absolute bg-[#5e503f] inset-0 rounded-[10px]" />
        <div
          className={`absolute bg-[#c6ac8f] rounded-[11px] transition-all duration-200 ${DIFFICULTY_CONFIG[value].indicator}`}
        />
        {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((d) => (
          <button
            key={d}
            className={`[word-break:break-word] absolute block cursor-pointer font-['EB_Garamond:Regular',sans-serif] font-normal leading-[0] text-[16px] text-center ${DIFFICULTY_CONFIG[d].button}`}
            style={{ color: value === d ? '#0a0908' : '#d9d9d9' }}
            onClick={() => onChange(d)}
          >
            <p className="leading-[normal]">{d}</p>
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
      className={`relative shrink-0 h-[121px] w-[413px]${isLast ? '' : ' mb-[-1px]'}`}
      data-name="preference tab"
    >
      <div className="absolute bg-[#d9d9d9] border border-[#5e503f] border-solid inset-0" />
      <p className="[word-break:break-word] absolute font-['EB_Garamond:Regular',sans-serif] font-normal inset-[21.49%_4.84%_61.16%_26.63%] leading-[normal] text-[16px] text-black">
        {title}
      </p>
      <DifficultySelect value={difficulty} onChange={setDifficulty} />
      <div className="absolute bg-white inset-[12.4%_77.97%_11.57%_3.63%]" data-name="paper" />
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
  return (
    <div className="relative size-full" data-name="folder">
      <div
        className="absolute drop-shadow-[0px_4px_5px_rgba(0,0,0,0.5)] inset-0 overflow-clip"
        data-name="folder-back 1"
      >
        <div className="absolute bg-[#927e67] inset-0" />
        <div className="absolute inset-[1.51%_0.77%_2.27%_1.91%]" data-name="path1">
          <img
            alt=""
            className="absolute inset-0 size-full object-fill"
            src="/interface/folder-back.svg"
          />
        </div>

        <div className="absolute inset-[4.93%_13.62%_18.88%_7.9%]" data-name="profile page">
          <div className="absolute bg-[#d9d9d9] inset-[5.26%_0_-0.7%_6.64%] shadow-[0px_4px_10px_0px_rgba(0,0,0,0.5)]" />

          <div
            className="absolute bg-[#c1666b] inset-[93.68%_5.14%_-6.14%_56.1%]"
            data-name="Red Button"
          >
            <div className="absolute inset-[0_-2.21%_-11.27%_-2.21%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 189 79">
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
          <button
            className="[word-break:break-word] absolute font-['EB_Garamond:Regular',sans-serif] font-normal inset-[98.07%_14.13%_-1.75%_65.1%] leading-[normal] text-[16px] text-center text-white whitespace-nowrap"
            onClick={onDeleteAccount}
          >
            Delete Account
          </button>

          <div
            className="absolute bg-[#5e503f] inset-[93.68%_49.68%_-6.14%_11.56%]"
            data-name="Brown Button"
          >
            <div className="absolute inset-[0_-2.21%_-11.27%_-2.21%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 189 79">
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
          <button
            className="[word-break:break-word] absolute font-['EB_Garamond:Regular',sans-serif] font-normal inset-[98.07%_62.96%_-1.75%_25.05%] leading-[normal] text-[16px] text-center text-white whitespace-nowrap"
            onClick={onSignOut}
          >
            Sign Out
          </button>

          <div className="absolute bg-[#5e503f] h-[22px] left-[43px] top-[194px] w-[413px]" />
          <p className="[word-break:break-word] absolute font-['EB_Garamond:Regular',sans-serif] font-normal leading-[normal] left-[56.32px] text-[#d9d9d9] text-[12px] top-[197px] w-[59.211px]">
            Preferences
          </p>
          <div className="absolute h-[299px] left-[43px] top-[216px]" data-name="scroll frame">
            <div className="content-stretch flex flex-col items-start overflow-x-clip overflow-y-auto relative rounded-[inherit] size-full">
              {preferences.map((pref, i) => (
                <PreferenceTab
                  key={i}
                  title={pref.title}
                  initialDifficulty={pref.difficulty}
                  isLast={i === preferences.length - 1}
                />
              ))}
            </div>
            <div
              aria-hidden
              className="absolute border border-[#5e503f] border-solid inset-0 pointer-events-none"
            />
          </div>

          <div className="absolute bg-[#5e503f] h-[22px] left-[177px] top-[44px] w-[279px]" />
          <p className="[word-break:break-word] absolute font-['EB_Garamond:Regular',sans-serif] font-normal leading-[normal] left-[186px] text-[#d9d9d9] text-[12px] top-[47px] whitespace-nowrap">
            Account
          </p>
          <div className="absolute bg-[#d9d9d9] border border-[#5e503f] border-solid inset-[11.58%_2.36%_78.25%_37.9%]" />
          <p className="[word-break:break-word] absolute font-['EB_Garamond:Regular',sans-serif] font-normal inset-[12.81%_44.75%_84.39%_39.83%] leading-[normal] text-[#5e503f] text-[12px]">
            Email
          </p>
          <p className="[word-break:break-word] absolute font-['EB_Garamond:Regular',sans-serif] font-normal inset-[15.96%_26.55%_80%_39.83%] leading-[normal] text-[18px] text-black">
            {email}
          </p>
          <div className="absolute bg-[#d9d9d9] border border-[#5e503f] border-solid inset-[21.58%_2.36%_68.25%_37.9%]" />
          <p className="[word-break:break-word] absolute font-['EB_Garamond:Regular',sans-serif] font-normal inset-[22.46%_3.64%_74.74%_39.83%] leading-[normal] text-[#5e503f] text-[12px]">
            Password
          </p>
          <p className="[word-break:break-word] absolute font-['EB_Garamond:Regular',sans-serif] font-normal inset-[26.14%_3.64%_70.18%_39.83%] leading-[normal] text-[16px] text-black">
            ************
          </p>
          <div className="absolute aspect-square left-[91.65%] right-[5.02%] top-[144px]" data-name="edit">
            <img
              alt="Edit password"
              className="absolute inset-0 size-full object-cover pointer-events-none"
              src="/icons/pencil.svg"
            />
          </div>

          <div
            className="absolute flex inset-[1.8%_65.11%_67.64%_0] items-center justify-center"
            data-name="Profile"
            style={{ containerType: 'size' }}
          >
            <div className="flex-none h-[hypot(10.4824cqw,90.9712cqh)] rotate-[-6.15deg] w-[hypot(89.5176cqw,-9.02881cqh)]">
              <div className="relative size-full">
                <div className="absolute bg-[#d9d9d9] inset-0 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]" />
                <div className="absolute bg-[rgba(0,0,0,0.25)] inset-[9.16%_8.33%_14.5%_8.33%]" />
                <div className="-translate-y-1/2 absolute aspect-square left-[17.2%] right-[18.28%] top-[calc(50%+3.32px)]">
                  {profileSrc ? (
                    <Image alt="Profile picture" className="object-cover" fill src={profileSrc} />
                  ) : (
                    <div className="size-full bg-[#b0a090]" />
                  )}
                </div>
              </div>
            </div>
          </div>
          <div
            className="absolute aspect-[52.11977374876483/113.95799776884243] flex items-center justify-center left-[0.63%] right-[88.21%] top-0"
            style={{ containerType: 'size' }}
          >
            <div className="flex-none h-[hypot(22.6616cqw,96.1887cqh)] rotate-[-6.15deg] w-[hypot(77.3384cqw,-3.81134cqh)]">
              <div className="relative size-full">
                <Image
                  alt=""
                  className="absolute inset-0 object-cover pointer-events-none"
                  fill
                  src="/interface/paperclip.png"
                />
              </div>
            </div>
          </div>
          <div
            className="absolute aspect-square flex items-center justify-center left-[28.48%] right-[66.32%] top-[140px]"
            style={{ containerType: 'size' }}
          >
            <div className="flex-none h-[hypot(12.8955cqw,87.1045cqh)] rotate-[-8.42deg] w-[hypot(87.1045cqw,-12.8955cqh)]">
              <div className="relative size-full">
                <img
                  alt="Edit profile picture"
                  className="absolute inset-0 size-full object-cover pointer-events-none"
                  src="/icons/pencil.svg"
                />
              </div>
            </div>
          </div>
        </div>

        <div
          className="absolute flex inset-[9.34%_2.7%_73.15%_92.93%] items-center justify-center"
          style={{ containerType: 'size' }}
        >
          <div className="flex-none h-[100cqw] rotate-90 w-[100cqh]">
            <p className="[word-break:break-word] font-['EB_Garamond:Regular',sans-serif] font-normal leading-[normal] relative text-[#5e503f] text-[20px] text-center whitespace-nowrap">
              Account Settings
            </p>
          </div>
        </div>
      </div>

      <div
        className="absolute flex inset-[0_96.12%_0_-96.12%] items-center justify-center"
        style={{ containerType: 'size' }}
      >
        <div className="-scale-x-100 flex-none h-[100cqh] w-[100cqw]">
          <div className="overflow-clip relative size-full" data-name="folder-front 1">
            <div className="absolute inset-[1.69%_10.46%_2.55%_1.7%]">
              <img
                alt=""
                className="absolute inset-0 size-full object-fill"
                src="/interface/folder-front.svg"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
