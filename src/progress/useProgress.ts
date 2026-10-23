import { useEffect, useState, useCallback } from "react";
import { AppState } from "react-native";
import { ProgressData } from "./model";
import { readProgress } from "./service";
export function useProgress(actor: string, student: string) {
  const [data, setData] = useState<ProgressData | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [epoch, setEpoch] = useState(0);
  const refresh = useCallback(() => setEpoch((n) => n + 1), []);
  useEffect(() => {
    setData(null);
  }, [actor, student]);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    readProgress(actor, student)
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (
          live &&
          /Нет доступа|expired|disabled|permission|JWT/i.test(e.message)
        )
          setData(null);
        if (live)
          setError(
            typeof navigator !== "undefined" && !navigator.onLine
              ? "Нет связи. Данные недоступны."
              : `Не удалось загрузить прогресс: ${e.message}`,
          );
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [actor, student, epoch]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refresh();
    });
    const timer = setInterval(refresh, 60000);
    if (typeof window !== "undefined")
      window.addEventListener("online", refresh);
    return () => {
      sub.remove();
      clearInterval(timer);
      if (typeof window !== "undefined")
        window.removeEventListener("online", refresh);
    };
  }, [refresh]);
  return { data, error, loading, refresh };
}
