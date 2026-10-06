import { useUITheme } from "../components/ui";
import React, { useState } from "react";
import { Image, Platform, ScrollView, Text, View } from "react-native";
import { ContentBlock } from "./content";
import { RichText } from "./RichText";
import { figureAssets } from "./figureAssets";
import { Button, colors, Txt, Icon, Disclosure } from "../components/ui";

export function CourseContent({
  blocks,
  nested = false,
  emphasis = false,
}: {
  blocks: ContentBlock[];
  nested?: boolean;
  emphasis?: boolean;
}) {
  const { colors, styles } = useUITheme();
  return (
    <View style={{ gap: nested ? 16 : 28 }}>
      {blocks.map((block, i) => (
        <Block key={i} block={block} emphasis={emphasis} />
      ))}
    </View>
  );
}
function Figure({
  block,
}: {
  block: Extract<ContentBlock, { kind: "figure" }>;
}) {
  const { colors, styles } = useUITheme();
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  return (
    <View
      style={{
        gap: 8,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: colors.light,
        padding: 12,
      }}
    >
      {error ? (
        <>
          <Txt accessibilityRole="alert">Не удалось загрузить чертёж.</Txt>
          <Button
            secondary
            onPress={() => {
              setError(false);
              setRetry((n) => n + 1);
            }}
          >
            Повторить загрузку
          </Button>
        </>
      ) : (
        <Image
          key={retry}
          source={figureAssets[block.asset]}
          accessibilityLabel={block.alt}
          accessible
          resizeMode="contain"
          onError={() => setError(true)}
          style={{
            width: "100%",
            aspectRatio: block.width / block.height,
            maxWidth: block.width / 1.5,
            alignSelf: "center",
          }}
        />
      )}
    </View>
  );
}
function Block({
  block,
  emphasis = false,
}: {
  block: ContentBlock;
  emphasis?: boolean;
}) {
  const { colors, styles } = useUITheme();
  if (block.kind === "calculation")
    return (
      <View
        style={{ padding: 20, borderRadius: 12, backgroundColor: colors.light }}
      >
        <ScrollView horizontal>
          <Text
            selectable
            accessibilityLabel="Вычисление столбиком"
            style={{
              fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
              fontSize: 22,
              lineHeight: 32,
              color: colors.green,
            }}
          >
            {block.text}
          </Text>
        </ScrollView>
      </View>
    );
  if (block.kind === "equation")
    return (
      <View
        role="math"
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 14,
          padding: 18,
          borderRadius: 12,
          backgroundColor: colors.light,
        }}
      >
        {block.parts.map((part, i) =>
          part.kind === "text" ? (
            <RichText key={i} runs={part.runs} size={22} color={colors.green} />
          ) : (
            <View key={i} style={{ alignItems: "stretch" }}>
              <View
                style={{
                  alignItems: "center",
                  borderBottomWidth: 1.5,
                  borderColor: colors.green,
                  paddingHorizontal: 7,
                }}
              >
                <RichText
                  runs={part.numerator}
                  size={22}
                  color={colors.green}
                />
              </View>
              <View style={{ alignItems: "center", paddingHorizontal: 7 }}>
                <RichText
                  runs={part.denominator}
                  size={22}
                  color={colors.green}
                />
              </View>
            </View>
          ),
        )}
      </View>
    );
  if (block.kind === "figure") return <Figure block={block} />;
  if (
    block.kind === "callout" &&
    block.blocks[0] &&
    "runs" in block.blocks[0] &&
    block.blocks[0].runs
      .map((r) => r.text)
      .join("")
      .includes("ПОСЛЕ ИЗУЧЕНИЯ")
  )
    return (
      <Disclosure title="Чему научимся" icon="flag">
        <CourseContent blocks={block.blocks.slice(1)} nested />
      </Disclosure>
    );
  if (block.kind === "callout" || block.kind === "example")
    return (
      <View
        style={{
          padding: 20,
          gap: 14,
          borderRadius: 14,
          backgroundColor:
            block.kind === "example" ? colors.warning : colors.light,
          borderWidth: 1,
          borderColor: block.kind === "example" ? colors.line : colors.line,
          borderLeftWidth: 4,
          borderLeftColor:
            block.kind === "example" ? colors.gold : colors.green,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon
            name={block.kind === "example" ? "edit-3" : "bookmark"}
            size={18}
            color={block.kind === "example" ? colors.orange : colors.green}
          />
          <Txt
            size={13}
            weight="700"
            color={block.kind === "example" ? colors.orange : colors.green}
          >
            {block.kind === "example" ? "Разберём пример" : "Запомни"}
          </Txt>
        </View>
        <CourseContent blocks={block.blocks} nested />
      </View>
    );
  if (block.kind === "table")
    return (
      <ScrollView
        horizontal
        style={{
          maxWidth: "100%",
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: 12,
        }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View
          style={{ flex: 1, minWidth: block.rows[0].length * 135 }}
          role="table"
        >
          {block.rows.map((row, r) => (
            <View
              key={r}
              style={{
                flexDirection: "row",
                backgroundColor:
                  r === 0 ? colors.light : r % 2 ? colors.white : colors.paper,
                borderBottomWidth: r === block.rows.length - 1 ? 0 : 1,
                borderColor: colors.line,
              }}
              role="row"
            >
              {row.map((runs, c) => (
                <View
                  key={c}
                  style={{
                    flex: 1,
                    padding: 12,
                    minWidth: 135,
                    borderRightWidth: c === row.length - 1 ? 0 : 1,
                    borderColor: colors.line,
                  }}
                  role={r === 0 ? "columnheader" : "cell"}
                >
                  <RichText
                    runs={runs}
                    size={15}
                    weight={r === 0 ? "600" : "400"}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  if (block.kind === "formula")
    return (
      <View
        style={{
          padding: 18,
          borderRadius: 12,
          backgroundColor: colors.light,
          borderWidth: 1,
          borderColor: colors.line,
        }}
      >
        <RichText runs={block.runs} size={21} color={colors.green} />
      </View>
    );
  if (block.kind === "heading")
    return <RichText runs={block.runs} size={28} weight="700" heading />;
  if (block.kind === "subheading")
    return (
      <View style={{ paddingTop: 6 }}>
        <RichText runs={block.runs} size={22} weight="700" heading />
      </View>
    );
  if (block.kind === "label")
    return (
      <RichText runs={block.runs} size={13} weight="700" color={colors.green} />
    );
  if (block.kind === "paragraph" && block.runs[0]?.text.startsWith("• ")) {
    const runs = block.runs.map((r, i) =>
      i === 0 ? { ...r, text: r.text.slice(2) } : r,
    );
    return (
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Txt color={colors.green} size={18}>
          •
        </Txt>
        <View style={{ flex: 1 }}>
          <RichText runs={runs} />
        </View>
      </View>
    );
  }
  return "runs" in block ? (
    <RichText runs={block.runs} size={emphasis ? 26 : undefined} />
  ) : null;
}
