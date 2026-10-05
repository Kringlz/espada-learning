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
import { parseSoundPreferences, SoundPreferences } from "./soundPreferences";

const Context = createContext({
  enabled: false,
  volume: 0.45,
  error: "",
  toggle: () => {},
  setVolume: (_: number) => {},
  retry: () => {},
  play: (_: SoundName) => {},
});
export const useSounds = () => useContext(Context);
export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<SoundPreferences>({
    enabled: false,
    volume: 0.45,
  });
  const current = useRef(preferences);
  const [error, setError] = useState("");
  const last = useRef({ at: 0, name: "open" as SoundName });
  const queue = useRef(Promise.resolve());
  const player = useRef<ReturnType<typeof createSoundPlayer> | null>(null);
  const touched = useRef(false);
  const mounted = useRef(true);
  const active = useRef(true);
  useEffect(() => {
    let live = true;
    mounted.current = true;
    void Promise.all([
      AsyncStorage.getItem("espada.sounds.v2"),
      AsyncStorage.getItem("espada.sounds.v1"),
    ])
      .then(([raw, legacy]) => {
        if (live && !touched.current) {
          current.current = parseSoundPreferences(raw, legacy);
          setPreferences(current.current);
        }
      })
      .catch(() => {
        if (live)
          setError("Не удалось прочитать настройки звука. Выбери их заново.");
      });
    const listener = AppState.addEventListener("change", (state) => {
      active.current = state === "active";
      if (!active.current) player.current?.stop();
    });
    return () => {
      live = false;
      mounted.current = false;
      listener.remove();
      player.current?.dispose();
      player.current = null;
    };
  }, []);
  const play = useCallback((name: SoundName) => {
    if (
      !current.current.enabled ||
      current.current.volume === 0 ||
      !active.current
    )
      return;
    const now = Date.now();
    const priority: Record<SoundName, number> = {
      open: 0,
      radar: 1,
      success: 2,
      points: 3,
      streak: 4,
      level: 5,
    };
    if (
      now - last.current.at < 850 &&
      priority[name] < priority[last.current.name]
    )
      return;
    if (now - last.current.at < 180 && name === last.current.name) return;
    last.current = { at: now, name };
    player.current ??= createSoundPlayer();
    player.current.play(name, current.current.volume);
  }, []);
  function save(value: SoundPreferences) {
    const job = queue.current
      .catch(() => {})
      .then(() =>
        AsyncStorage.setItem("espada.sounds.v2", JSON.stringify(value)),
      );
    queue.current = job;
    void job
      .then(() => {
        if (mounted.current && queue.current === job) setError("");
      })
      .catch(() => {
        if (mounted.current)
          setError("Настройки звука ещё не сохранены. Повтори сохранение.");
      });
  }
  function update(value: SoundPreferences) {
    touched.current = true;
    current.current = value;
    setPreferences(value);
    save(value);
    player.current?.stop();
    last.current.at = 0;
    if (value.enabled && value.volume > 0) play("open");
  }
  return (
    <Context.Provider
      value={{
        ...preferences,
        error,
        play,
        toggle: () =>
          update({ ...current.current, enabled: !current.current.enabled }),
        setVolume: (volume) => {
          if (Number.isFinite(volume))
            update({
              ...current.current,
              volume: Math.max(0, Math.min(1, volume)),
            });
        },
        retry: () => save(current.current),
      }}
    >
      {children}
    </Context.Provider>
  );
}
