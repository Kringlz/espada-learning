import { createContext, useContext, useEffect } from "react";
export const ScreenScroll = createContext<() => void>(() => {});
/** Move to the heading when a nested screen changes inside the app scroller. */
export function useScreenScroll(key: string) {
  const toTop = useContext(ScreenScroll);
  useEffect(() => {
    const frame = requestAnimationFrame(toTop);
    return () => cancelAnimationFrame(frame);
  }, [key, toTop]);
}
