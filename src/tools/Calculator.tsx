import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Reference } from "./Reference";
import { ChoiceTabs } from "../components/ChoiceTabs";
import {
  Button,
  Card,
  Disclosure,
  Icon,
  Txt,
  useUITheme,
} from "../components/ui";
import { useLearning } from "../services/context";
import { calculate, formatNumber } from "./arithmetic";

type Entry = { expression: string; result: number };
const keys = [
  "(",
  ")",
  "√",
  "AC",
  "7",
  "8",
  "9",
  "÷",
  "4",
  "5",
  "6",
  "×",
  "1",
  "2",
  "3",
  "−",
  "0",
  ",",
  "%",
  "+",
  "π",
  "^",
  "⌫",
  "=",
];
export function Calculator() {
  const { colors } = useUITheme();
  const { actor } = useLearning();
  const [view, setView] = useState<"calculator" | "reference" | "history">(
    "calculator",
  );
  const [expression, setExpression] = useState("");
  const [previous, setPrevious] = useState(0);
  const [history, setHistory] = useState<Entry[]>([]);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const queue = useRef(Promise.resolve());
  const input = useRef<TextInput>(null);
  const key = `espada.calculator.v1:${actor.id}`;
  useEffect(() => {
    let live = true;
    void AsyncStorage.getItem(key)
      .then((raw) => {
        const data: unknown = raw ? JSON.parse(raw) : [];
        if (live && Array.isArray(data)) {
          const entries = data
            .filter(
              (x): x is Entry =>
                typeof x?.expression === "string" && Number.isFinite(x?.result),
            )
            .slice(0, 20);
          setHistory(entries);
          setPrevious(entries[0]?.result ?? 0);
        }
      })
      .catch(() => {
        if (live)
          setMessage("История недоступна. Калькулятор продолжает работать.");
      })
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, [key]);
  const preview = useMemo(() => {
    try {
      return expression ? formatNumber(calculate(expression, previous)) : "0";
    } catch {
      return "…";
    }
  }, [expression, previous]);
  function save(next: Entry[]) {
    setHistory(next);
    queue.current = queue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(key, JSON.stringify(next)));
    void queue.current.catch(() =>
      setMessage("Не удалось сохранить историю на устройстве."),
    );
  }
  function solve() {
    if (!ready) return;
    try {
      const result = calculate(expression, previous);
      setPrevious(result);
      setMessage("");
      save(
        [
          { expression: expression.replace(/ans/g, `(${previous})`), result },
          ...history,
        ].slice(0, 20),
      );
      setExpression(String(result));
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  function press(value: string) {
    setMessage("");
    if (value === "=") return solve();
    if (value === "AC") return setExpression("");
    if (value === "⌫") return setExpression((s) => s.slice(0, -1));
    setExpression((s) => (s + (value === "√" ? "sqrt(" : value)).slice(0, 240));
  }
  return (
    <View style={{ gap: 18 }}>
      <Txt size={28} weight="800">
        Инструменты
      </Txt>
      <ChoiceTabs
        label="Инструменты"
        value={view}
        onChange={setView}
        options={[
          ["calculator", "Считать"],
          ["reference", "Формулы"],
          ["history", "История"],
        ]}
      />
      {view === "reference" && <Reference />}
      {view === "calculator" && (
        <Card
          style={{ width: "100%", maxWidth: 480, alignSelf: "center", gap: 14 }}
        >
          <View
            style={{
              backgroundColor: colors.subtle,
              padding: 18,
              borderRadius: 18,
              gap: 8,
            }}
          >
            <TextInput
              ref={input}
              accessibilityLabel="Математическое выражение"
              value={expression}
              onChangeText={setExpression}
              maxLength={240}
              placeholder="(24 + 6) ÷ 5"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={solve}
              style={{
                color: colors.ink,
                fontSize: 21,
                minHeight: 48,
                textAlign: "right",
              }}
            />
            <Txt
              size={38}
              weight="800"
              style={{ textAlign: "right" }}
              accessibilityLiveRegion="polite"
            >
              {preview}
            </Txt>
          </View>
          {!!message && (
            <Txt color={colors.red} size={14} accessibilityRole="alert">
              {message}
            </Txt>
          )}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {keys.map((k) => (
              <Pressable
                key={k}
                accessibilityRole="button"
                accessibilityLabel={
                  k === "⌫"
                    ? "Удалить символ"
                    : k === "AC"
                      ? "Очистить выражение"
                      : k === "="
                        ? "Вычислить"
                        : k
                }
                disabled={!ready && k === "="}
                onPress={() => press(k)}
                style={({ pressed }) => ({
                  width: "23%",
                  flexGrow: 1,
                  minHeight: 54,
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: 14,
                  backgroundColor:
                    k === "="
                      ? colors.primary
                      : /^\d$/.test(k)
                        ? colors.subtle
                        : colors.light,
                  opacity: pressed ? 0.65 : 1,
                })}
              >
                <Txt
                  size={23}
                  weight="700"
                  color={k === "=" ? colors.onPrimary : colors.ink}
                >
                  {k}
                </Txt>
              </Pressable>
            ))}
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Button
              small
              secondary
              label="Подставить предыдущий ответ"
              onPress={() => {
                setExpression((s) => s + "ans");
                input.current?.focus();
              }}
            >
              Ans
            </Button>
            <Txt size={13} color={colors.muted}>
              Предыдущий ответ
            </Txt>
          </View>
          <Disclosure title="Как считать" icon="help-circle">
            <Txt size={15}>
              15% = 15 ÷ 100. Степень: 2^3. Между множителями ставь ×.
            </Txt>
          </Disclosure>
        </Card>
      )}
      {view === "history" && (
        <Card style={{ gap: 12 }}>
          {!history.length && (
            <View style={{ alignItems: "center", gap: 16, padding: 30 }}>
              <Icon name="clock" size={40} color={colors.green} />
              <Txt color={colors.muted}>Здесь появятся твои вычисления</Txt>
            </View>
          )}
          {history.map((entry, i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`Повторить ${entry.expression}`}
              onPress={() => {
                setExpression(entry.expression);
                setView("calculator");
              }}
              style={{
                borderBottomWidth: 1,
                borderColor: colors.line,
                paddingVertical: 12,
                gap: 4,
              }}
            >
              <Txt size={15} color={colors.muted}>
                {entry.expression}
              </Txt>
              <Txt size={22} weight="700">
                = {formatNumber(entry.result)}
              </Txt>
            </Pressable>
          ))}
          {!!history.length && (
            <Button small secondary icon="trash-2" onPress={() => save([])}>
              Очистить историю
            </Button>
          )}
        </Card>
      )}
    </View>
  );
}
