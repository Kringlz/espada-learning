import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { createSoundPlayer } from "./soundPlayer";
import { SoundName } from "./soundAssets";

const Context = createContext({
  enabled: false,
  toggle: () => {},
  play: (_: SoundName) => {},
});
export const useSounds = () => useContext(Context);
export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const current = useRef(false);
  const last = useRef(0);
  const lastName = useRef<SoundName>("open");
  const queue = useRef(Promise.resolve());
  const player = useRef<ReturnType<typeof createSoundPlayer> | null>(null);
  const touched = useRef(false);
  useEffect(() => {
    let live = true;
    void AsyncStorage.getItem("espada.sounds.v1")
      .then((value) => {
        if (live && !touched.current) {
          current.current = value !== "off";
          setEnabled(current.current);
        }
      })
      .catch(() => {});
    const listener = AppState.addEventListener("change", (state) => {
      if (state !== "active") player.current?.stop();
    });
    return () => {
      live = false;
      listener.remove();
      player.current?.dispose();
      player.current = null;
    };
  }, []);
  const play = useCallback((name: SoundName) => {
    if (!current.current) return;
    const now = Date.now();
    if (
      now - last.current < (lastName.current === "level" ? 850 : 180) &&
      (name === "open" ||
        name === lastName.current ||
        lastName.current === "level")
    )
      return;
    last.current = now;
    lastName.current = name;
    player.current ??= createSoundPlayer();
    player.current.play(name);
  }, []);
  const toggle = () => {
    touched.current = true;
    current.current = !current.current;
    setEnabled(current.current);
    const value = current.current ? "on" : "off";
    queue.current = queue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem("espada.sounds.v1", value));
    void queue.current.catch(() => {});
    if (!current.current) player.current?.stop();
    else play("open");
  };
  return (
    <Context.Provider value={{ enabled, toggle, play }}>
      {children}
    </Context.Provider>
  );
}
