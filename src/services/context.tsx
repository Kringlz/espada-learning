import { progressOutbox } from "../progress/service";
import { webAuthRedirect } from "./authRedirect";
import {
  clearRecovery,
  handleRecoveryLink,
  isRecovering,
  Linking,
  recoveryRedirect,
  saveNewPassword,
} from "./recovery";
import {
  validateRegistration,
  validateInvitedTeacherRegistration,
  isRegistrationRole,
  parsePendingRegistration,
} from "./registration";
import {
  authFailure,
  AuthFlowError,
  createConfirmationMailer,
  normalizeEmail,
  pendingMatches,
} from "./authFlow";
import { errorMessage } from "../i18n/errors";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { State, Command, Profile, Role } from "../core/types";
import { scopedState } from "../core/engine";
import { LocalRepository } from "./repository";
import {
  backend,
  authStorage,
  mode,
  remoteDispatch,
  remoteRead,
  claimTeacherInvitation,
  remoteRegister,
  secureStorage,
  setRememberMe,
} from "./supabase";
import { demoStudentId } from "../data/seed";
import { LearningOutbox } from "./outbox";
import { GuestRepository, GUEST_ID, GUEST_ACTIVE_KEY } from "./guest";
const repo = new LocalRepository(AsyncStorage);
const guestRepo = new GuestRepository(AsyncStorage);
const outbox = new LearningOutbox(secureStorage, async (command, owner) => {
  const { data } = await backend!.auth.getSession();
  if (!data.session || data.session.user.id !== owner)
    throw Error(
      "Сессия изменилась. Войдите в исходный аккаунт для отправки данных.",
    );
  return remoteDispatch(command);
});
const confirmationMailer = createConfirmationMailer(secureStorage);
const PENDING_KEY = "espada.pendingRegistration";
type PendingRegistration = {
  name: string;
  role: Role;
  code?: string;
  email?: string;
  invitedTeacher?: true;
};
async function readPendingRegistration(): Promise<PendingRegistration | null> {
  const raw = await secureStorage.getItem(PENDING_KEY);
  return parsePendingRegistration(raw);
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
  mode: typeof mode | "guest";
};
const Ctx = createContext<Context | null>(null);
export const useLearning = () => {
  const c = useContext(Ctx);
  if (!c) throw Error("Learning context missing");
  return c;
};
export type AuthScreenProps = {
  loading: boolean;
  error: string | null;
  retry: () => void;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  enterGuest: () => Promise<void>;
  hasSession: boolean;
  pendingRegistration: PendingRegistration | null;
  registerProfile: (input: {
    name: string;
    role: Role;
    code?: string;
    email?: string;
    password?: string;
    remember?: boolean;
  }) => Promise<"ready" | "confirmEmail">;
  confirmEmail: (email: string, token: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  emailCooldown: (email: string) => Promise<number>;
  leaveRegistration: () => Promise<void>;
} & {
  recovering: boolean;
  needsProfile: boolean;
  requestRecovery: (email: string) => Promise<void>;
  confirmRecovery: (email: string, token: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
};
export function LearningProvider({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: (props: AuthScreenProps) => React.ReactNode;
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
  const closing = useRef(false);
  const generation = useRef(0);
  const refreshVersion = useRef(0);
  const identity = useRef<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);
  function clearAccount() {
    generation.current++;
    identity.current = null;
    setState(null);
    setActorId(null);
    setHasSession(false);
    setPendingCount(0);
    setSaving(false);
    setRecovering(false);
    setNeedsProfile(false);
  }
  const refresh = useCallback(async () => {
    const ticket = ++refreshVersion.current;
    const epoch = generation.current;
    const stale = () =>
      epoch !== generation.current || ticket !== refreshVersion.current;
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
        const { data, error: sessionError } = backend
          ? await backend.auth.getSession()
          : { data: { session: null }, error: null };
        if (stale() || closing.current) return;
        if (sessionError) throw authFailure(sessionError);
        if (!data.session) {
          const guestActive = await AsyncStorage.getItem(GUEST_ACTIVE_KEY);
          if (stale()) return;
          if (guestActive === "1") {
            const guestState = await guestRepo.read();
            if (stale() || closing.current) return;
            identity.current = GUEST_ID;
            setState(guestState);
            setActorId(GUEST_ID);
            setHasSession(false);
            setPendingCount(0);
            setPendingRegistration(null);
            setRecovering(false);
            setNeedsProfile(false);
            setError(null);
            return;
          }
          if (!backend)
            throw Error(
              "Сервер входа не настроен. Можно продолжить как гость.",
            );
          const pending = await readPendingRegistration();
          if (stale()) return;
          clearAccount();
          setPendingRegistration(pending);
          return;
        }
        await AsyncStorage.removeItem(GUEST_ACTIVE_KEY);
        if (stale() || closing.current) return;
        const userId = data.session.user.id;
        if (identity.current !== userId) {
          setState(null);
          setActorId(null);
          setPendingCount(0);
        }
        identity.current = userId;
        setHasSession(true);
        const reset = await isRecovering(userId);
        if (stale()) return;
        setRecovering(reset);
        if (reset) {
          setState(null);
          setActorId(null);
          return;
        }
        await claimTeacherInvitation();
        if (stale() || closing.current) return;
        let s: State;
        try {
          s = await remoteRead();
        } catch (e) {
          if (stale() || closing.current) return;
          // A network failure must not send an existing member back through role selection.
          if (
            !(e instanceof Error) ||
            ![
              "Your session has expired or your account is disabled.",
              "Session expired or account disabled.",
            ].includes(e.message)
          )
            throw e;
          const profile = await backend!
            .from("profiles")
            .select("id,active")
            .eq("id", userId)
            .maybeSingle();
          if (stale() || closing.current) return;
          if (profile.error || profile.data) throw e;
          setNeedsProfile(true);
          const pending = await readPendingRegistration();
          if (stale() || closing.current) return;
          setPendingRegistration(
            pendingMatches(pending, data.session.user.email) ? pending : null,
          );
          if (
            !pendingMatches(pending, data.session.user.email) ||
            (!isRegistrationRole(pending?.role) &&
              !(pending?.role === "teacher" && pending.invitedTeacher))
          ) {
            setError(null);
            return;
          }
          await remoteRegister(pending!.name, pending!.role, pending!.code);
          await secureStorage.removeItem(PENDING_KEY);
          s = await remoteRead();
        }
        if (stale() || closing.current) return;
        setNeedsProfile(false);
        setPendingRegistration(null);
        setState(s);
        setActorId(data.session.user.id);
        const pending = await outbox.read(data.session.user.id);
        if (stale()) return;
        setPendingCount(pending.length);
      }
      setError(null);
    } catch (e) {
      if (stale() || closing.current) return;
      if (mode === "supabase") {
        const pending = await readPendingRegistration().catch(() => null);
        if (stale()) return;
        setPendingRegistration(pending);
      }
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    void backend?.auth.initialize().then(({ error }) => {
      if (error)
        setError(
          "Не удалось открыть ссылку. Запросите новое письмо и попробуйте снова.",
        );
    });
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        if (Platform.OS !== "web") backend?.auth.startAutoRefresh();
        void refresh();
      } else if (Platform.OS !== "web") backend?.auth.stopAutoRefresh();
    });
    const auth = backend?.auth.onAuthStateChange((event, session) => {
      if (!session) {
        // INITIAL_SESSION must not cancel the startup read of the confirmation draft.
        if (event !== "INITIAL_SESSION" && identity.current !== GUEST_ID)
          clearAccount();
      } else {
        if (
          identity.current !== session.user.id ||
          event === "PASSWORD_RECOVERY"
        ) {
          generation.current++;
          setState(null);
          setActorId(null);
          setPendingCount(0);
        }
        if (event === "PASSWORD_RECOVERY") setRecovering(true);
        setTimeout(() => void refresh(), 0);
      }
    });
    const openLink = (url: string) => {
      if (Platform.OS !== "web")
        void handleRecoveryLink(url)
          .then(() => refresh())
          .catch((e) => setError(errorMessage(e)));
    };
    if (Platform.OS !== "web")
      void Linking.getInitialURL().then((url) => {
        if (url) openLink(url);
      });
    const links = Linking.addEventListener("url", ({ url }) => openLink(url));
    return () => {
      sub.remove();
      links.remove();
      auth?.data.subscription.unsubscribe();
    };
  }, [refresh]);
  async function dispatch(cmd: Command) {
    if (closing.current) throw Error("Выход уже выполняется.");
    const ticket = generation.current;
    busy.current++;
    setSaving(true);
    try {
      const next =
        actorId === GUEST_ID
          ? await guestRepo.dispatch(cmd)
          : mode === "demo"
            ? await repo.dispatch(actorId!, cmd)
            : await outbox.submit(actorId!, cmd);
      if (ticket !== generation.current || closing.current) return;
      setState(next);
      setError(null);
    } catch (e) {
      if (ticket !== generation.current) throw e;
      setError(`Сохранение не подтверждено: ${errorMessage(e)}`);
      throw e;
    } finally {
      if (
        mode === "supabase" &&
        actorId !== GUEST_ID &&
        ticket === generation.current
      )
        setPendingCount((await outbox.read(actorId!).catch(() => [])).length);
      busy.current--;
      setSaving(busy.current > 0);
    }
  }
  async function switchAccount(id: string) {
    if (mode !== "demo" || actorId === GUEST_ID)
      throw Error("Для смены аккаунта сначала выйдите.");
    generation.current++;
    await AsyncStorage.setItem("espada.actor", id);
    setActorId(id);
    setError(null);
  }
  async function enterGuest() {
    if (closing.current || busy.current > 0) return;
    if (backend) {
      const { data, error } = await backend.auth.getSession();
      if (error) throw authFailure(error);
      if (data.session) throw Error("Сначала выйдите из аккаунта.");
    }
    const guestState = await guestRepo.read();
    await AsyncStorage.setItem(GUEST_ACTIVE_KEY, "1");
    clearAccount();
    identity.current = GUEST_ID;
    setPendingRegistration(null);
    setState(guestState);
    setActorId(GUEST_ID);
    setError(null);
    setLoading(false);
  }
  async function login(email: string, password: string, remember: boolean) {
    setError(null);
    if (!backend) throw Error("Backend is not configured.");
    setLoading(true);
    try {
      await setRememberMe(remember);
      const { error } = await backend.auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
      });
      if (error) throw authFailure(error);
      await refresh();
    } finally {
      setLoading(false);
    }
  }
  async function registerProfile(input: {
    name: string;
    role: Role;
    code?: string;
    email?: string;
    password?: string;
    remember?: boolean;
  }): Promise<"ready" | "confirmEmail"> {
    setError(null);
    const validate =
      mode === "supabase" && input.role === "teacher"
        ? validateInvitedTeacherRegistration
        : validateRegistration;
    input = validate(input);
    if (mode === "demo") {
      const id = await repo.registerProfile(input.name, input.role, input.code);
      await switchAccount(id);
      await refresh();
      return "ready";
    }
    if (!backend) throw Error("Backend is not configured.");
    const { data: existing } = await backend.auth.getSession();
    if (!existing.session) {
      await setRememberMe(input.remember ?? false);
      input = validate(input, true);
      if (!input.email || !input.password)
        throw Error("Укажите email и пароль.");
      const data = await confirmationMailer.send(input.email, async (email) => {
        const { data, error } = await backend!.auth.signUp({
          email,
          password: input.password!,
          options: {
            emailRedirectTo:
              Platform.OS === "web"
                ? webAuthRedirect(window.location)
                : undefined,
          },
        });
        if (error) throw error;
        if (!data.session && data.user?.identities?.length === 0)
          throw new AuthFlowError(
            "Не удалось создать аккаунт. Попробуйте войти или восстановить пароль.",
            "user_already_exists",
          );
        return data;
      });
      if (!data.session) {
        const pending: PendingRegistration = {
          name: input.name,
          role: input.role,
          code: input.code,
          email: normalizeEmail(input.email),
          ...(input.role === "teacher"
            ? { invitedTeacher: true as const }
            : {}),
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
      email: normalizeEmail(email),
      token: token.trim(),
      type: "signup",
    });
    if (error) throw authFailure(error);
    await refresh();
  }
  async function resendConfirmation(email: string) {
    if (!backend) throw Error("Backend is not configured.");
    await confirmationMailer.send(email, async (address) => {
      const { error } = await backend!.auth.resend({
        type: "signup",
        email: address,
        options: {
          emailRedirectTo:
            Platform.OS === "web"
              ? webAuthRedirect(window.location)
              : undefined,
        },
      });
      if (error) throw error;
    });
  }
  async function requestRecovery(email: string) {
    if (!backend) throw Error("Backend is not configured.");
    await confirmationMailer.send(email, async (address) => {
      const { error } = await backend!.auth.resetPasswordForEmail(address, {
        redirectTo: recoveryRedirect(),
      });
      if (
        error &&
        !["user_not_found", "email_not_found"].includes(error.code ?? "")
      )
        throw error;
    });
  }
  async function confirmRecovery(email: string, token: string) {
    if (!backend) throw Error("Backend is not configured.");
    const { error } = await backend.auth.verifyOtp({
      email: normalizeEmail(email),
      token: token.trim(),
      type: "recovery",
    });
    if (error) throw authFailure(error);
    await refresh();
  }
  async function signOut() {
    if (closing.current) return;
    if (busy.current > 0) {
      setError("Дождитесь сохранения данных и повторите выход.");
      return;
    }
    closing.current = true;
    try {
      if (actorId === GUEST_ID) {
        await AsyncStorage.removeItem(GUEST_ACTIVE_KEY);
        clearAccount();
        setPendingRegistration(null);
        setError(null);
        return;
      }
      if (actorId && mode === "supabase") {
        try {
          await progressOutbox.flush(actorId);
        } catch {
          setError(
            "Ответы ещё не отправлены. Проверьте соединение и повторите выход.",
          );
          return;
        }
        const pending = await outbox.read(actorId);
        if (pending.length) {
          try {
            await outbox.retry(actorId);
          } catch {
            setError(
              "Не удалось отправить учебные данные. Проверьте соединение и повторите выход.",
            );
            return;
          }
        }
      }
      // SDK 2.117.1 also clears its in-memory session on logout network errors.
      const result = await backend?.auth.signOut({ scope: "local" });
      await authStorage.clear();
      await clearRecovery();
      await secureStorage.removeItem(PENDING_KEY);
      clearAccount();
      setPendingRegistration(null);
      setError(
        result?.error
          ? "Вы вышли на этом устройстве. Сервер не подтвердил завершение сессии."
          : null,
      );
    } catch (e) {
      setError(errorMessage(e));
      throw e;
    } finally {
      closing.current = false;
    }
  }
  async function updatePassword(password: string) {
    await saveNewPassword(password);
    await signOut();
  }
  const actor = state?.profiles.find((p) => p.id === actorId && p.active);
  const visibleState = useMemo(
    () => (state && actor ? scopedState(state, actor) : null),
    [state, actor],
  );
  if (!state || !actor || recovering)
    return (
      <>
        {fallback({
          loading,
          error,
          retry: () => {
            setLoading(true);
            void refresh();
          },
          login,
          enterGuest,
          hasSession,
          pendingRegistration,
          registerProfile,
          confirmEmail,
          resendConfirmation,
          emailCooldown: confirmationMailer.remaining,
          recovering,
          needsProfile,
          requestRecovery,
          confirmRecovery,
          updatePassword,
          leaveRegistration: signOut,
        })}
      </>
    );
  return (
    <Ctx.Provider
      value={{
        state: visibleState!,
        actor,
        accounts:
          mode === "demo" && actorId !== GUEST_ID
            ? state.profiles.filter((p) => p.active)
            : [actor],
        dispatch,
        switchAccount,
        refresh,
        signOut,
        saving,
        pendingCount,
        retryPending: async () => {
          if (closing.current || actorId === GUEST_ID || mode !== "supabase")
            return;
          const ticket = generation.current;
          busy.current++;
          setSaving(true);
          try {
            const next = await outbox.retry(actorId!);
            if (ticket !== generation.current) return;
            setState(next);
            setError(null);
          } catch (e) {
            if (ticket !== generation.current) return;
            setError(`Ожидает отправки: ${errorMessage(e)}`);
          } finally {
            busy.current--;
            if (ticket !== generation.current) return;
            setPendingCount(
              (await outbox.read(actorId!).catch(() => [])).length,
            );
            setSaving(false);
          }
        },
        error,
        clearError: () => setError(null),
        mode: actorId === GUEST_ID ? "guest" : mode,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
