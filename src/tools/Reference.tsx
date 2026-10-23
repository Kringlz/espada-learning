import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Pressable, TextInput, View } from "react-native";
import { Icon, Txt, useUITheme } from "../components/ui";
import { ScreenAnchor, ScreenScroll } from "../components/ScreenScroll";
import { referenceItems, referenceTopics } from "./reference/data";
import { searchReference } from "./reference/search";
import { ReferenceRecord } from "./reference/ReferenceRecord";
export { referenceItems } from "./reference/data";

type Mode = "catalog" | "topic" | "search";
export function Reference() {
  const { colors, dark } = useUITheme();
  const accent = dark ? "#A8D5B8" : "#326B4B";
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string>();
  const [mode, setMode] = useState<Mode>("catalog");
  const [width, setWidth] = useState(0);
  const input = useRef<TextInput>(null);
  const topicNodes = useRef<Record<string, View | null>>({});
  const lastTopic = useRef<string | undefined>(undefined);
  const previousMode = useRef<Mode>("catalog");
  const toTop = useContext(ScreenScroll);
  const toAnchor = useContext(ScreenAnchor);
  useEffect(() => {
    const returning = mode === "catalog" && previousMode.current !== "catalog";
    previousMode.current = mode;
    const frame = requestAnimationFrame(() => {
      if (returning && lastTopic.current)
        toAnchor(topicNodes.current[lastTopic.current]);
      else if (mode !== "catalog" || returning) toTop();
    });
    return () => cancelAnimationFrame(frame);
  }, [mode, topic, toAnchor, toTop]);
  const results = useMemo(
    () =>
      mode === "topic" ? searchReference("", topic) : searchReference(query),
    [mode, topic, query],
  );
  const counts = useMemo(
    () =>
      Object.fromEntries(
        referenceTopics.map((t) => [
          t.id,
          referenceItems.filter((e) => e.topic === t.id).length,
        ]),
      ),
    [],
  );
  const wide = width >= 880;
  const showCatalog = mode === "catalog";
  const currentTopic = referenceTopics.find((t) => t.id === topic);
  function chooseTopic(id: string) {
    Keyboard.dismiss();
    lastTopic.current = id;
    setTopic(id);
    setMode("topic");
    // A repeated click on the current sidebar topic still returns to its start.
    if (mode === "topic" && topic === id) toTop();
  }
  function showTopics() {
    Keyboard.dismiss();
    setMode("catalog");
  }
  function clearSearch() {
    setQuery("");
    if (mode === "search") setMode("catalog");
    input.current?.focus();
  }
  const button = (
    label: string,
    action: () => void,
    back = false,
    testID?: string,
  ) => (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={action}
      style={({ pressed }) => ({
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        alignSelf: "flex-start",
        opacity: pressed ? 0.65 : 1,
      })}
    >
      {back && <Icon name="arrow-left" size={18} color={accent} />}
      <Txt size={15} weight="600" color={accent}>
        {label}
      </Txt>
    </Pressable>
  );
  const topics = (sidebar = false) => (
    <View
      style={{
        flexDirection: sidebar ? "column" : "row",
        flexWrap: sidebar ? "nowrap" : "wrap",
        gap: sidebar ? 2 : 10,
      }}
    >
      {referenceTopics.map((t) => (
        <Pressable
          key={t.id}
          ref={(node) => {
            if (!sidebar) topicNodes.current[t.id] = node;
          }}
          accessibilityRole="button"
          accessibilityLabel={`Тема: ${t.title}`}
          accessibilityState={{ selected: mode === "topic" && topic === t.id }}
          onPress={() => chooseTopic(t.id)}
          style={({ pressed }) => ({
            width: sidebar ? "100%" : width >= 600 ? "31%" : "47%",
            flexGrow: sidebar ? 0 : 1,
            minWidth: 0,
            minHeight: 44,
            padding: sidebar ? 12 : 15,
            borderRadius: sidebar ? 10 : 16,
            borderWidth: sidebar ? 0 : 1,
            borderColor: colors.line,
            backgroundColor: sidebar
              ? mode === "topic" && topic === t.id
                ? colors.subtle
                : "transparent"
              : colors.white,
            opacity: pressed ? 0.7 : 1,
            gap: 10,
          })}
        >
          {!sidebar && (
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Txt size={12} weight="700" color={accent}>
                {t.symbol}
              </Txt>
              <Txt size={12} color={colors.muted}>
                {counts[t.id]}
              </Txt>
            </View>
          )}
          <Txt
            size={sidebar ? 14 : 15}
            weight="600"
            color={mode === "topic" && topic === t.id ? accent : colors.ink}
          >
            {t.title}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
  return (
    <View
      testID="reference"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ gap: 18, minWidth: 0, width: "100%" }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <Txt size={24} weight="700" accessibilityRole="header">
          Справочник
        </Txt>
        {showCatalog && (
          <Txt size={13} color={colors.muted}>
            {referenceTopics.length} тем
          </Txt>
        )}
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.white,
          borderRadius: 15,
          paddingLeft: 14,
          minHeight: 52,
          gap: 10,
        }}
      >
        <Icon name="search" color={accent} size={20} />
        <TextInput
          ref={input}
          accessibilityLabel="Поиск по справочнику"
          placeholder="Найти формулу"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            setMode(value.trim() ? "search" : "catalog");
          }}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={() => {
            Keyboard.dismiss();
            if (query.trim()) setMode("search");
          }}
          style={{
            color: colors.ink,
            fontSize: 16,
            flex: 1,
            minWidth: 0,
            paddingVertical: 14,
          }}
        />
        {!!query && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Очистить поиск"
            onPress={clearSearch}
            style={{
              minWidth: 44,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="x" size={18} color={accent} />
          </Pressable>
        )}
      </View>
      {showCatalog ? (
        <>
          {!!query.trim() &&
            button("Результаты", () => {
              setMode("search");
              Keyboard.dismiss();
            })}
          {topics()}
        </>
      ) : (
        <View
          style={{
            flexDirection: wide ? "row" : "column",
            gap: wide ? 40 : 8,
            minWidth: 0,
          }}
        >
          {wide && (
            <View style={{ width: 216, gap: 8 }}>
              {button("Темы", showTopics, true, "reference-topics")}
              {topics(true)}
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0, maxWidth: 720 }}>
            {!wide && button("Темы", showTopics, true, "reference-topics")}
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                gap: 12,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: colors.line,
              }}
            >
              <Txt
                size={21}
                weight="700"
                style={{ flex: 1 }}
                accessibilityRole="header"
              >
                {mode === "search" ? "Результаты" : currentTopic?.title}
              </Txt>
              <Txt
                size={14}
                color={colors.muted}
                accessibilityLiveRegion="polite"
                accessibilityLabel={`Найдено записей: ${results.length}`}
              >
                {results.length}
              </Txt>
            </View>
            {results.length === 0 ? (
              <View style={{ paddingVertical: 28, gap: 10 }}>
                <Txt size={20} weight="600" accessibilityLiveRegion="polite">
                  Ничего не найдено
                </Txt>
                {button("Сбросить", clearSearch)}
              </View>
            ) : (
              results.map((item) => (
                <ReferenceRecord
                  key={item.id}
                  item={item}
                  showTopic={mode === "search"}
                />
              ))
            )}
            {results.length > 0 &&
              button("Темы", showTopics, true, "reference-topics-bottom")}
          </View>
        </View>
      )}
    </View>
  );
}
