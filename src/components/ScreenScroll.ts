import { createContext, useContext, useEffect } from "react";
export const ScreenScroll = createContext<() => void>(() => {});
/** Move to the heading when a nested screen changes inside the app scroller. */
export function useScreenScroll(key: string, enabled = true) {
  const toTop = useContext(ScreenScroll);
  useEffect(() => {
    if (!enabled) return;
    const frame = requestAnimationFrame(toTop);
    return () => cancelAnimationFrame(frame);
  }, [key, toTop, enabled]);
}

/** Jump within a continuous lesson using the app's existing scroll container. */
export const ScreenAnchor = createContext<
  (node: import("react-native").View | null) => void
>(() => {});
