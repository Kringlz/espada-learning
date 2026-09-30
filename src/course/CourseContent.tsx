import React, { useState } from "react";
import { Image, Platform, ScrollView, Text, View } from "react-native";
import { ContentBlock } from "./content";
import { RichText } from "./RichText";
import { figureAssets } from "./figureAssets";
import { Button, colors, Txt } from "../components/ui";

export function CourseContent({
  blocks,
  nested = false,
}: {
  blocks: ContentBlock[];
  nested?: boolean;
}) {
  return (
    <View style={{ gap: nested ? 14 : 24 }}>
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </View>
  );
}
function Figure({
  block,
}: {
  block: Extract<ContentBlock, { kind: "figure" }>;
}) {
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  return (
    <View
      style={{
        gap: 8,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: "#EAF4F2",
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
function Block({ block }: { block: ContentBlock }) {
  if (block.kind === "calculation")
    return (
      <View
        style={{ padding: 20, borderRadius: 12, backgroundColor: colors.light }}
      >
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
  if (block.kind === "callout" || block.kind === "example")
    return (
      <View
        style={{
          padding: 20,
          gap: 14,
          borderRadius: 14,
          backgroundColor: block.kind === "example" ? "#FFFFFF" : colors.light,
          borderWidth: 1,
          borderColor: colors.line,
          borderLeftWidth: 4,
          borderLeftColor:
            block.kind === "example" ? colors.gold : colors.green,
        }}
      >
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
                  r === 0 ? colors.light : r % 2 ? "#FFFFFF" : colors.paper,
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
          backgroundColor: "#F0F4EA",
          borderWidth: 1,
          borderColor: colors.line,
        }}
      >
        <RichText runs={block.runs} size={21} color={colors.green} />
      </View>
    );
  if (block.kind === "heading")
    return <RichText runs={block.runs} size={26} weight="700" heading />;
  if (block.kind === "subheading")
    return (
      <View style={{ paddingTop: 6 }}>
        <RichText runs={block.runs} size={20} weight="600" heading />
      </View>
    );
  if (block.kind === "label")
    return (
      <RichText runs={block.runs} size={12} weight="700" color={colors.green} />
    );
  return "runs" in block ? <RichText runs={block.runs} /> : null;
}
