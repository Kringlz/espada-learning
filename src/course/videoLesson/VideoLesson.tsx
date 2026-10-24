import { MathCopy as Txt } from "../../math/MathCopy";
import { useLearning } from "../../services/context";
import { lessonSync } from "../../progress/service";
import React, { useContext, useEffect, useRef, useState } from "react";
import { AppState, Pressable, View, useWindowDimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Path, Rect, Text as SvgText, Circle } from "react-native-svg";
import { Button, Icon, useUITheme } from "../../components/ui";
import { YouTubePlayer } from "../../components/YouTubePlayer";
import {
  ConstellationCelebration,
  MotionActiveContext,
  SoftReveal,
} from "../../components/Motion";
import { ScreenAnchor, useScreenScroll } from "../../components/ScreenScroll";
import { VideoLessonTheme } from "../../theme/Theme";
import { useRewards } from "../../engagement/RewardContext";
import { useSounds } from "../../engagement/Sounds";
import { useLesson } from "./useLesson";
import {
  AnswerShake,
  ChapterArt,
  FinishAccent,
  MistakeWash,
  StagePrelude,
} from "./LessonAtmosphere";
import { getLessonContent, getLessonMeta, Question } from "./content";
import {
  currentQuestion,
  draftId,
  result,
  Run,
  Stage,
  taskControl,
  videoProgress,
} from "./model";

