import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLearning } from "../services/context";
import { dayKey, parseStreak, streakKey, streakStats } from "./streak";
const Context = createContext({
  days: [] as string[],
  today: dayKey(),
  current: 0,
  best: 0,
  todayDone: false,
  ready: false,
  error: "",
  mark: () => {},
  retry: () => {},
});
export const useStreak = () => useContext(Context);
export function StreakProvider({ children }: { children: React.ReactNode }) {
  const { actor, state } = useLearning();
  const [days, setDays] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [today, setToday] = useState(dayKey);
  const latest = useRef<string[]>([]),
    pending = useRef<string[]>([]);
  const loaded = useRef(false),
    alive = useRef(true),
    queue = useRef(Promise.resolve());
  const key = streakKey(actor.id);
  const persist = useCallback(
    (value: string[]) => {
      const job = queue.current
        .catch(() => {})
        .then(() => AsyncStorage.setItem(key, JSON.stringify(value)));
      queue.current = job;
      void job
        .then(() => {
          if (alive.current && queue.current === job) setError("");
        })
        .catch(() => {
          if (alive.current)
            setError("Не удалось сохранить серию. Повтори сохранение.");
        });
    },
    [key],
  );
  useEffect(() => {
    alive.current = true;
    let live = true;
    void AsyncStorage.getItem(key)
      .then((raw) => {
        if (!live) return;
        latest.current = [
          ...new Set([...parseStreak(raw), ...pending.current]),
        ].sort();
        loaded.current = true;
        setDays(latest.current);
        setReady(true);
        setError("");
        if (pending.current.length) persist(latest.current);
        pending.current = [];
      })
      .catch(() => {
        if (live) setError("Не удалось загрузить серию занятий.");
      });
    return () => {
      live = false;
      alive.current = false;
    };
  }, [key, reload, persist]);
  const add = useCallback(
    (dates: string[]) => {
      if (actor.role !== "student") return;
      if (!loaded.current) {
        pending.current = [...new Set([...pending.current, ...dates])];
        return;
      }
      const value = [...new Set([...latest.current, ...dates])].sort();
      if (value.length === latest.current.length) return;
      latest.current = value;
      setDays(value);
      persist(value);
    },
    [actor.role, persist],
  );
  // Recover only actual submitted attempts, never login, reports authored by a teacher,
  // or course updatedAt (which also changes when simply navigating).
  useEffect(() => {
    add(
      state.attempts
        .filter(
          (a) =>
            a.studentId === actor.id &&
            a.answers.length > 0 &&
            Number.isFinite(Date.parse(a.at)),
        )
        .map((a) => dayKey(new Date(a.at))),
    );
  }, [state.attempts, actor.id, add]);
  useEffect(() => {
    const refresh = () => setToday(dayKey());
    const timer = setInterval(refresh, 60000);
    const sub = AppState.addEventListener("change", refresh);
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  const mark = useCallback(() => {
    const day = dayKey();
    setToday(day);
    add([day]);
  }, [add]);
  const stats = useMemo(() => streakStats(days, today), [days, today]);
  return (
    <Context.Provider
      value={{
        days,
        today,
        ...stats,
        ready,
        error,
        mark,
        retry: () =>
          loaded.current ? persist(latest.current) : setReload((n) => n + 1),
      }}
    >
      {children}
    </Context.Provider>
  );
}
