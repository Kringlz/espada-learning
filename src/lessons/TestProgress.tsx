import { useUITheme } from "../components/ui";
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import {
  Button,
  Card,
  Disclosure,
  Notice,
  Txt,
  colors,
  dateText,
} from "../components/ui";
import { useLearning } from "../services/context";
import { lessonService } from "./service";
import { AttemptSummary } from "./types";

export function TestProgress({
  active,
  open,
}: {
  active: boolean;
  open: (id: string) => void;
}) {
  const { colors, styles } = useUITheme();
  const { actor } = useLearning();
  const api = useMemo(() => lessonService(actor.id), [actor.id]);
  const [rows, setRows] = useState<AttemptSummary[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setBusy(true);
    setError("");
    api
      .history(null)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setError("Не удалось загрузить результаты тестов.");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, active, refresh]);
  const row = (a: AttemptSummary) => (
    <View key={a.id} style={{ gap: 8, paddingVertical: 10 }}>
      <Txt weight="700">{a.lesson.title}</Txt>
      <Txt color={colors.muted}>
        {a.status === "submitted"
          ? `${a.score} из 10 · ${dateText(a.submittedAt!)}`
          : "Ты ещё не закончил этот тест"}
      </Txt>
      <Button
        secondary
        small
        icon={a.status === "submitted" ? "check-circle" : "play"}
        onPress={() => open(a.id)}
      >
        {a.status === "submitted" ? "Разобрать результат" : "Продолжить тест"}
      </Button>
    </View>
  );
  return (
    <Card>
      <Txt size={22} weight="700">
        Мои тесты
      </Txt>
      {busy ? (
        <Txt color={colors.muted}>Загружаем результаты…</Txt>
      ) : error ? (
        <>
          <Notice tone="error">{error}</Notice>
          <Button secondary onPress={() => setRefresh((n) => n + 1)}>
            Повторить загрузку
          </Button>
        </>
      ) : rows.length ? (
        <>
          {rows.slice(0, 3).map(row)}
          {rows.length > 3 && (
            <Disclosure
              title={`Другие попытки · ${rows.length - 3}`}
              icon="clock"
            >
              {rows.slice(3).map(row)}
            </Disclosure>
          )}
        </>
      ) : (
        <Txt color={colors.muted}>
          После первого теста здесь появится результат.
        </Txt>
      )}
    </Card>
  );
}