export function VideoLesson(props: {
  actorId: string;
  lessonId?: string;
  back: () => void;
}) {
  return (
    <VideoLessonTheme>
      <Lesson
        key={`${props.actorId}:${props.lessonId ?? "G08-02"}`}
        {...props}
      />
    </VideoLessonTheme>
  );
}
const stages: [Stage, string][] = [
  ["intro", "Введение"],
  ["video", "Урок"],
  ["practice", "Тренировка"],
  ["return", "До и после"],
  ["check", "Практика"],
];
const now = () => new Date().toISOString();
function Lesson({
  actorId,
  lessonId = "G08-02",
  back,
}: {
  actorId: string;
  lessonId?: string;
  back: () => void;
}) {
  const { colors } = useUITheme();
  const { width } = useWindowDimensions();
  const wide = width >= 1100;
  const active = useContext(MotionActiveContext);
  const { actor } = useLearning();
  const connectedSync = actor.role === "student" ? lessonSync : undefined;
  const store = useLesson(actorId, AsyncStorage, lessonId, connectedSync);
  useEffect(() => {
    const sub = AppState.addEventListener("change", () => store.pause());
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!active) store.pause();
  }, [active]);
  const { award, earned, ready: rewardsReady } = useRewards();
  const { play } = useSounds();
  const [burst, setBurst] = useState(0);
  const [mistake, setMistake] = useState(0);
  const [prelude, setPrelude] = useState<"practice" | "check" | null>(null);
  const lastCelebration = useRef("");
  const [reviewVideo, setReviewVideo] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [oldRun, setOldRun] = useState<string | null>(null);
  const run = store.data.runs.at(-1);
  const meta = getLessonMeta(lessonId);
  const { opening, practice, check } = getLessonContent(
    run ?? { lessonId, contentVersion: meta.version },
  );
  const lessonVideo =
    meta.videos.find((v) => v.id === store.data.selectedVideo) ??
    meta.videos[0];
  const progress = videoProgress(store.data, lessonId, lessonVideo.id);
  const taskRef = useRef<View>(null);
  const scrollToTask = useContext(ScreenAnchor);
  const videoEvent = {
    kind: "video" as const,
    id: `youtube:${lessonVideo.id}`,
  };
  useEffect(() => {
    if (store.ready && !run)
      store.send({
        type: "start",
        lessonId,
        id: `${lessonId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        at: now(),
      });
  }, [store.ready, !!run]);
  useEffect(() => {
    if (
      store.ready &&
      progress.completed &&
      rewardsReady &&
      !earned(videoEvent)
    )
      award([videoEvent]);
  }, [store.ready, progress.completed, lessonVideo.id, rewardsReady]);
  useScreenScroll(
    `${run?.stage}:${run?.practiceIndex}:${run?.checkIndex}:${reviewVideo}:${oldRun}:${prelude}`,
  );
  useEffect(() => {
    if (
      !active ||
      reviewVideo ||
      prelude ||
      !run ||
      !["practice", "check"].includes(run.stage)
    )
      return;
    const frame = requestAnimationFrame(() => scrollToTask(taskRef.current));
    return () => cancelAnimationFrame(frame);
  }, [
    active,
    run?.id,
    run?.stage,
    run?.practiceIndex,
    run?.checkIndex,
    reviewVideo,
    prelude,
    scrollToTask,
  ]);
  const sendNext = () => {
    setBurst(0);
    setMistake(0);
    if (run?.stage === "video") setPrelude("practice");
    if (run?.stage === "return") setPrelude("check");
    if (run)
      store.send({ type: "next", from: run.stage, index: run.practiceIndex });
  };
  if (!store.ready || !run)
    return (
      <View style={{ gap: 14 }}>
        <Txt>{store.error || "Загрузка урока…"}</Txt>
        {!!store.error && (
          <Button onPress={store.retry}>Повторить загрузку</Button>
        )}
        <Button secondary onPress={back}>
          К карте
        </Button>
      </View>
    );
  const stageIndex =
    run.stage === "result" ? 5 : stages.findIndex(([id]) => id === run.stage);
  const question = currentQuestion(run);
  const submitted =
    run.stage === "intro"
      ? run.initial
      : run.stage === "return"
        ? run.revisited
        : run.stage === "practice" && question
          ? run.practice[question.id]
          : undefined;
  const selected = question
    ? run.stage === "check"
      ? run.check[question.id]?.choice
      : (submitted?.choice ?? run.drafts[draftId(run, question)])
    : undefined;
  const hints = question ? (run.hints[question.id] ?? 0) : 0;
  const showVideo = run.stage === "video" || reviewVideo;
  const remaining = check.length - Object.keys(run.check).length;
  const shownResult = oldRun
    ? store.data.runs.find((r) => r.id === oldRun)!
    : run;
  const stageLabel = showVideo
    ? "Урок"
    : run.stage === "practice"
      ? "Тренировка"
      : run.stage === "check"
        ? "Практика"
        : run.stage === "intro"
          ? "Введение"
          : run.stage === "return"
            ? "До и после"
            : "Результат";
  const videoNext = (
    <View style={{ alignItems: "flex-end" }}>
      <PrimaryAction
        label={
          reviewVideo
            ? run.stage === "result"
              ? "К результату"
              : "К заданию"
            : "К тренировке"
        }
        arrow
        onPress={reviewVideo ? () => setReviewVideo(false) : sendNext}
      />
    </View>
  );
  const inTasks = run.stage === "practice" || run.stage === "check";
  const control = taskControl(run);
  function submitAnswer() {
    if (!question || submitted || selected === undefined) return;
    store.send({ type: "submit", at: now() });
    const id = `${run!.id}:${run!.stage}:${question.id}`;
    if (
      run!.stage !== "intro" &&
      selected === question.correct &&
      lastCelebration.current !== id
    ) {
      lastCelebration.current = id;
      setBurst((b) => b + 1);
    } else if (run!.stage !== "intro" && selected !== question.correct) {
      setMistake((n) => n + 1);
      play("wrong");
    }
  }
  function finishCheck() {
    if (remaining && !confirmFinish) setConfirmFinish(true);
    else {
      store.send({ type: "finish", at: now() });
      if (result(run!).correct > 0) setBurst((b) => b + 1);
      setConfirmFinish(false);
    }
  }
  return (
    <View
      testID="video-lesson"
      style={{
        gap: 20,
        maxWidth: 840,
        width: "100%",
        alignSelf: "center",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <QuietAction label="К карте" onPress={back} icon="arrow-left" />
      </View>
      <View style={{ gap: 10 }}>
        <Txt
          size={width < 600 ? 24 : 30}
          weight="600"
          accessibilityRole="header"
        >
          {meta.title}
        </Txt>
        <View
          style={{ flexDirection: "row", gap: 5 }}
          accessibilityLabel={`Этап ${Math.min(stageIndex + 1, 5)} из 5`}
        >
          {stages.map(([id], i) => (
            <View
              key={id}
              style={{
                flex: 1,
                height: 2,
                backgroundColor: i <= stageIndex ? colors.green : colors.line,
              }}
            />
          ))}
        </View>
        {(showVideo || run.stage === "result") && (
          <Txt size={14} color={colors.green} weight="600">
            {stageLabel}
          </Txt>
        )}
      </View>
      {connectedSync && !store.error && (
        <Txt size={12} color={colors.muted}>
          {store.saving
            ? "Ожидает подтверждения сервера…"
            : "Сохранено на сервере"}
        </Txt>
      )}
      {!!store.error && (
        <View style={{ gap: 8 }}>
          <Txt accessibilityRole="alert" color={colors.red}>
            {store.error}
          </Txt>
          <QuietAction label="Повторить сохранение" onPress={store.retry} />
        </View>
      )}
      <MistakeWash trigger={mistake} />
      {prelude ? (
        <StagePrelude stage={prelude} onDone={() => setPrelude(null)} />
      ) : showVideo ? (
        <>
          <View
            style={{
              flexDirection: wide ? "row" : "column",
              gap: wide ? 28 : 20,
              alignItems: "flex-start",
            }}
          >
            <View
              style={{
                flex: wide ? 1 : undefined,
                width: wide ? undefined : "100%",
                minWidth: 0,
                gap: 20,
              }}
            >
              {active && (
                <YouTubePlayer
                  key={lessonVideo.id}
                  id={lessonVideo.id}
                  title={lessonVideo.title}
                  progress={progress}
                  onProgress={(progress) =>
                    store.send({ type: "video", id: lessonVideo.id, progress })
                  }
                  onWatched={() => award([videoEvent])}
                />
              )}
            </View>
            <View style={{ width: wide ? 220 : "100%" }}>
              <VideoNotes notes={meta.notes} />
            </View>
          </View>
          {meta.videos.length > 1 && (
            <Fold title={`Видео по теме · ${meta.videos.length}`}>
              {meta.videos.map((video, i) => (
                <Pressable
                  key={video.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${i + 1}. ${video.title}`}
                  accessibilityState={{ selected: video.id === lessonVideo.id }}
                  onPress={() =>
                    store.send({ type: "selectVideo", id: video.id })
                  }
                  style={{ paddingVertical: 10, flexDirection: "row", gap: 10 }}
                >
                  <Txt
                    color={
                      video.id === lessonVideo.id ? colors.green : colors.muted
                    }
                    size={14}
                    style={{ flex: 1 }}
                  >
                    {i + 1}. {video.title}
                  </Txt>
                  {video.id === lessonVideo.id && (
                    <Icon name="check" size={18} color={colors.green} />
                  )}
                </Pressable>
              ))}
            </Fold>
          )}
          {videoNext}
        </>
      ) : run.stage === "result" ? (
        <>
          {oldRun && (
            <QuietAction
              label="Последний результат"
              onPress={() => setOldRun(null)}
            />
          )}
          <View>
            <ConstellationCelebration burst={burst} immersive />
            <Result run={shownResult} />
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <PrimaryAction
              label="Пройти ещё раз"
              disabled={store.saving || !!store.error}
              onPress={() => {
                setOldRun(null);
                setConfirmFinish(false);
                setBurst(0);
                setMistake(0);
                store.send({
                  type: "start",
                  lessonId,
                  id: `${lessonId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  at: now(),
                });
              }}
            />
          </View>
          <QuietAction
            label="Повторить видео"
            onPress={() => setReviewVideo(true)}
            icon="play"
          />
          <Fold
            title={`История · ${store.data.runs.filter((r) => r.finishedAt).length}`}
          >
            {store.data.runs
              .filter((r) => r.finishedAt)
              .slice()
              .reverse()
              .map((r, index) => (
                <QuietAction
                  key={r.id}
                  label={`Попытка ${store.data.runs.length - index} · ${new Date(r.finishedAt!).toLocaleDateString("ru-RU")} · ${Math.round(result(r).percent)}%`}
                  onPress={() => setOldRun(r.id)}
                />
              ))}
          </Fold>
        </>
      ) : question ? (
        <View
          ref={taskRef}
          testID="lesson-tasks"
          style={{
            gap: 20,
            padding: width < 380 ? 14 : 24,
            borderRadius: run.stage === "intro" ? 28 : 18,
            borderWidth: 1,
            borderColor:
              submitted &&
              run.stage !== "intro" &&
              submitted.choice !== question.correct
                ? colors.red
                : run.stage === "intro"
                  ? "#8B79B94D"
                  : run.stage === "check"
                    ? "#AA99D34D"
                    : run.stage === "return"
                      ? "#D0B37A4D"
                      : colors.line,
            backgroundColor:
              submitted &&
              run.stage !== "intro" &&
              submitted.choice !== question.correct
                ? "#351C2A"
                : run.stage === "intro"
                  ? "#19162D"
                  : run.stage === "check"
                    ? "#1B1B30"
                    : colors.subtle,
            width: "100%",
          }}
        >
          <ConstellationCelebration burst={burst} immersive />
          {run.stage === "intro" && (
            <View testID="lesson-introduction" style={{ gap: 10 }}>
              <Txt
                size={13}
                weight="600"
                color="#D1BCF1"
                style={{ letterSpacing: 2 }}
              >
                ВВЕДЕНИЕ
              </Txt>
              <Txt size={26} weight="500">
                Всё начинается с вопроса
              </Txt>
              {question.id !== "g08-path" && <ChapterArt />}
              <Txt size={15} color={colors.muted}>
                Как ты думаешь? Здесь можно предположить — после урока вернёмся
                к твоему ответу.
              </Txt>
            </View>
          )}
          {run.stage === "return" && (
            <View style={{ gap: 6 }}>
              <Txt size={13} color={colors.gold} weight="600">
                ДО И ПОСЛЕ
              </Txt>
              <Txt size={23} weight="500">
                Знакомый вопрос. Новый взгляд.
              </Txt>
              <Txt size={15} color={colors.muted}>
                Посмотри на него ещё раз — что теперь стало понятнее?
              </Txt>
            </View>
          )}
          {inTasks && (
            <Txt
              size={14}
              weight="600"
              color={run.stage === "check" ? "#C4B0FF" : colors.green}
            >
              {stageLabel}
            </Txt>
          )}
          <SoftReveal changeKey={question.id} style={{ gap: 20 }}>
            {run.stage === "intro" || run.stage === "return" ? (
              <OpeningQuestion question={question} />
            ) : (
              <Txt
                size={width < 380 ? 18 : 21}
                weight="500"
                accessibilityRole="header"
              >
                {question.prompt}
              </Txt>
            )}
            <Choices
              question={question}
              value={selected}
              disabled={!!submitted}
              revealResult={!!submitted && run.stage !== "intro"}
              mistake={mistake}
              onSelect={(choice) => {
                setConfirmFinish(false);
                store.send({ type: "choose", id: question.id, choice });
              }}
            />
          </SoftReveal>
          {submitted && run.stage === "practice" && (
            <SoftReveal
              style={{
                gap: 8,
                borderLeftWidth: 2,
                borderLeftColor:
                  submitted.choice === question.correct
                    ? colors.green
                    : colors.red,
                paddingLeft: 14,
              }}
            >
              <Txt
                size={16}
                weight="600"
                color={
                  submitted.choice === question.correct
                    ? colors.green
                    : colors.red
                }
                accessibilityLiveRegion="polite"
              >
                {submitted.choice === question.correct ? "Верно" : "Разберёмся"}
              </Txt>
              <Txt testID="answer-explanation" prose size={18} weight="400">
                {question.solution}
              </Txt>
            </SoftReveal>
          )}
          {run.stage === "check" && confirmFinish && remaining > 0 && (
            <View style={{ gap: 4 }}>
              <Txt size={15} color={colors.gold} accessibilityRole="alert">
                Без ответа: {remaining}. Они войдут в результат как неверные.
              </Txt>
              <QuietAction
                label="К пропускам"
                onPress={() => {
                  setConfirmFinish(false);
                  store.send({
                    type: "checkIndex",
                    index: check.findIndex((q) => !run.check[q.id]),
                  });
                }}
              />
            </View>
          )}
          {control ? (
            <TaskControls
              index={
                run.stage === "practice" ? run.practiceIndex : run.checkIndex
              }
              total={run.stage === "practice" ? practice.length : check.length}
              onChange={(index) => {
                setBurst(0);
                setMistake(0);
                setConfirmFinish(false);
                store.send({
                  type:
                    run.stage === "practice" ? "practiceIndex" : "checkIndex",
                  index,
                });
              }}
              finish={control.action === "finish"}
              label={
                control.action === "finish"
                  ? "Завершить урок"
                  : control.label === "Завершить"
                    ? "Продолжить"
                    : control.label
              }
              disabled={control.disabled}
              onAction={() => {
                if (control.action === "finish") finishCheck();
                else if (control.action === "submit") submitAnswer();
                else {
                  setBurst(0);
                  setMistake(0);
                  store.send({
                    type: control.action,
                    index:
                      run.stage === "practice"
                        ? run.practiceIndex
                        : run.checkIndex,
                  });
                }
              }}
            />
          ) : !submitted ? (
            <View style={{ alignItems: "flex-end" }}>
              <PrimaryAction
                label="Ответить"
                disabled={selected === undefined}
                onPress={submitAnswer}
              />
            </View>
          ) : null}
          {run.stage === "practice" && (
            <>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                {!submitted && hints < question.hints.length ? (
                  <QuietAction
                    label={hints ? "Ещё подсказка" : "Подсказка"}
                    onPress={() => store.send({ type: "hint" })}
                  />
                ) : (
                  <View />
                )}
                <QuietAction
                  label="Видео"
                  onPress={() => {
                    setBurst(0);
                    setReviewVideo(true);
                  }}
                  icon="play"
                />
              </View>
              {hints > 0 && (
                <View
                  style={{
                    gap: 10,
                    borderLeftWidth: 2,
                    borderLeftColor: colors.green,
                    paddingLeft: 14,
                  }}
                >
                  {question.hints.slice(0, hints).map((hint, i) => (
                    <Txt prose key={i} size={18} weight="400">
                      {hint}
                    </Txt>
                  ))}
                </View>
              )}
            </>
          )}
          {submitted && run.stage === "return" && <Comparison run={run} />}
          {submitted && run.stage !== "practice" && (
            <View style={{ alignItems: "flex-end" }}>
              <PrimaryAction
                label={run.stage === "intro" ? "Смотреть видео" : "К практике"}
                arrow
                onPress={sendNext}
              />
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}
function PrimaryAction({
  label,
  onPress,
  disabled = false,
  arrow = false,
  compact = false,
  finish = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  arrow?: boolean;
  compact?: boolean;
  finish?: boolean;
}) {
  const { colors } = useUITheme();
  const { play } = useSounds();
  return (
    <FinishAccent enabled={finish && !disabled}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          play(arrow ? "navigate" : "open");
          onPress();
        }}
        style={({ pressed }) => ({
          minHeight: 48,
          maxWidth: "100%",
          paddingHorizontal: compact ? 10 : 20,
          paddingVertical: 12,
          borderRadius: 24,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          backgroundColor: colors.primary,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        })}
      >
        <Txt
          size={compact ? 14 : 15}
          weight="600"
          color={colors.onPrimary}
          style={{ flexShrink: 1 }}
        >
          {label}
        </Txt>
        {finish && (
          <Icon name="check-circle" size={18} color={colors.onPrimary} />
        )}
        {arrow && (
          <Icon name="arrow-right" size={18} color={colors.onPrimary} />
        )}
      </Pressable>
    </FinishAccent>
  );
}
function TaskControls({
  index,
  total,
  onChange,
  label,
  disabled,
  onAction,
  finish = false,
}: {
  index: number;
  total: number;
  onChange: (index: number) => void;
  label: string;
  disabled: boolean;
  onAction: () => void;
  finish?: boolean;
}) {
  const { colors } = useUITheme();
  const { play } = useSounds();
  const arrow = (direction: number) => {
    const unavailable = index + direction < 0 || index + direction >= total;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          direction < 0 ? "Предыдущая задача" : "Следующая задача"
        }
        accessibilityState={{ disabled: unavailable }}
        disabled={unavailable}
        onPress={() => {
          play("navigate");
          onChange(index + direction);
        }}
        style={({ pressed }) => ({
          width: 44,
          height: 48,
          borderRadius: 24,
          alignItems: "center",
          justifyContent: "center",
          opacity: unavailable ? 0.25 : pressed ? 0.6 : 1,
        })}
      >
        <Icon
          name={direction < 0 ? "arrow-left" : "arrow-right"}
          size={20}
          color={colors.ink}
        />
      </Pressable>
    );
  };
  return (
    <View
      testID="task-controls"
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 12,
          flex: 1,
        }}
      >
        <View style={{ flexDirection: "row", gap: 4 }}>
          {arrow(-1)}
          {arrow(1)}
        </View>
        <View style={{ maxWidth: "100%", alignItems: "flex-end" }}>
          <PrimaryAction
            compact={!finish}
            finish={finish}
            label={label}
            disabled={disabled}
            onPress={onAction}
          />
        </View>
      </View>
    </View>
  );
}
function OpeningQuestion({ question }: { question: Question }) {
  const { width } = useWindowDimensions();
  const split = question.prompt.lastIndexOf(". ") + 2;
  if (question.id !== "g08-path")
    return (
      <Txt size={width < 380 ? 20 : 23} weight="600" accessibilityRole="header">
        {question.prompt}
      </Txt>
    );
  return (
    <View style={{ gap: 16 }}>
      <Txt size={width < 380 ? 20 : 23} weight="600" accessibilityRole="header">
        {question.prompt.slice(split)}
      </Txt>
      <Txt size={16}>{question.prompt.slice(0, split).trim()}</Txt>
      <Courtyard />
    </View>
  );
}
function QuietAction({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Icon>["name"];
}) {
  const { colors } = useUITheme();
  const { play } = useSounds();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        play(icon === "play" ? "navigate" : "expand");
        onPress();
      }}
      style={({ pressed }) => ({
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        alignSelf: "flex-start",
        opacity: pressed ? 0.65 : 1,
        maxWidth: "100%",
      })}
    >
      {icon && <Icon name={icon} size={16} color={colors.muted} />}
      <Txt size={14} color={colors.muted} style={{ flexShrink: 1 }}>
        {label}
      </Txt>
    </Pressable>
  );
}
function Fold({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { colors } = useUITheme();
  const [open, setOpen] = useState(false);
  const { play } = useSounds();
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.line,
        gap: open ? 12 : 0,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        onPress={() => {
          play(open ? "collapse" : "expand");
          setOpen((v) => !v);
        }}
        style={{
          minHeight: 48,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          justifyContent: "space-between",
        }}
      >
        <Txt size={15} color={colors.muted} style={{ flex: 1 }}>
          {title}
        </Txt>
        <Icon
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.muted}
        />
      </Pressable>
      {open && children}
    </View>
  );
}
function Choices({
  question,
  value,
  disabled,
  revealResult,
  mistake,
  onSelect,
}: {
  question: Question;
  value?: number;
  disabled: boolean;
  revealResult: boolean;
  mistake: number;
  onSelect: (i: number) => void;
}) {
  const { colors } = useUITheme();
  const { play } = useSounds();
  const wrong = revealResult && value !== question.correct;
  const selectedColor = wrong ? colors.red : colors.green;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Варианты ответа"
      style={{ gap: 8 }}
    >
      {question.choices.map((choice, i) => (
        <AnswerShake key={i} trigger={wrong && value === i ? mistake : 0}>
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={choice}
            accessibilityState={{ checked: value === i, disabled }}
            aria-checked={value === i}
            disabled={disabled}
            onPress={() => {
              play("select");
              onSelect(i);
            }}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              minHeight: 54,
              padding: 14,
              borderWidth: 1,
              borderColor: value === i ? selectedColor : "transparent",
              borderRadius: 10,
              backgroundColor:
                value === i
                  ? wrong
                    ? "#542536"
                    : colors.selected
                  : colors.white,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 1,
                borderColor: value === i ? selectedColor : colors.muted,
                backgroundColor: value === i ? selectedColor : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {value === i &&
                (revealResult ? (
                  <Icon
                    name={wrong ? "x" : "check"}
                    size={15}
                    color={colors.onPrimary}
                  />
                ) : (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.onPrimary,
                    }}
                  />
                ))}
            </View>
            <Txt
              size={16}
              weight={value === i ? "600" : "400"}
              style={{ flex: 1 }}
            >
              {choice}
            </Txt>
          </Pressable>
        </AnswerShake>
      ))}
    </View>
  );
}
function VideoNotes({ notes }: { notes: string[] }) {
  const { colors } = useUITheme();
  return (
    <View testID="video-notes" style={{ gap: 12 }}>
      {notes.map((text) => (
        <View
          key={text}
          style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}
        >
          <View
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.green,
              marginTop: 9,
            }}
          />
          <Txt
            prose
            book
            size={16}
            color={colors.ink}
            weight="400"
            style={{ flex: 1 }}
          >
            {text}
          </Txt>
        </View>
      ))}
    </View>
  );
}
function Courtyard() {
  const { colors } = useUITheme();
  return (
    <View
      style={{
        paddingVertical: 4,
        alignItems: "center",
      }}
    >
      <Svg
        width="100%"
        height={115}
        viewBox="0 0 360 160"
        accessibilityLabel="Прямоугольный двор: стороны 30 и 40 метров, диагональ соединяет противоположные углы"
        role="img"
      >
        <Rect
          x={65}
          y={22}
          width={220}
          height={108}
          rx={3}
          fill={colors.light}
          stroke={colors.line}
        />
        <Path
          d="M65 130 L285 130 L285 22"
          stroke={colors.gold}
          strokeWidth={3}
          fill="none"
        />
        <Path
          d="M65 130 L285 22"
          stroke={colors.green}
          strokeWidth={3}
          strokeDasharray="7 5"
          fill="none"
        />
        <Path d="M271 130 L271 116 L285 116" stroke={colors.gold} fill="none" />
        <Circle cx={65} cy={130} r={5} fill={colors.green} />
        <Circle cx={285} cy={22} r={5} fill={colors.green} />
        <SvgText
          x={175}
          y={151}
          textAnchor="middle"
          fill={colors.muted}
          fontSize={20}
        >
          40 м
        </SvgText>
        <SvgText x={296} y={83} fill={colors.muted} fontSize={20}>
          30 м
        </SvgText>
        <SvgText x={119} y={63} fill={colors.green} fontSize={20}>
          Айдана
        </SvgText>
        <SvgText x={205} y={115} fill={colors.gold} fontSize={20}>
          Тимур
        </SvgText>
      </Svg>
    </View>
  );
}
function Reference({ only, run }: { only: string[]; run: Run }) {
  const { reference } = getLessonContent(run);
  const { colors } = useUITheme();
  return (
    <View style={{ gap: 16 }}>
      {reference
        .filter((r) => only.includes(r.id))
        .map((r) => (
          <View key={r.id} style={{ gap: 6 }}>
            <Txt size={16} weight="600" color={colors.green}>
              {r.title}
            </Txt>
            <Txt size={15}>{r.text}</Txt>
          </View>
        ))}
    </View>
  );
}
function Comparison({ run }: { run: Run }) {
  const { opening } = getLessonContent(run);
  const { colors } = useUITheme();
  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          flexDirection: "row",
          gap: 20,
          borderTopWidth: 1,
          borderTopColor: colors.line,
          paddingTop: 14,
        }}
      >
        {[
          ["До", run.initial],
          ["После", run.revisited],
        ].map(([label, answer]) => {
          const a = answer as Run["initial"];
          return (
            <View key={String(label)} style={{ flex: 1, gap: 4 }}>
              <Txt size={13} color={colors.muted}>
                {String(label)}
              </Txt>
              <Txt size={16} weight="600">
                {a ? opening.choices[a.choice] : "—"}
              </Txt>
              <Txt
                size={13}
                color={
                  a?.choice === opening.correct ? colors.green : colors.gold
                }
              >
                {a?.choice === opening.correct ? "Верно" : "Неверно"}
              </Txt>
            </View>
          );
        })}
      </View>
      <Txt size={16}>{opening.solution}</Txt>
    </View>
  );
}
function Result({ run }: { run: Run }) {
  const { check } = getLessonContent(run);
  const { colors } = useUITheme();
  const score = result(run);
  return (
    <SoftReveal
      style={{
        gap: 20,
        padding: 24,
        borderRadius: 28,
        backgroundColor: colors.subtle,
      }}
    >
      <ChapterArt kind="result" />
      <Txt size={26} weight="600">
        Урок завершён
      </Txt>
      <View style={{ gap: 6 }}>
        <Txt size={48} color={colors.green} weight="600">
          {Math.round(score.percent)}%
        </Txt>
        <Txt size={17}>
          {score.correct} из {score.total} ·{" "}
          {score.repeat ? "Стоит повторить" : "Практика пройдена"}
        </Txt>
      </View>
      {score.repeat && (
        <View style={{ gap: 12 }}>
          <Txt size={18} weight="600">
            Что повторить
          </Txt>
          <Reference only={score.concepts} run={run} />
        </View>
      )}
      <Fold title="Ответы и решения">
        {check.map((q, i) => (
          <View
            key={q.id}
            style={{
              gap: 8,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.line,
            }}
          >
            <Txt size={16} weight="500">
              {i + 1}. {q.prompt}
            </Txt>
            <Txt
              size={14}
              color={
                run.check[q.id]?.choice === q.correct
                  ? colors.green
                  : colors.gold
              }
            >
              {run.check[q.id]
                ? `Твой ответ: ${q.choices[run.check[q.id].choice]}`
                : "Без ответа"}
            </Txt>
            <Txt size={14} color={colors.green}>
              Верный ответ: {q.choices[q.correct]}
            </Txt>
            <Txt size={15}>{q.solution}</Txt>
            <Txt size={13} color={colors.muted}>
              {q.hints[0]}
            </Txt>
          </View>
        ))}
      </Fold>
      <Fold title="До и после">
        <Comparison run={run} />
      </Fold>
    </SoftReveal>
  );
}
