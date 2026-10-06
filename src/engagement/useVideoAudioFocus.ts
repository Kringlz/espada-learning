import { useContext, useEffect, useId } from "react";
import { useSounds } from "./Sounds";
import { MotionActiveContext } from "../components/Motion";
/** Mounted video owns the audio foreground; hidden screens do not keep a lease. */
export function useVideoAudioFocus() {
  const { holdVideo } = useSounds();
  const active = useContext(MotionActiveContext);
  const id = useId();
  useEffect(() => {
    if (active) return holdVideo(id);
  }, [active, holdVideo, id]);
}
