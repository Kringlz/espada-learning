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
  music: false,
  toggleMusic: () => {},
  volume: 0.3,
  setVolume: (_: number) => {},
  musicPaused: false,
  error: "",
  holdVideo:
    (_: string): (() => void) =>
    () => {},
});
export const useSounds = () => useContext(Context);
export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [music, setMusic] = useState(false);
  const [volume, setVolumeState] = useState(0.3);
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  const [videoCount, setVideoCount] = useState(0);
  const [error, setError] = useState("");
  const videos = useRef(new Set<string>());
  const current = useRef(false),
    touched = useRef(false),
    volumeTouched = useRef(false);
  const volumeRef = useRef(0.3);
  const last = useRef(0),
    lastName = useRef<SoundName>("open");
  const queue = useRef(Promise.resolve());
  const player = useRef<ReturnType<typeof createSoundPlayer> | null>(null);
  const getPlayer = useCallback(() => {
    player.current ??= createSoundPlayer();
    player.current.setVolume(volumeRef.current);
    return player.current;
  }, []);
  const persist = (key: string, value: string) => {
    queue.current = queue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(key, value));
    void queue.current.catch(() => {});
  };
  useEffect(() => {
    let live = true;
    void AsyncStorage.multiGet(["espada.sounds.v1", "espada.volume.v1"])
      .then((values) => {
        if (!live) return;
        if (!touched.current) {
          current.current = values[0][1] !== "off";
          setEnabled(current.current);
        }
        const saved = Number(values[1][1]);
        if (
          !volumeTouched.current &&
          values[1][1] !== null &&
          Number.isFinite(saved) &&
          saved >= 0 &&
          saved <= 1
        ) {
          volumeRef.current = saved;
          setVolumeState(saved);
          player.current?.setVolume(saved);
        }
      })
      .catch(() => {});
    const listener = AppState.addEventListener("change", (state) => {
      setForeground(state === "active");
      if (state !== "active") {
        player.current?.stop();
        player.current?.stopMusic();
      }
    });
    return () => {
      live = false;
      listener.remove();
      player.current?.dispose();
      player.current = null;
    };
  }, []);
  const holdVideo = useCallback((id: string) => {
    videos.current.add(id);
    setVideoCount(videos.current.size);
    player.current?.stopMusic();
    return () => {
      videos.current.delete(id);
      setVideoCount(videos.current.size);
    };
  }, []);
  const musicPaused = !foreground || videoCount > 0;
  useEffect(() => {
    let live = true;
    if (!music || musicPaused) {
      player.current?.stopMusic();
      return;
    }
    void getPlayer()
      .startMusic()
      .catch(() => {
        if (live) {
          setError("Не удалось включить музыку. Попробуй ещё раз.");
          setMusic(false);
        }
      });
    return () => {
      live = false;
      player.current?.stopMusic();
    };
  }, [music, musicPaused, getPlayer]);
  const play = useCallback(
    (name: SoundName) => {
      if (!current.current || AppState.currentState !== "active") return;
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
      getPlayer().play(name);
    },
    [getPlayer],
  );
  const toggle = () => {
    touched.current = true;
    current.current = !current.current;
    setEnabled(current.current);
    persist("espada.sounds.v1", current.current ? "on" : "off");
    if (!current.current) player.current?.stop();
    else play("open");
  };
  const setVolume = (value: number) => {
    if (!Number.isFinite(value)) return;
    const next = Math.min(1, Math.max(0, value));
    volumeTouched.current = true;
    volumeRef.current = next;
    setVolumeState(next);
    player.current?.setVolume(next);
    persist("espada.volume.v1", String(next));
  };
  return (
    <Context.Provider
      value={{
        enabled,
        toggle,
        play,
        music,
        toggleMusic: () => {
          setError("");
          setMusic((v) => !v);
        },
        volume,
        setVolume,
        musicPaused,
        error,
        holdVideo,
      }}
    >
      {children}
    </Context.Provider>
  );
}
