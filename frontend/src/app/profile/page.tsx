import ProfileFolder from '@/components/profile/ProfileFolder';
import NavBarFull from '@/components/navbar/NavBarFull';
import NavBarSplit from '@/components/navbar/NavBarSplit';
import styles from './page.module.css';

function WoodBackground() {
  return (
    <div className={styles.woodBg}>
      <img alt="" className={styles.woodBgImg} src="/background/wood.png" />
    </div>
  );
}

function SmallNav() {
  return (
    <div className={styles.smallNav}>
      <div className={styles.smallNavWood}>
        <img alt="" className={styles.smallNavWoodImg} src="/background/wood.png" />
      </div>
      <div className={styles.smallNavClip}>
        <img alt="" className={styles.smallNavClipImg} src="/interface/clip.png" />
      </div>
      <div className={styles.smallNavLogo}>
        <div className={styles.smallNavLogoCard}>
          <span className={styles.smallNavLogoText}>Relyze</span>
        </div>
      </div>
      <div className={styles.smallNavProfile}>
        <div className={styles.smallNavProfileInner}>
          <div className={styles.smallNavProfilePlaceholder} />
        </div>
      </div>
      <div className={styles.smallNavHomeTab}>
        <span className={styles.smallNavHomeTabText}>Home Page</span>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className={styles.page}>
      {/* ── LARGE (≥ 1024px) ── */}
      <div className={styles.largeScreen}>
        <WoodBackground />
        <div className={styles.folderWrapper}>
          <div className={styles.folderRotate}>
            <div className={styles.folderSize}>
              <ProfileFolder />
            </div>
          </div>
        </div>
        <div className={styles.navFullWrapper}>
          <NavBarFull />
        </div>
      </div>

      {/* ── MEDIUM (640px – 1023px) ── */}
      <div className={styles.medScreen}>
        <WoodBackground />
        <div className={styles.navSplitWrapper}>
          <NavBarSplit />
        </div>
        <div className={styles.medFolderOuter}>
          <div className={styles.medFolderTransform}>
            <div className={styles.folderSize}>
              <ProfileFolder />
            </div>
          </div>
        </div>
      </div>

      {/* ── SMALL (< 640px) ── */}
      <div className={styles.smallScreen}>
        <WoodBackground />
        <SmallNav />
        <div className={styles.smallFolderOuter}>
          <div className={styles.smallFolderTransform}>
            <div className={styles.folderSize}>
              <ProfileFolder />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WoodBackground() {
  return (
    <div
      className="absolute left-[-237px] right-0 h-[945px] top-[79px] shadow-[0px_10px_4px_0px_rgba(0,0,0,0.5)]"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img
          alt=""
          className="absolute h-[135.02%] left-[-0.01%] max-w-none top-0 w-[100.03%]"
          src="/background/wood.png"
        />
      </div>
    </div>
  );
}

function SmallNav() {
  return (
    <div className="absolute left-0 right-0 top-0 h-[90px] drop-shadow-[0px_4px_2px_rgba(0,0,0,0.5)]">
      <div className="absolute left-0 right-0 top-[10px] h-[80px] overflow-hidden shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]">
        <img
          alt=""
          className="absolute h-[1200%] left-[-0.01%] max-w-none top-0 w-[100.03%]"
          src="/background/wood.png"
        />
      </div>
      <div className="absolute right-4 top-0" style={{ width: 36, height: 56 }}>
        <img alt="" className="absolute inset-0 w-full h-full object-cover" src="/interface/clip.png" />
      </div>
      <div className="absolute left-3 top-1/2 -translate-y-1/2">
        <div
          className="bg-[#d9d9d9] px-3 py-1 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
          style={{ transform: 'rotate(-4.8deg)' }}
        >
          <span style={{ fontFamily: "'EB Garamond', serif", fontSize: 26, color: '#000', whiteSpace: 'nowrap' }}>
            Relyze
          </span>
        </div>
      </div>
      <div className="absolute right-12 top-1/2 -translate-y-1/2 flex h-[46px] w-[42px] items-center justify-center bg-[#d9d9d9] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]">
        <div className="flex h-[76%] w-[75%] items-center justify-center bg-[rgba(0,0,0,0.25)]">
          <div className="h-[65%] w-[65%] bg-[#b0a090]" />
        </div>
      </div>
      <div
        className="absolute top-1/2 -translate-y-1/2 flex h-[46px] w-[110px] items-center justify-center bg-[#d9d9d9] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
        style={{ right: 'calc(3rem + 42px + 8px)' }}
      >
        <span style={{ fontFamily: "'EB Garamond', serif", fontSize: 15, color: '#000', whiteSpace: 'nowrap' }}>
          Home Page
        </span>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="bg-white h-screen overflow-hidden relative">

      {/* ── LARGE (≥ 1024px) ── */}
      <div className="hidden lg:block absolute inset-0">
        <WoodBackground />
        <div className="absolute flex h-[766.016px] items-center justify-center left-[421px] top-[100px] w-[617.749px]">
          <div className="flex-none rotate-[-1.76deg]">
            <div className="h-[748.108px] relative w-[595.072px]">
              <ProfileFolder />
            </div>
          </div>
        </div>
        <div className="absolute h-[175px] left-0 right-0 top-[-65px]">
          <NavBarFull />
        </div>
      </div>

      {/* ── MEDIUM (640px – 1023px) ── */}
      <div className="hidden sm:block lg:hidden absolute inset-0 overflow-hidden">
        <WoodBackground />
        <div className="absolute h-[400px] left-0 right-0 top-[-65px]">
          <NavBarSplit />
        </div>
        <div className="absolute left-0 right-0 top-[310px] overflow-hidden" style={{ bottom: 0 }}>
          <div
            style={{
              transform: 'translateX(-30px) rotate(-1.76deg)',
              transformOrigin: 'top left',
              width: 595,
              height: 748,
            }}
          >
            <div className="h-[748.108px] relative w-[595.072px]">
              <ProfileFolder />
            </div>
          </div>
        </div>
      </div>

      {/* ── SMALL (< 640px) ── */}
      <div className="block sm:hidden absolute inset-0 overflow-hidden">
        <WoodBackground />
        <SmallNav />
        <div className="absolute left-0 right-0 top-[96px] overflow-hidden" style={{ bottom: 0 }}>
          <div
            style={{
              transform: 'translateX(-55px) rotate(-1.76deg) scale(0.88)',
              transformOrigin: 'top left',
              width: 595,
              height: 748,
            }}
          >
            <div className="h-[748.108px] relative w-[595.072px]">
              <ProfileFolder />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
