import { createContext, useContext, useEffect, useId, useRef } from "react";
import { MotionActiveContext } from "./Motion";
export type FocusedLesson = { id: string; exit: () => void };
export const LessonFocus = createContext<
  (lesson: FocusedLesson | null, owner: string) => void
>(() => {});
/** Keep the app navigation out of an active lesson without unmounting its saved state. */
export function useLessonFocus(active: boolean, exit: () => void) {
  const setFocus = useContext(LessonFocus);
  const visible = useContext(MotionActiveContext);
  const id = useId();
  const latest = useRef(exit);
  latest.current = exit;
  useEffect(() => {
    if (!active || !visible) return;
    setFocus({ id, exit: () => latest.current() }, id);
    return () => setFocus(null, id);
  }, [active, visible, id, setFocus]);
}

export type LessonScene = { color: string; progress: number };
export const LessonSceneContext = createContext<
  (scene: LessonScene | null) => void
>(() => {});
export function useLessonScene(color: string, progress: number) {
  const setScene = useContext(LessonSceneContext);
  const visible = useContext(MotionActiveContext);
  useEffect(() => {
    if (!visible) return;
    setScene({ color, progress });
    return () => setScene(null);
  }, [color, progress, visible, setScene]);
}
