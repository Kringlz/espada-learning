import { Confetti } from "../components/Motion";
import { MathCopy as Txt } from "../math/MathCopy";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Button, Card, Icon, Pill, useUITheme } from "../components/ui";
import { useRewards } from "../engagement/RewardContext";
import {
  ArenaTopic,
  Review,
  localDay,
  practiceQuestions,
  practiceScore,
  remainingSeconds,
} from "./model";
import { Answers, ReviewList } from "./GameCards";

export function Practice({
  topic,
  daily,
  back,
}: {
  topic: ArenaTopic;
  daily: boolean;
  back: () => void;
}) {
  const { colors } = useUITheme();
  const rewards = useRewards();
  const [day] = useState(localDay);
  const [questions] = useState(() =>
    practiceQuestions(
      topic,
      daily ? Number(day.replace(/-/g, "")) : Date.now(),
      daily ? 5 : 10,
    ),
  );
  const [burst, setBurst] = useState(0);
  const [round, setRound] = useState(0);
  const [rows, setRows] = useState<Review[]>([]);
  const [selected, setSelected] = useState<number | null | undefined>(
    undefined,
  );
  const [seconds, setSeconds] = useState(15);
  const opened = useRef(Date.now());
  const locked = useRef(false);
  const finished = round === questions.length;
  const answer = useCallback(
    (choice: number | null) => {
      if (locked.current || finished) return;
      locked.current = true;
      const elapsed = Date.now() - opened.current;
      const accepted = elapsed >= 15000 ? null : choice;
      const q = questions[round];
      const points = practiceScore(accepted === q.answer, elapsed);
      setSelected(accepted);
      if (accepted === q.answer) setBurst((b) => b + 1);
      setRows((all) => [...all, { ...q, choice: accepted, points }]);
      if (daily && accepted === q.answer)
        rewards.award([{ kind: "question", id: `daily:${day}:${round}` }]);
    },
    [finished, questions, round, daily, day, rewards],
  );
  useEffect(() => {
    if (finished || selected !== undefined) return;
    const tick = () => {
      const time = Date.now();
      setSeconds(remainingSeconds(opened.current + 15000, time));
      if (time >= opened.current + 15000) answer(null);
    };
    const timer = setInterval(tick, 150);
    return () => clearInterval(timer);
  }, [finished, selected, answer]);
  const points = rows.reduce((sum, row) => sum + row.points, 0);
  if (finished)
    return (
      <View style={{ gap: 18 }}>
        <Card style={{ gap: 12, backgroundColor: colors.light }}>
          <Icon name="award" size={42} color={colors.green} />
          <Txt size={30} weight="800">
            {daily ? "Разминка готова!" : "Хорошая тренировка!"}
          </Txt>
          <Txt size={24} weight="800">
            {points} очков · {rows.filter((r) => r.choice === r.answer).length}/
            {questions.length} верно
          </Txt>
          <Txt color={colors.muted}>
            Тренировочный результат не входит в рейтинг группы.
            {daily
              ? " За каждый новый верный ответ разминки — +20 учебных очков на этом устройстве."
              : ""}
          </Txt>
          <Button onPress={back}>На арену</Button>
        </Card>
        <ReviewList rows={rows} />
      </View>
    );
  const q = questions[round];
  return (
    <View style={{ gap: 18 }}>
      <Button small secondary onPress={back} icon="arrow-left">
        Выйти из тренировки
      </Button>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <Pill>
          {daily ? "Разминка дня" : "Тренировка"} · {round + 1}/
          {questions.length}
        </Pill>
        <Pill>{points} очков</Pill>
      </View>
      <Card style={{ gap: 22, alignItems: "center", paddingVertical: 36 }}>
        <Txt size={15} color={colors.muted}>
          {selected === undefined ? `Осталось ${seconds} с` : "Разбор ответа"}
        </Txt>
        <Txt size={34} weight="800" style={{ textAlign: "center" }}>
          {q.prompt}
        </Txt>
      </Card>
      <Confetti burst={burst} />
      <Answers
        question={q}
        selected={selected}
        reveal={selected !== undefined}
        disabled={selected !== undefined}
        choose={answer}
      />
      {selected !== undefined && (
        <Card style={{ gap: 12 }}>
          <Txt weight="700">
            {selected === q.answer
              ? "Верно!"
              : selected === null
                ? "Время вышло"
                : "Попробуй запомнить этот шаг"}
          </Txt>
          <Txt>{q.explanation}</Txt>
          <Button
            fullWidth
            onPress={() => {
              locked.current = false;
              opened.current = Date.now();
              setSeconds(15);
              setSelected(undefined);
              setRound((n) => n + 1);
            }}
          >
            {round + 1 === questions.length
              ? "Мой результат"
              : "Следующий пример"}
          </Button>
        </Card>
      )}
    </View>
  );
}
