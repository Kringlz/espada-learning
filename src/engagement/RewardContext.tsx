import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import {
  Engagement,
  engagementStorageKey,
  parseEngagement,
  recordEngagement,
  streakSummary,
} from "./streaks";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLearning } from "../services/context";
import { useCourseProgress } from "../course/storage";
import { useSounds } from "./Sounds";
import {
  levelFor,
  levels,
  RewardEvent,
  RewardLedger,
  rewardKey,
  rewardsStorageKey,
  totalPoints,
} from "./rewards";

const Context = createContext({
  points: 0,
  streak: { current: 0, best: 0, today: false, day: "" },
  timeZone: "",
  ready: false,
  error: "",
  notice: "",
  award: (_: RewardEvent[]) => {},
  earned: (_: RewardEvent): boolean => false,
  retry: () => {},
});
export const useRewards = () => useContext(Context);
export function RewardsProvider({ children }: { children: React.ReactNode }) {
  const { actor, state } = useLearning();
  const course = useCourseProgress(actor.id);
  const { play } = useSounds();
  const [ledger, setLedger] = useState<RewardLedger>({});
  const latest = useRef<RewardLedger>({});
  const engagement = useRef<Engagement | null>(null);
  const pending = useRef<{ events: RewardEvent[]; at: Date }[]>([]);
  const [clock, setClock] = useState(() => new Date());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const queue = useRef(Promise.resolve());
  const backfilled = useRef(false);
  const mounted = useRef(true);
  const key = engagementStorageKey(actor.id);
  useEffect(() => {
    const tick = () => setClock(new Date());
    const timer = setInterval(tick, 30000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") tick();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, []);
  useEffect(() => {
    let live = true;
    mounted.current = true;
    void Promise.all([
      AsyncStorage.getItem(key),
      AsyncStorage.getItem(rewardsStorageKey(actor.id)),
    ])
      .then(([raw, legacy]) => {
        if (!live) return;
        engagement.current = parseEngagement(raw, legacy);
        latest.current = engagement.current.rewards;
        setLedger(latest.current);
        setReady(true);
        setError("");
      })
      .catch(() => {
        if (live)
          setError("Не удалось загрузить очки и серию. Попробуй ещё раз.");
      });
    return () => {
      live = false;
      mounted.current = false;
    };
  }, [key, reload]);
  const persist = useCallback(
    (data: Engagement) => {
      const value = JSON.stringify(data);
      const job = queue.current
        .catch(() => {})
        .then(() => AsyncStorage.setItem(key, value));
      queue.current = job;
      void job
        .then(() => {
          if (mounted.current && queue.current === job) setError("");
        })
        .catch(() => {
          if (mounted.current)
            setError("Очки и серия ещё не сохранены. Повтори сохранение.");
        });
    },
    [key],
  );
  const record = useCallback(
    (events: RewardEvent[], celebrate: boolean, at = new Date()) => {
      if (actor.role !== "student") return;
      if (!ready || !engagement.current) {
        if (celebrate) pending.current.push({ events, at });
        return;
      }
      const before = totalPoints(latest.current);
      const result = recordEngagement(
        engagement.current,
        events,
        celebrate,
        at,
      );
      if (!result.gained) return;
      engagement.current = result.data;
      latest.current = result.data.rewards;
      setLedger(result.data.rewards);
      setClock(new Date());
      persist(result.data);
      if (celebrate) {
        const level = levelFor(before + result.gained);
        const promoted = level > levelFor(before);
        setNotice(
          `+${result.gained} очков${promoted ? ` · Уровень ${level + 1}: ${levels[level].name}!` : result.newDay ? " · День в серии!" : " · Так держать!"}`,
        );
        play(promoted ? "level" : result.newDay ? "streak" : "points");
      }
    },
    [ready, actor.role, persist, play],
  );
  useEffect(() => {
    if (!ready) return;
    for (const item of pending.current.splice(0))
      record(item.events, true, item.at);
  }, [ready, record]);
  // Backfill existing correct work quietly. A restart of a quiz never removes earned points.
  useEffect(() => {
    if (!ready || !course.ready || backfilled.current) return;
    backfilled.current = true;
    const events: RewardEvent[] = [];
    for (const [topicId, progress] of Object.entries(course.progress)) {
      for (const [number, attempt] of Object.entries(progress.quiz)) {
        if (attempt.submitted && attempt.selected === 0)
          events.push({ kind: "question", id: `course:${topicId}:${number}` });
      }
    }
    for (const attempt of state.attempts.filter(
      (a) => a.studentId === actor.id,
    )) {
      const topic = state.topics.find((t) => t.id === attempt.topicId);
      for (const answer of attempt.answers)
        if (
          topic?.checks.find((q) => q.id === answer.questionId)?.answer ===
          answer.choice
        )
          events.push({
            kind: "question",
            id: `topic:${attempt.topicId}:${answer.questionId}`,
          });
    }
    record(events, false);
  }, [
    ready,
    course.ready,
    course.progress,
    state.attempts,
    state.topics,
    actor.id,
    record,
  ]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  return (
    <Context.Provider
      value={{
        points: totalPoints(ledger),
        streak: engagement.current
          ? streakSummary(engagement.current, clock)
          : { current: 0, best: 0, today: false, day: "" },
        timeZone: engagement.current?.timeZone ?? "",
        ready,
        error,
        notice,
        award: (events) => record(events, true),
        earned: (event) => !!ledger[rewardKey(event)],
        retry: () =>
          ready && engagement.current
            ? persist(engagement.current)
            : setReload((n) => n + 1),
      }}
    >
      {children}
    </Context.Provider>
  );
}
