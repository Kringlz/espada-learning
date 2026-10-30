import { WeeklyRewardOutbox } from "./weeklyRewards";
import { backend } from "../services/supabase";
import { useStreak } from "./StreakContext";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLearning } from "../services/context";
import { useCourseProgress } from "../course/storage";
import { useSounds } from "./Sounds";
import {
  addRewards,
  levelFor,
  levels,
  parseRewards,
  RewardEvent,
  RewardLedger,
  rewardKey,
  rewardsStorageKey,
  totalPoints,
} from "./rewards";

const Context = createContext({
  points: 0,
  ready: false,
  error: "",
  notice: "",
  award: (_: RewardEvent[], _celebrate = true) => {},
  earned: (_: RewardEvent): boolean => false,
  retry: () => {},
});
export const useRewards = () => useContext(Context);
export function RewardsProvider({ children }: { children: React.ReactNode }) {
  const { actor, state, mode } = useLearning();
  const { mark } = useStreak();
  const course = useCourseProgress(actor.id);
  const { play } = useSounds();
  const [ledger, setLedger] = useState<RewardLedger>({});
  const latest = useRef<RewardLedger>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState("");
  const weekly = useRef<WeeklyRewardOutbox | null>(null);
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const queue = useRef(Promise.resolve());
  const backfilled = useRef(false);
  const mounted = useRef(true);
  const key = rewardsStorageKey(actor.id);
  useEffect(() => {
    let live = true;
    mounted.current = true;
    void AsyncStorage.getItem(key)
      .then((raw) => {
        if (!live) return;
        latest.current = parseRewards(raw);
        setLedger(latest.current);
        setReady(true);
        setError("");
      })
      .catch(() => {
        if (live) setError("Не удалось загрузить очки. Попробуй ещё раз.");
      });
    return () => {
      live = false;
      mounted.current = false;
    };
  }, [key, reload]);
  useEffect(() => {
    setSyncError("");
    if (mode !== "supabase" || actor.role !== "student" || !backend) return;
    const outbox = new WeeklyRewardOutbox(
      actor.id,
      AsyncStorage,
      async (events) => {
        const { data: auth } = await backend!.auth.getSession();
        if (auth.session?.user.id !== actor.id) throw Error("Actor changed");
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        try {
          const { error } = await backend!
            .rpc("record_learning_rewards", { p_events: events })
            .abortSignal(controller.signal);
          if (error) throw error;
        } finally {
          clearTimeout(timeout);
        }
      },
      setSyncError,
    );
    weekly.current = outbox;
    void outbox.retry();
    const timer = setInterval(() => void outbox.retry(), 15000);
    return () => {
      outbox.stop();
      weekly.current = null;
      clearInterval(timer);
    };
  }, [actor.id, actor.role, mode]);
  const persist = useCallback(
    (data: RewardLedger) => {
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
            setError("Очки ещё не сохранены. Повтори сохранение.");
        });
    },
    [key],
  );
  const record = useCallback(
    (events: RewardEvent[], celebrate: boolean, liveAward = false) => {
      if (!ready || actor.role !== "student") return;
      const before = totalPoints(latest.current);
      const result = addRewards(latest.current, events);
      if (!result.gained) return;
      if (liveAward)
        void weekly.current?.enqueue(
          events.filter((e) => !latest.current[rewardKey(e)]),
        );
      latest.current = result.ledger;
      setLedger(result.ledger);
      persist(result.ledger);
      if (celebrate) {
        const level = levelFor(before + result.gained);
        const promoted = level > levelFor(before);
        setNotice(
          `+${result.gained} очков${promoted ? ` · Уровень ${level + 1}: ${levels[level].name}!` : " · Так держать!"}`,
        );
        play(promoted ? "level" : "success");
      }
    },
    [ready, actor.role, persist, play],
  );
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
        ready,
        error: error || syncError,
        notice,
        award: (events, celebrate = true) => {
          if (events.length) mark();
          record(events, celebrate, true);
        },
        earned: (event) => !!ledger[rewardKey(event)],
        retry: () => {
          void weekly.current?.retry();
          if (ready) persist(latest.current);
          else setReload((n) => n + 1);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
