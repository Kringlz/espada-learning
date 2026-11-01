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
  DEFAULT_REMINDER,
  type ReminderSettings,
  type ReminderState,
} from "./model";
import { reminders, remindersSupported } from "./service";

const Context = createContext<{
  state: ReminderState;
  ready: boolean;
  busy: boolean;
  error: string;
  notice: string;
  update: (settings: ReminderSettings) => void;
  retry: () => void;
  test: () => void;
} | null>(null);
export function ReminderProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ReminderState>({
    settings: { ...DEFAULT_REMINDER },
    permission: "undetermined",
    active: false,
  });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const sequence = useRef(0);
  const run = useCallback(
    async (action: () => Promise<ReminderState | void>, message = "") => {
      const id = ++sequence.current;
      setBusy(true);
      setError("");
      setNotice("");
      try {
        const next = await action();
        if (id !== sequence.current) return;
        if (next) {
          setState(next);
          setReady(true);
        }
        setNotice(message);
      } catch {
        if (id === sequence.current)
          setError(
            "Не удалось обновить напоминания. Прежнее расписание могло сохраниться. Проверь настройки уведомлений и повтори попытку.",
          );
      } finally {
        if (id === sequence.current) setBusy(false);
      }
    },
    [],
  );
  const retry = useCallback(() => {
    void run(() => reminders.refresh());
  }, [run]);
  useEffect(() => {
    if (!remindersSupported) return;
    retry();
    const sub = AppState.addEventListener("change", (value) => {
      if (value === "active") retry();
    });
    return () => {
      sub.remove();
      sequence.current++;
    };
  }, [retry]);
  return (
    <Context.Provider
      value={{
        state,
        ready,
        busy,
        error,
        notice,
        retry,
        update: (settings) => {
          void run(() => reminders.update(settings));
        },
        test: () => {
          void run(
            () => reminders.sendTest(),
            "Проверочное уведомление запланировано примерно через 10 секунд. Можно свернуть приложение.",
          );
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useReminders() {
  const value = useContext(Context);
  if (!value) throw Error("ReminderProvider missing");
  return value;
}
