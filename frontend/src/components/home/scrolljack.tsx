"use client";

import { useEffect, useRef } from "react";

export default function useScrollSync() {
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const isAtPageBottom = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      return scrollTop + clientHeight >= scrollHeight - 1;
    };

    const isListAtTop = () => list.scrollTop <= 0;
    const isListAtBottom = () => list.scrollTop + list.clientHeight >= list.scrollHeight - 1;

    const onWheel = (event: WheelEvent) => {
      if (!isAtPageBottom()) return;
      if (event.deltaY > 0 && !isListAtBottom()) {
        event.preventDefault();
        list.scrollBy({ top: event.deltaY, behavior: "auto" });
      } else if (event.deltaY < 0 && !isListAtTop()) {
        event.preventDefault();
        list.scrollBy({ top: event.deltaY, behavior: "auto" });
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  return listRef;
}
