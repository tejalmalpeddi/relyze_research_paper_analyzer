'use client';

import { useEffect, useState } from 'react';
import ProfileFolder from '@/components/profile/ProfileFolder';
import styles from './page.module.css';

const DESIGN_VIEWPORT_WIDTH = 1440;
const FOLDER_DESKTOP_LEFT = 421;
const FOLDER_SHIFT_RATE = 0.5;
const FOLDER_MIN_LEFT = -20;

function WoodBackground() {
  return (
    <div className={styles.woodBg}>
      <img alt="" className={styles.woodBgImg} src="/background/wood.png" />
    </div>
  );
}

export default function ProfilePage() {
  const [folderLeft, setFolderLeft] = useState(421);

  useEffect(() => {
    function updateFolderLeft() {
      const widthBelowDesign = Math.max(0, DESIGN_VIEWPORT_WIDTH - window.innerWidth);
      setFolderLeft(Math.max(FOLDER_MIN_LEFT, FOLDER_DESKTOP_LEFT - widthBelowDesign * FOLDER_SHIFT_RATE));
    }

    updateFolderLeft();
    window.addEventListener('resize', updateFolderLeft);
    return () => window.removeEventListener('resize', updateFolderLeft);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.stage}>
        <WoodBackground />
        <div className={styles.folderWrapper} style={{ left: folderLeft }}>
          <div className={styles.folderRotate}>
            <div className={styles.folderSize}>
              <ProfileFolder />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
