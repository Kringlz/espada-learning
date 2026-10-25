import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Formula } from "../math/Formula";
import { expressionLatex } from "./expressionEditor";
import { formatNumber } from "./arithmetic";
import { Reference } from "./Reference";
import { ChoiceTabs } from "../components/ChoiceTabs";
import { Button, Card, Icon, Txt, useUITheme } from "../components/ui";
import { useLearning } from "../services/context";

type Entry = { expression: string; result: number };
export function FormulaTools() {
  const { actor } = useLearning();
  return <AccountFormulas key={actor.id} actorId={actor.id} />;
}
function AccountFormulas({ actorId }: { actorId: string }) {
  const { colors } = useUITheme();
  const [view, setView] = useState<"reference" | "history">("reference");
  const [history, setHistory] = useState<Entry[]>([]);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const queue = useRef(Promise.resolve());
  // Keep existing calculation history readable; no calculation or replay actions remain.
  const key = `espada.calculator.v1:${actorId}`;
  useEffect(() => {
    let live = true;
    void AsyncStorage.getItem(key)
      .then((raw) => {
        const data: unknown = raw ? JSON.parse(raw) : [];
        if (live && Array.isArray(data))
          setHistory(
            data
              .filter(
                (entry): entry is Entry =>
                  typeof entry?.expression === "string" &&
                  Number.isFinite(entry?.result),
              )
              .slice(0, 20),
          );
      })
      .catch(() => {
        if (live) setMessage("Не удалось загрузить историю.");
      })
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, [key]);
  function clearHistory() {
    setHistory([]);
    queue.current = queue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(key, "[]"));
    void queue.current.catch(() => setMessage("Не удалось очистить историю."));
  }
  return (
    <View testID="formula-tools" style={{ gap: 18, minWidth: 0 }}>
      <ChoiceTabs
        label="Формулы и история"
        value={view}
        onChange={setView}
        options={[
          ["reference", "Формулы"],
          ["history", "История"],
        ]}
      />
      {view === "reference" ? (
        <Reference />
      ) : (
        <Card style={{ gap: 12 }}>
          {!!message && (
            <Txt color={colors.red} accessibilityRole="alert">
              {message}
            </Txt>
          )}
          {!history.length && (
            <View style={{ alignItems: "center", gap: 16, padding: 30 }}>
              <Icon name="clock" size={40} color={colors.green} />
              <Txt color={colors.muted}>
                {ready ? "История пуста" : "Загрузка…"}
              </Txt>
            </View>
          )}
          {history.map((entry, i) => (
            <View
              key={i}
              style={{
                borderBottomWidth: 1,
                borderColor: colors.line,
                paddingVertical: 12,
                gap: 4,
              }}
            >
              <Formula
                latex={expressionLatex(entry.expression)}
                source={entry.expression}
                size={21}
                color={colors.muted}
              />
              <Txt size={22} weight="700" selectable>
                = {formatNumber(entry.result)}
              </Txt>
            </View>
          ))}
          {!!history.length && (
            <Button small secondary icon="trash-2" onPress={clearHistory}>
              Очистить историю
            </Button>
          )}
        </Card>
      )}
    </View>
  );
}
