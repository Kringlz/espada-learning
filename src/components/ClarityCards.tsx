import { AtlasImage } from "./AtlasImage";
import React from "react";
import { Image, Pressable, View, useWindowDimensions } from "react-native";
import { latestReportInsights } from "../core/reportInsights";
import { useLearning } from "../services/context";
import { Button, Card, Icon, Txt, dateText, useUITheme } from "./ui";
import { ResultRadar } from "./ResultRadar";
import { sectionIllustrations } from "./SectionIllustrations";

export function KnowledgePreview({
  onPress,
  compact = false,
}: {
  onPress: () => void;
  compact?: boolean;
}) {
  const { colors } = useUITheme();
  const narrow = useWindowDimensions().width < 400;
  const { state, actor } = useLearning();
  const data = latestReportInsights(state, actor.id);
  if (compact)
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Открыть карту знаний"
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 164,
          padding: narrow ? 16 : 20,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.white,
          flexDirection: "row",
          alignItems: "center",
          gap: narrow ? 10 : 16,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <View style={{ width: narrow ? 70 : 96 }} pointerEvents="none">
          {data ? (
            <ResultRadar
              compact
              template={data.template}
              report={data.report}
            />
          ) : (
            <AtlasImage
              source={sectionIllustrations.progress.image}
              accessible={false}
              resizeMode="contain"
              style={{ width: narrow ? 70 : 96, height: narrow ? 70 : 96 }}
            />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <Txt size={narrow ? 20 : 22} weight="700">
            Карта знаний
          </Txt>
          <Txt size={14} color={colors.muted}>
            {data
              ? `${data.template.areas.length} навыков${data.report.demo ? " · демо" : ""}`
              : "После первой работы"}
          </Txt>
        </View>
        <Icon name="arrow-right" size={20} />
      </Pressable>
    );
  return (
    <Card style={{ gap: 12, flex: 1 }}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Icon name="bar-chart-2" color={colors.green} />
        <Txt
          accessibilityRole="header"
          size={24}
          weight="700"
          style={{ flex: 1 }}
        >
          Карта знаний
        </Txt>
      </View>
      {data ? (
        <>
          <Txt size={15} color={colors.muted}>
            {dateText(data.report.date)} · оценка {data.report.grade} из{" "}
            {data.template.scale.max}
            {data.report.demo ? " · учебный пример" : ""}
          </Txt>
          <ResultRadar compact template={data.template} report={data.report} />
          {!!data.strongest.length && (
            <Txt size={17} color={colors.muted}>
              Хорошо получается:{" "}
              {data.strongest.map((a) => a.label).join(" · ")}
            </Txt>
          )}
        </>
      ) : (
        <>
          <AtlasImage
            source={sectionIllustrations.progress.image}
            accessible={false}
            resizeMode="contain"
            style={{ width: 140, height: 120, alignSelf: "center" }}
          />
          <Txt color={colors.muted}>
            После первой работы учителя здесь появится карта твоих сильных
            сторон.
          </Txt>
        </>
      )}
      <Button secondary icon="arrow-right" onPress={onPress}>
        Результаты
      </Button>
    </Card>
  );
}
