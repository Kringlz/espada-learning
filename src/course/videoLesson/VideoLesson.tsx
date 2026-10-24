import { MathCopy as Txt } from "../../math/MathCopy";
import { useLearning } from "../../services/context";
import { lessonSync } from "../../progress/service";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  AppState,
  Modal,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Path, Rect, Text as SvgText, Circle } from "react-native-svg";
import { Button, Icon, useUITheme } from "../../components/ui";
import { YouTubePlayer } from "../../components/YouTubePlayer";
import {
  ConstellationCelebration,
  MotionActiveContext,
  SoftReveal,
  useReducedMotion,
} from "../../components/Motion";
import { useLessonScene } from "../../components/LessonFocus";
import { useScreenScroll } from "../../components/ScreenScroll";
import { VideoLessonTheme } from "../../theme/Theme";
import { useRewards } from "../../engagement/RewardContext";
import { useSounds } from "../../engagement/Sounds";
import { useLesson } from "./useLesson";
import {
  AnswerShake,
  ChapterArt,
  FinishAccent,
  MistakeWash,
  LessonLoading,
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
  trainingComplete,
  trainingAssisted,
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
  const { width, height } = useWindowDimensions();
  const wide = width >= 1100;
  const active = useContext(MotionActiveContext);
  const reduced = useReducedMotion();
  const { actor } = useLearning();
  const store = useLesson(
    actorId,
    AsyncStorage,
    lessonId,
    actor.role === "student" ? lessonSync : undefined,
  );
  const { award, earned, ready: rewardsReady } = useRewards();
  const { play } = useSounds();
  const [burst, setBurst] = useState(0);
  const [reviewingTask, setReviewingTask] = useState<string | null>(null);
  const [entryReady, setEntryReady] = useState(false);
  const entryHandled = useRef(false);
  const taskOpacity = useRef(new Animated.Value(1)).current;
  const transition = useRef<Animated.CompositeAnimation | null>(null);
  const moving = useRef(false);
  const [mistake, setMistake] = useState(0);
  const [wrongChoice, setWrongChoice] = useState<number>();
  const [prelude, setPrelude] = useState<"practice" | "check" | null>(null);
  const [reviewVideo, setReviewVideo] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [oldRun, setOldRun] = useState<string | null>(null);
  const [explanation, setExplanation] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const run = store.data.runs.at(-1);
  const meta = getLessonMeta(lessonId);
  const { practice, check } = getLessonContent(
    run ?? { lessonId, contentVersion: meta.version },
  );
  const question = run && currentQuestion(run);
  const training = run?.stage === "practice";
  const attempt = question && run?.training?.[question.id];
  const completed = !!(
    training &&
    question &&
    run &&
    trainingComplete(run, question)
  );
  const needsExplanation =
    training && attempt?.resolved && !attempt.acknowledged;
  const lessonVideo =
    meta.videos.find((v) => v.id === store.data.selectedVideo) ??
    meta.videos[0];
  const progress = videoProgress(store.data, lessonId, lessonVideo.id);
  const videoEvent = {
    kind: "video" as const,
    id: `youtube:${lessonVideo.id}`,
  };
  const stage = run?.stage ?? "intro";
  const background =
    stage === "practice"
      ? "#0B1719"
      : stage === "check"
        ? "#151321"
        : "#0B111B";
  const stageIndex =
    stage === "result" ? 5 : stages.findIndex(([id]) => id === stage);
  const fraction =
    training && run
      ? practice.filter((q) => trainingComplete(run, q)).length /
        practice.length
      : stage === "check" && run
        ? Object.keys(run.check).length / check.length
        : 0;
  useLessonScene(background, (stageIndex + fraction) / 5);
  const taskKey = `${run?.id}:${stage}:${run?.practiceIndex}:${run?.checkIndex}`;
  function cancelAdvance() {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  }
  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 420);
    const sub = AppState.addEventListener("change", () => {
      store.pause();
      cancelAdvance();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
      cancelAdvance();
      transition.current?.stop();
    };
  }, []);
  useEffect(() => {
    if (!active) {
      store.pause();
      cancelAdvance();
      transition.current?.stop();
      moving.current = false;
      taskOpacity.setValue(1);
      setBurst(0);
      setReviewingTask(null);
    }
  }, [active]);
  useEffect(() => {
    setExplanation(false);
    setWrongChoice(undefined);
    setMistake(0);
    return cancelAdvance;
  }, [taskKey]);
  useEffect(() => {
    if (!needsExplanation || !active) return;
    const timer = setTimeout(() => setExplanation(true), 450);
    return () => clearTimeout(timer);
  }, [needsExplanation, taskKey, active]);
  useEffect(() => {
    if (!store.ready || entryHandled.current) return;
    entryHandled.current = true;
    if (!run || run.finishedAt)
      store.send({
        type: "start",
        lessonId,
        id: `${lessonId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        at: now(),
      });
    setEntryReady(true);
  }, [store.ready]);
  useEffect(() => {
    if (
      store.ready &&
      progress.completed &&
      rewardsReady &&
      !earned(videoEvent)
    )
      award([videoEvent]);
  }, [store.ready, progress.completed, lessonVideo.id, rewardsReady]);
  useScreenScroll(`${taskKey}:${reviewVideo}:${oldRun}:${prelude}`);
  function transitionTask(move: () => void) {
    if (moving.current) return;
    if (reduced) {
      move();
      return;
    }
    moving.current = true;
    transition.current = Animated.timing(taskOpacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: Platform.OS !== "web",
    });
    transition.current.start(({ finished }) => {
      if (!finished) return;
      move();
      transition.current = Animated.timing(taskOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: Platform.OS !== "web",
      });
      transition.current.start(() => {
        moving.current = false;
      });
    });
  }
  function advanceTraining(delay = 2000) {
    cancelAdvance();
    const index = run!.practiceIndex;
    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = null;
      transitionTask(() => {
        setBurst(0);
        setReviewingTask(null);
        store.send({ type: "practiceContinue", index });
      });
    }, delay);
  }
  function sendNext() {
    setMistake(0);
    setBurst(0);
    if (stage === "video") setPrelude("practice");
    if (stage === "return") setPrelude("check");
    if (run)
      store.send({ type: "next", from: run.stage, index: run.practiceIndex });
  }
  if (!store.ready || !run || !loaded || !entryReady)
    return store.error ? (
      <View style={{ padding: 28, gap: 16 }}>
        <Txt accessibilityRole="alert">{store.error}</Txt>
        <Button onPress={store.retry}>Повторить загрузку</Button>
        <Button secondary onPress={back}>
          К карте
        </Button>
      </View>
    ) : (
      <LessonLoading />
    );
  const submitted =
    stage === "intro"
      ? run.initial
      : stage === "return"
        ? run.revisited
        : training && completed && question
          ? run.practice[question.id]
          : undefined;
  const selected = question
    ? training
      ? completed || attempt?.resolved
        ? question.correct
        : undefined
      : stage === "check"
        ? run.check[question.id]?.choice
        : (submitted?.choice ?? run.drafts[draftId(run, question)])
    : undefined;
  const showVideo = stage === "video" || reviewVideo;
  const remaining = check.length - Object.keys(run.check).length;
  const shownResult = oldRun
    ? store.data.runs.find((r) => r.id === oldRun)!
    : run;
  const control = taskControl(run);
  function submitAnswer() {
    if (!question || submitted || selected === undefined) return;
    store.send({ type: "submit", at: now() });
    if (stage === "intro") {
      store.send({ type: "next", from: "intro", index: run!.practiceIndex });
    }
  }
  function choose(choice: number) {
    if (!question || moving.current) return;
    setConfirmFinish(false);
    if (!training) {
      store.send({ type: "choose", id: question.id, choice });
      return;
    }
    if (completed || attempt?.resolved || attempt?.rejected.includes(choice))
      return;
    store.send({ type: "trainingTry", id: question.id, choice, at: now() });
    if (choice !== question.correct) {
      setWrongChoice(choice);
      setMistake((n) => n + 1);
      play("wrong");
    } else if (!attempt?.rejected.length) {
      setBurst((n) => n + 1);
      play("success");
      advanceTraining();
    }
  }
  function finishCheck() {
    if (remaining && !confirmFinish) setConfirmFinish(true);
    else {
      store.send({ type: "finish", at: now() });
      setBurst(0);
      setConfirmFinish(false);
    }
  }
  function visitTraining(index: number) {
    cancelAdvance();
    setExplanation(false);
    transitionTask(() => {
      setBurst(0);
      setReviewingTask(
        run && trainingComplete(run, practice[index])
          ? practice[index].id
          : null,
      );
      store.send({ type: "practiceIndex", index });
    });
  }
  return (
    <View
      testID="video-lesson"
      style={{
        width: "100%",
        minHeight: height - 3,
        backgroundColor: background,
      }}
    >
      <View
        style={{
          paddingHorizontal: width < 600 ? 20 : 36,
          height: 64,
          justifyContent: "center",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="К карте"
          onPress={back}
          style={{
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="x" size={20} color="#A7B3BE" />
        </Pressable>
      </View>
      <MistakeWash trigger={mistake} />
      <ConstellationCelebration
        burst={burst}
        immersive
        duration={2100}
        silent
      />
      {completed &&
        reviewingTask === question?.id &&
        burst === 0 &&
        !explanation && (
          <ConstellationCelebration
            key={question?.id}
            burst={1}
            immersive
            persistent
            silent
          />
        )}
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: showVideo ? 1080 : 740,
          alignSelf: "center",
          paddingHorizontal: width < 380 ? 20 : width < 600 ? 26 : 40,
          paddingTop: prelude ? 0 : width < 600 ? 16 : 34,
          paddingBottom: 48,
          justifyContent: stage === "intro" ? "center" : undefined,
          gap: 26,
        }}
      >
        {!!store.error && (
          <View style={{ gap: 8 }}>
            <Txt accessibilityRole="alert" color={colors.red}>
              {store.error}
            </Txt>
            <QuietAction label="Повторить сохранение" onPress={store.retry} />
          </View>
        )}
        {prelude ? (
          <StagePrelude stage={prelude} onDone={() => setPrelude(null)} />
        ) : showVideo ? (
          <>
            <View
              style={{
                flexDirection: wide ? "row" : "column",
                gap: 30,
                alignItems: "flex-start",
              }}
            >
              <View
                style={{
                  flex: wide ? 1 : undefined,
                  width: wide ? undefined : "100%",
                  minWidth: 0,
                }}
              >
                {active && (
                  <YouTubePlayer
                    key={lessonVideo.id}
                    id={lessonVideo.id}
                    title={lessonVideo.title}
                    progress={progress}
                    onProgress={(progress) =>
                      store.send({
                        type: "video",
                        id: lessonVideo.id,
                        progress,
                      })
                    }
                    onWatched={() => award([videoEvent])}
                  />
                )}
              </View>
              <View style={{ width: wide ? 230 : "100%" }}>
                <VideoNotes notes={meta.notes} />
              </View>
            </View>
            {meta.videos.length > 1 && (
              <Fold title={`Видео по теме · ${meta.videos.length}`}>
                {meta.videos.map((video) => (
                  <QuietAction
                    key={video.id}
                    label={video.title}
                    onPress={() =>
                      store.send({ type: "selectVideo", id: video.id })
                    }
                  />
                ))}
              </Fold>
            )}
            <View style={{ alignItems: "flex-end" }}>
              <PrimaryAction
                arrow
                label={reviewVideo ? "К результату" : "К тренировке"}
                onPress={reviewVideo ? () => setReviewVideo(false) : sendNext}
              />
            </View>
          </>
        ) : stage === "result" ? (
          <>
            {oldRun && (
              <QuietAction
                label="Последний результат"
                onPress={() => setOldRun(null)}
              />
            )}
            <Result run={shownResult} />
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
          <Animated.View
            testID="lesson-tasks"
            style={{
              gap: 30,
              opacity: taskOpacity,
              flex: training ? 1 : undefined,
            }}
          >
            {training && (
              <View
                testID="training-stars"
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  gap: 4,
                  marginBottom: 16,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Предыдущая задача"
                  disabled={run.practiceIndex === 0}
                  accessibilityState={{ disabled: run.practiceIndex === 0 }}
                  onPress={() => visitTraining(run.practiceIndex - 1)}
                  style={{
                    width: 32,
                    height: 48,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: run.practiceIndex === 0 ? 0.2 : 1,
                  }}
                >
                  <Icon name="chevron-left" size={20} color="#AABEC0" />
                </Pressable>
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  {practice.map((q, index) => {
                    const lit = trainingComplete(run, q),
                      assisted = trainingAssisted(run, q);
                    const color = lit
                      ? assisted
                        ? "#E8C781"
                        : "#A1E4C4"
                      : "#54636C";
                    return (
                      <Pressable
                        key={q.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Задание ${index + 1}: ${lit ? (assisted ? "с разбором" : "верно") : "не завершено"}`}
                        accessibilityState={{
                          selected: run.practiceIndex === index,
                        }}
                        onPress={() => visitTraining(index)}
                        style={{
                          width: 40,
                          height: 48,
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <Svg width={25} height={25} viewBox="0 0 24 24">
                          <Path
                            d="M12 2L14.9 8.6L22 9.6L16.8 14.5L18 21.6L12 18.2L6 21.6L7.2 14.5L2 9.6L9.1 8.6Z"
                            stroke={color}
                            strokeWidth={1.1}
                            strokeLinejoin="round"
                            fill={lit ? color : "none"}
                          />
                        </Svg>
                        <View
                          style={{
                            height: 3,
                            width: 3,
                            borderRadius: 2,
                            backgroundColor:
                              run.practiceIndex === index
                                ? "#DDE9EA"
                                : "transparent",
                          }}
                        />
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Следующая задача"
                  disabled={
                    run.practiceIndex === practice.length - 1 && !completed
                  }
                  accessibilityState={{
                    disabled:
                      run.practiceIndex === practice.length - 1 && !completed,
                  }}
                  onPress={() => {
                    if (run.practiceIndex < practice.length - 1)
                      visitTraining(run.practiceIndex + 1);
                    else {
                      cancelAdvance();
                      transitionTask(() => {
                        setBurst(0);
                        setReviewingTask(null);
                        store.send({
                          type: "practiceContinue",
                          index: run.practiceIndex,
                        });
                      });
                    }
                  }}
                  style={{
                    width: 32,
                    height: 48,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity:
                      run.practiceIndex === practice.length - 1 && !completed
                        ? 0.2
                        : 1,
                  }}
                >
                  <Icon name="chevron-right" size={20} color="#AABEC0" />
                </Pressable>
              </View>
            )}
            {stage === "check" && (
              <Txt size={12} color="#B4A9CB" style={{ letterSpacing: 2 }}>
                ПРАКТИКА
              </Txt>
            )}
            {stage === "return" && (
              <Txt size={12} color="#B8C6CB" style={{ letterSpacing: 1 }}>
                ПОСМОТРИ ЕЩЁ РАЗ
              </Txt>
            )}
            <SoftReveal changeKey={question.id} style={{ gap: 26 }}>
              {stage === "intro" || stage === "return" ? (
                <OpeningQuestion question={question} />
              ) : (
                <Txt
                  size={width < 380 ? 21 : 24}
                  weight="400"
                  accessibilityRole="header"
                >
                  {question.prompt}
                </Txt>
              )}
              <Choices
                question={question}
                value={selected}
                disabled={!!submitted || !!attempt?.resolved}
                revealResult={
                  (training && (completed || !!attempt?.resolved)) ||
                  (stage === "return" && !!submitted)
                }
                rejected={training ? attempt?.rejected : undefined}
                wrongChoice={wrongChoice}
                mistake={mistake}
                onSelect={choose}
              />
            </SoftReveal>
            {training ? (
              <View
                style={{
                  alignItems: "flex-end",
                  justifyContent: "flex-end",
                  flex: 1,
                  minHeight: 68,
                  paddingTop: 20,
                }}
              >
                {completed && reviewingTask === question.id && (
                  <View style={{ alignSelf: "flex-end" }}>
                    <QuietAction
                      label="Почему?"
                      onPress={() => {
                        cancelAdvance();
                        setExplanation(true);
                      }}
                    />
                  </View>
                )}
              </View>
            ) : stage === "check" && control ? (
              <>
                {confirmFinish && remaining > 0 && (
                  <View style={{ gap: 4 }}>
                    <Txt
                      size={15}
                      color={colors.gold}
                      accessibilityRole="alert"
                    >
                      Без ответа: {remaining}. Они войдут в результат как
                      неверные.
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
                <TaskControls
                  index={run.checkIndex}
                  total={check.length}
                  finish={control.action === "finish"}
                  label={
                    control.action === "finish" ? "Завершить урок" : "Далее"
                  }
                  disabled={control.disabled}
                  onChange={(index) => {
                    setConfirmFinish(false);
                    transitionTask(() =>
                      store.send({ type: "checkIndex", index }),
                    );
                  }}
                  onAction={() =>
                    control.action === "finish"
                      ? finishCheck()
                      : transitionTask(() =>
                          store.send({
                            type: "checkContinue",
                            index: run.checkIndex,
                          }),
                        )
                  }
                />
              </>
            ) : !submitted ? (
              <View style={{ alignItems: "flex-end" }}>
                <PrimaryAction
                  label={stage === "intro" ? "Узнать ответ" : "Ответить"}
                  disabled={selected === undefined}
                  onPress={submitAnswer}
                />
              </View>
            ) : (
              <>
                {stage === "return" && <Comparison run={run} />}
                <View style={{ alignItems: "flex-end" }}>
                  <PrimaryAction label="К практике" arrow onPress={sendNext} />
                </View>
              </>
            )}
          </Animated.View>
        ) : null}
      </View>
      <Modal
        visible={!!explanation && !!question && active}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!needsExplanation) setExplanation(false);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#03070BE8",
            alignItems: "center",
            justifyContent: "center",
            padding: width < 380 ? 18 : 28,
          }}
        >
          <View
            accessibilityViewIsModal
            testID="answer-explanation-dialog"
            style={{
              width: "100%",
              maxWidth: 620,
              maxHeight: "85%",
              padding: width < 380 ? 22 : 32,
              borderRadius: 24,
              backgroundColor: "#172329",
              gap: 24,
            }}
          >
            <Txt accessibilityRole="header" size={24} weight="400">
              Почему так?
            </Txt>
            <ScrollView>
              <Txt testID="answer-explanation" prose size={18} weight="400">
                {question?.solution}
              </Txt>
            </ScrollView>
            <View style={{ alignItems: "flex-end" }}>
              <PrimaryAction
                label="Понятно"
                onPress={() => {
                  setExplanation(false);
                  if (needsExplanation && question) {
                    store.send({
                      type: "trainingAcknowledge",
                      id: question.id,
                    });
                    play("success");
                    advanceTraining(450);
                  }
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  rejected = [],
  wrongChoice,
  onSelect,
}: {
  question: Question;
  value?: number;
  disabled: boolean;
  revealResult: boolean;
  mistake: number;
  rejected?: number[];
  wrongChoice?: number;
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
      {question.choices.map((choice, i) => {
        const failed = rejected.includes(i) || (wrong && value === i);
        const optionDisabled = disabled || rejected.includes(i);
        const optionColor = failed ? "#F29BA7" : selectedColor;
        return (
          <AnswerShake
            key={i}
            trigger={failed && (wrongChoice === i || value === i) ? mistake : 0}
          >
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel={choice}
              accessibilityState={{
                checked: value === i,
                disabled: optionDisabled,
              }}
              aria-checked={value === i}
              disabled={optionDisabled}
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
                borderColor: failed
                  ? "#F29BA74D"
                  : value === i
                    ? optionColor
                    : "#FFFFFF12",
                borderRadius: 10,
                backgroundColor: failed
                  ? "#672D3B55"
                  : value === i
                    ? "#98DCC217"
                    : "#FFFFFF04",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 1,
                  borderColor: value === i || failed ? optionColor : "#74858C",
                  backgroundColor:
                    value === i || failed ? optionColor : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {(value === i || failed) &&
                  (revealResult || failed ? (
                    <Icon
                      name={failed ? "x" : "check"}
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
              <Txt size={16} weight="400" style={{ flex: 1 }}>
                {choice}
              </Txt>
            </Pressable>
          </AnswerShake>
        );
      })}
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
