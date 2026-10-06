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
import { State, Command, Profile, Role } from "../core/types";
import { scopedState } from "../core/engine";
import { LocalRepository } from "./repository";
import {
  backend,
  mode,
  remoteDispatch,
  remoteRead,
  remoteRegister,
  secureStorage,
} from "./supabase";
import { demoStudentId } from "../data/seed";
import { LearningOutbox } from "./outbox";
const repo = new LocalRepository(AsyncStorage);
const outbox = new LearningOutbox(secureStorage, remoteDispatch);
const PENDING_KEY = "espada.pendingRegistration";
type PendingRegistration = {
  name: string;
  role: Role;
  code?: string;
  email?: string;
};
async function readPendingRegistration(): Promise<PendingRegistration | null> {
  const raw = await secureStorage.getItem(PENDING_KEY);
  return raw ? JSON.parse(raw) : null;
}
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
    hasSession: boolean;
    pendingRegistration: PendingRegistration | null;
    registerProfile: (input: {
      name: string;
      role: Role;
      code?: string;
      email?: string;
      password?: string;
    }) => Promise<"ready" | "confirmEmail">;
    confirmEmail: (email: string, token: string) => Promise<void>;
    resendConfirmation: (email: string) => Promise<void>;
  }) => React.ReactNode;
}) {
  const [state, setState] = useState<State | null>(null);
  const [actorId, setActorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [pendingRegistration, setPendingRegistration] =
    useState<PendingRegistration | null>(null);
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
          setHasSession(false);
          setPendingRegistration(await readPendingRegistration());
          return;
        }
        setHasSession(true);
        let s: State;
        try {
          s = await remoteRead();
        } catch (e) {
          const pending = await readPendingRegistration();
          if (!pending) throw e;
          await remoteRegister(pending.name, pending.role, pending.code);
          await secureStorage.removeItem(PENDING_KEY);
          s = await remoteRead();
        }
        setPendingRegistration(null);
        setState(s);
        setActorId(data.session.user.id);
        setPendingCount((await outbox.read(data.session.user.id)).length);
      }
      setError(null);
    } catch (e) {
      if (mode === "supabase") setPendingRegistration(await readPendingRegistration());
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
        setHasSession(false);
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
  async function registerProfile(input: {
    name: string;
    role: Role;
    code?: string;
    email?: string;
    password?: string;
  }): Promise<"ready" | "confirmEmail"> {
    if (mode === "demo") {
      const id = await repo.registerProfile(input.name, input.role, input.code);
      await switchAccount(id);
      return "ready";
    }
    if (!backend) throw Error("Backend is not configured.");
    const { data: existing } = await backend.auth.getSession();
    if (!existing.session) {
      if (!input.email || !input.password)
        throw Error("Укажите email и пароль.");
      const { data, error } = await backend.auth.signUp({
        email: input.email,
        password: input.password,
      });
      if (error) throw Error(errorMessage(error));
      if (!data.session) {
        const pending: PendingRegistration = {
          name: input.name,
          role: input.role,
          code: input.code,
          email: input.email,
        };
        await secureStorage.setItem(PENDING_KEY, JSON.stringify(pending));
        setPendingRegistration(pending);
        return "confirmEmail";
      }
    }
    await remoteRegister(input.name, input.role, input.code);
    await secureStorage.removeItem(PENDING_KEY);
    setPendingRegistration(null);
    await refresh();
    return "ready";
  }
  // Подтверждение 6-значным кодом из письма: работает одинаково в браузере
  // и в нативном приложении, без deep links и без настройки redirect URL.
  async function confirmEmail(email: string, token: string) {
    if (!backend) throw Error("Backend is not configured.");
    const { error } = await backend.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });
    if (error) throw Error(errorMessage(error));
    await refresh();
  }
  async function resendConfirmation(email: string) {
    if (!backend) throw Error("Backend is not configured.");
    const { error } = await backend.auth.resend({
      type: "signup",
      email,
    });
    if (error) throw Error(errorMessage(error));
  }
  const actor = state?.profiles.find((p) => p.id === actorId && p.active);
  if (!state || !actor)
    return (
      <>
        {fallback({
          loading,
          error,
          retry: () => void refresh(),
          login,
          hasSession,
          pendingRegistration,
          registerProfile,
          confirmEmail,
          resendConfirmation,
        })}
      </>
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
          // После выхода — чистый экран входа: email и пароль заново.
          await secureStorage.removeItem(PENDING_KEY);
          setPendingRegistration(null);
          setHasSession(false);
          setError(null);
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
