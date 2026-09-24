import { errorMessage } from "../i18n/errors";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { State, Command, Profile } from "../core/types";
import { scopedState } from "../core/engine";
import { LocalRepository } from "./repository";
import {
  backend,
  mode,
  remoteDispatch,
  remoteRead,
  secureStorage,
} from "./supabase";
import { demoStudentId } from "../data/seed";
import { LearningOutbox } from "./outbox";
const repo = new LocalRepository(AsyncStorage);
const outbox = new LearningOutbox(secureStorage, remoteDispatch);
type Context = {
  state: State;
  actor: Profile;
  accounts: Profile[];
  dispatch: (c: Command) => Promise<void>;
  switchAccount: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  saving: boolean;
  pendingCount: number;
  retryPending: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  mode: typeof mode;
};
const Ctx = createContext<Context | null>(null);
export const useLearning = () => {
  const c = useContext(Ctx);
  if (!c) throw Error("Learning context missing");
  return c;
};
export function LearningProvider({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: (props: {
    loading: boolean;
    error: string | null;
    retry: () => void;
    login: (email: string, password: string) => Promise<void>;
  }) => React.ReactNode;
}) {
  const [state, setState] = useState<State | null>(null);
  const [actorId, setActorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(0);
  const refresh = useCallback(async () => {
    try {
      if (mode === "demo") {
        const s = await repo.read();
        setState(s);
        const stored = await AsyncStorage.getItem("espada.actor");
        setActorId(
          s.profiles.some((p) => p.id === stored && p.active)
            ? stored
            : s.profiles.some((p) => p.id === demoStudentId)
              ? demoStudentId
              : s.profiles.find((p) => p.role === "admin")!.id,
        );
      } else {
        if (!backend)
          throw Error(
            "Supabase is not configured. Set the public URL and publishable key.",
          );
        const { data } = await backend.auth.getSession();
        if (!data.session) {
          setState(null);
          setActorId(null);
          return;
        }
        const s = await remoteRead();
        setState(s);
        setActorId(data.session.user.id);
        setPendingCount((await outbox.read(data.session.user.id)).length);
      }
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        backend?.auth.startAutoRefresh();
        void refresh();
      } else backend?.auth.stopAutoRefresh();
    });
    const auth = backend?.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setState(null);
        setActorId(null);
      } else setTimeout(() => void refresh(), 0);
    });
    return () => {
      sub.remove();
      auth?.data.subscription.unsubscribe();
    };
  }, [refresh]);
  async function dispatch(cmd: Command) {
    busy.current++;
    setSaving(true);
    try {
      const next =
        mode === "demo"
          ? await repo.dispatch(actorId!, cmd)
          : await outbox.submit(actorId!, cmd);
      setState(next);
      setError(null);
    } catch (e) {
      setError(`Сохранение не подтверждено: ${errorMessage(e)}`);
      throw e;
    } finally {
      if (mode === "supabase")
        setPendingCount((await outbox.read(actorId!).catch(() => [])).length);
      busy.current--;
      setSaving(busy.current > 0);
    }
  }
  async function switchAccount(id: string) {
    await AsyncStorage.setItem("espada.actor", id);
    setActorId(id);
    setError(null);
  }
  async function login(email: string, password: string) {
    if (!backend) throw Error("Backend is not configured.");
    const { error } = await backend.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw Error(errorMessage(error));
    await refresh();
  }
  const actor = state?.profiles.find((p) => p.id === actorId && p.active);
  if (!state || !actor)
    return (
      <>{fallback({ loading, error, retry: () => void refresh(), login })}</>
    );
  return (
    <Ctx.Provider
      value={{
        state: scopedState(state, actor),
        actor,
        accounts:
          mode === "demo" ? state.profiles.filter((p) => p.active) : [actor],
        dispatch,
        switchAccount,
        refresh,
        signOut: async () => {
          await backend?.auth.signOut();
          setState(null);
          setActorId(null);
        },
        saving,
        pendingCount,
        retryPending: async () => {
          setSaving(true);
          try {
            setState(await outbox.retry(actorId!));
            setError(null);
          } catch (e) {
            setError(`Ожидает отправки: ${errorMessage(e)}`);
          } finally {
            setPendingCount(
              (await outbox.read(actorId!).catch(() => [])).length,
            );
            setSaving(false);
          }
        },
        error,
        clearError: () => setError(null),
        mode,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
