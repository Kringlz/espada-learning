import React, { useState } from "react";
import { Image, ImageSourcePropType, View, Platform } from "react-native";
import { Txt } from "./ui";

const covers = {
  decimals: {
    image: require("../../assets/illustrations/topic-decimals.jpg"),
    color: "#E0EDE4",
  },
  percent: {
    image: require("../../assets/illustrations/topic-percent.jpg"),
    color: "#F3E0CF",
  },
  motion: {
    image: require("../../assets/illustrations/topic-motion.jpg"),
    color: "#EEE9CB",
  },
  numbers: {
    image: require("../../assets/illustrations/topic-numbers.jpg"),
    color: "#E4EBD5",
  },
  fractions: {
    image: require("../../assets/illustrations/topic-fractions.jpg"),
    color: "#F4DFD0",
  },
  geometry: {
    image: require("../../assets/illustrations/topic-geometry.jpg"),
    color: "#DEE8F0",
  },
  algebra: {
    image: require("../../assets/illustrations/topic-algebra.jpg"),
    color: "#EAE2EF",
  },
  graphs: {
    image: require("../../assets/illustrations/topic-graphs.jpg"),
    color: "#DDEEE8",
  },
  probability: {
    image: require("../../assets/illustrations/topic-probability.jpg"),
    color: "#F5EDCE",
  },
} satisfies Record<string, { image: ImageSourcePropType; color: string }>;

/** Shared thematic covers also work for newly authored lessons. */
export function topicCover(title: string, subject = "") {
  const text = title.toLocaleLowerCase();
  if (
    /вероятност|статист|данны|средне|probab|data|average/.test(text) ||
    subject === "data"
  )
    return covers.probability;
  if (/десятич|decimal/.test(text)) return covers.decimals;
  if (/процент|отношен|пропорц|смес|ratio|percent/.test(text))
    return covers.percent;
  if (/скорост|расстояни|производительност|speed|distance/.test(text))
    return covers.motion;
  if (/прогресси/.test(text)) return covers.numbers;
  if (
    /координат|функци|функц|график|производн|интеграл|первообразн|предел|graph|function/.test(
      text,
    )
  )
    return covers.graphs;
  if (
    subject === "geometry" ||
    /геометр|(?:^|\s)угл|площад|периметр|объём|треуголь|окружност|вектор|пифагор|синус|косинус|тригонометр|angle|perimeter/.test(
      text,
    )
  )
    return covers.geometry;
  if (
    /дроб|процент|отношен|пропорц|смес|fraction|ratio|percent|decimal/.test(
      text,
    ) ||
    subject === "fractions"
  )
    return covers.fractions;
  if (
    /уравнен|неравен|выражен|степен|степень|корн|корень|многочлен|одночлен|логарифм|формул|переменн|equation|algebra/.test(
      text,
    )
  )
    return covers.algebra;
  return covers.numbers;
}

export function TopicCover({
  title,
  themeTitle = title,
  subject,
  eyebrow,
}: {
  title: string;
  themeTitle?: string;
  subject?: string;
  eyebrow?: string;
}) {
  const [width, setWidth] = useState(0);
  const cover = topicCover(themeTitle, subject);
  const palette =
    cover === covers.geometry ||
    cover === covers.motion ||
    cover === covers.probability
      ? {
          image: require("../../assets/illustrations/editorial-sand.jpg"),
          background: "#DEC17C",
          ink: "#243E2D",
          tint: "#DEC17CAA",
        }
      : cover === covers.algebra ||
          cover === covers.graphs ||
          cover === covers.percent
        ? {
            image: require("../../assets/illustrations/editorial-olive.jpg"),
            background: "#57612E",
            ink: "#FFFBEA",
            tint: "#46512599",
          }
        : {
            image: require("../../assets/illustrations/editorial-forest.jpg"),
            background: "#326443",
            ink: "#FFFBEA",
            tint: "#28513699",
          };
  const wide = width >= 620;
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        overflow: "hidden",
        borderRadius: 24,
        backgroundColor: palette.background,
        minHeight: wide ? 330 : 290,
      }}
    >
      <Image
        source={palette.image}
        accessible={false}
        resizeMode="cover"
        style={{ position: "absolute", width: "100%", height: "100%" }}
      />
      <View
        style={{
          padding: wide ? 42 : 26,
          gap: 30,
          flex: 1,
          backgroundColor: wide ? "transparent" : palette.tint,
        }}
      >
        <Txt
          size={11}
          weight="600"
          color={palette.ink}
          style={{ letterSpacing: 2 }}
        >
          {eyebrow ?? "МАТЕМАТИКА · КОНСПЕКТ"}
        </Txt>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            maxWidth: wide ? "68%" : "94%",
            minHeight: 145,
          }}
        >
          <Txt
            accessibilityRole="header"
            size={wide ? 46 : 34}
            color={palette.ink}
            style={{
              fontFamily:
                Platform.OS === "ios"
                  ? "Georgia"
                  : Platform.OS === "web"
                    ? "Georgia, serif"
                    : "serif",
              lineHeight: wide ? 51 : 40,
              letterSpacing: -0.6,
            }}
          >
            {title}
          </Txt>
        </View>
        <View style={{ width: 52, height: 2, backgroundColor: palette.ink }} />
      </View>
    </View>
  );
}
