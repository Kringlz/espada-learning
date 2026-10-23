import { Formula } from "../math/Formula";
import { MathText } from "../math/MathText";
import { useSounds } from "../engagement/Sounds";
import { editExpression, expressionLatex, Selection } from "./expressionEditor";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Pressable, ScrollView, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Reference } from "./Reference";
import { ChoiceTabs } from "../components/ChoiceTabs";
import { Button, Card, Icon, Txt, useUITheme } from "../components/ui";
import { useLearning } from "../services/context";
import { calculate, formatNumber } from "./arithmetic";

type Entry = { expression: string; result: number };
const keyRows = [
  ["(", ")", "√", "AC"],
  ["a/b", "^", "π", "⇥"],
  ["7", "8", "9", "÷"],
  ["4", "5", "6", "×"],
  ["1", "2", "3", "−"],
  ["0", ",", "%", "+"],
  ["⌫", "="],
];
const keyLabels: Record<string, string> = {
  "a/b": "Вставить дробь",
  "⇥": "К следующему полю выражения",
  "(": "Открыть скобку",
  ")": "Закрыть скобку",
  "√": "Квадратный корень",
  AC: "Очистить выражение",
  "÷": "Разделить",
  "×": "Умножить",
  "−": "Вычесть",
  ",": "Десятичная запятая",
  "%": "Процент",
  "+": "Прибавить",
  π: "Число пи",
  "^": "Возвести в степень",
  "⌫": "Удалить символ",
  "=": "Вычислить",
};
export function Calculator() {
  const { actor } = useLearning();
  // A new account gets fresh input and history even while storage is loading.
  return <AccountCalculator key={actor.id} actorId={actor.id} />;
}
function AccountCalculator({ actorId }: { actorId: string }) {
  const { colors } = useUITheme();
  const { play } = useSounds();
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
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
  const resultScroll = useRef<ScrollView>(null);
  const [resultWidth, setResultWidth] = useState(0);
  const key = `espada.calculator.v1:${actorId}`;
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
      setSelection({
        start: String(result).length,
        end: String(result).length,
      });
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  function press(value: string) {
    input.current?.blur();
    Keyboard.dismiss();
    play("open");
    setMessage("");
    if (value === "=") return solve();
    const next = editExpression(expression, selection, value);
    setExpression(next.text);
    setSelection(next.selection);
  }
  return (
    <View testID="calculator" style={{ gap: 18, minWidth: 0 }}>
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
          style={{
            width: "100%",
            maxWidth: 480,
            minWidth: 0,
            alignSelf: "center",
            gap: 14,
          }}
        >
          <View
            style={{
              backgroundColor: colors.subtle,
              padding: 18,
              borderRadius: 18,
              gap: 8,
            }}
          >
            <View
              testID="calculator-formula"
              style={{
                minHeight: 64,
                justifyContent: "center",
                alignItems: "flex-end",
              }}
            >
              <Formula
                latex={expressionLatex(expression)}
                source={expression || "0"}
                size={30}
                color={colors.ink}
              />
            </View>
            <TextInput
              ref={input}
              accessibilityLabel="Математическое выражение"
              value={expression}
              selection={selection}
              onSelectionChange={(event) =>
                setSelection(event.nativeEvent.selection)
              }
              onChangeText={(text) => {
                setExpression(text);
                setMessage("");
              }}
              maxLength={240}
              placeholder="(1 + 2) / √(9)"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={solve}
              style={{
                width: "100%",
                minWidth: 0,
                color: colors.muted,
                fontSize: 16,
                minHeight: 48,
                textAlign: "right",
              }}
            />
            <ScrollView
              ref={resultScroll}
              testID="calculator-result-scroll"
              horizontal
              onLayout={(event) =>
                setResultWidth(event.nativeEvent.layout.width)
              }
              onContentSizeChange={() =>
                resultScroll.current?.scrollTo({ x: 0, animated: false })
              }
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "flex-end",
                alignItems: "center",
              }}
              style={{ minHeight: 54 }}
            >
              <Txt
                testID="calculator-result"
                size={
                  resultWidth
                    ? Math.min(
                        38,
                        Math.max(16, resultWidth / (preview.length * 0.64)),
                      )
                    : 38
                }
                weight="800"
                numberOfLines={1}
                selectable
                style={{
                  textAlign: "right",
                  lineHeight: 54,
                  fontVariant: ["tabular-nums"],
                }}
                accessibilityLabel={`Результат: ${preview}`}
                accessibilityLiveRegion="polite"
              >
                {preview}
              </Txt>
            </ScrollView>
          </View>
          {!!message && (
            <Txt color={colors.red} size={14} accessibilityRole="alert">
              {message}
            </Txt>
          )}
          <Txt size={12} color={colors.muted}>
            Дробь и корень — кнопками. ⇥ — следующее пустое поле. Выражение
            можно править с клавиатуры.
          </Txt>
          <View testID="calculator-keypad" style={{ gap: 8 }}>
            {keyRows.map((row, index) => (
              <View key={index} style={{ flexDirection: "row", gap: 8 }}>
                {row.map((k) => (
                  <Pressable
                    key={k}
                    accessibilityRole="button"
                    accessibilityLabel={keyLabels[k] ?? k}
                    accessibilityState={{ disabled: !ready && k === "=" }}
                    disabled={!ready && k === "="}
                    onPress={() => press(k)}
                    style={({ pressed }) => ({
                      flex: 1,
                      minWidth: 0,
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
                      opacity: pressed || (!ready && k === "=") ? 0.65 : 1,
                    })}
                  >
                    {k === "a/b" ? (
                      <Formula
                        latex={"\\frac{a}{b}"}
                        source="Дробь"
                        size={22}
                        color={colors.ink}
                      />
                    ) : (
                      <Txt
                        size={23}
                        weight="700"
                        color={k === "=" ? colors.onPrimary : colors.ink}
                      >
                        {k}
                      </Txt>
                    )}
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
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
                setMessage("");
                setExpression(entry.expression);
                setSelection({
                  start: entry.expression.length,
                  end: entry.expression.length,
                });
                setView("calculator");
              }}
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
              <Txt size={22} weight="700" style={{ flexShrink: 1 }}>
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
