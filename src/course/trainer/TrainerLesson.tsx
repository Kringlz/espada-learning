import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Path } from "react-native-svg";
import { Icon, useUITheme } from "../../components/ui";
import { MathCopy as Txt } from "../../math/MathCopy";
import { YouTubePlayer } from "../../components/YouTubePlayer";
import { useCourseProgress } from "../storage";
import { useScreenScroll } from "../../components/ScreenScroll";
import {
  ConstellationCelebration,
  MotionActiveContext,
  SoftReveal,
  useReducedMotion,
} from "../../components/Motion";
import { useLessonScene } from "../../components/LessonFocus";
import { useSounds } from "../../engagement/Sounds";
import { useRewards } from "../../engagement/RewardContext";
import { VideoLessonTheme } from "../../theme/Theme";
import { ReferenceRecord } from "../../tools/reference/ReferenceRecord";
import {
  Choices,
  Fold,
  OpeningQuestion,
  PrimaryAction,
  QuietAction,
  VideoNotes,
} from "../videoLesson/VideoLesson";
import {
  LessonLoading,
  MistakeWash,
  StagePrelude,
} from "../videoLesson/LessonAtmosphere";
import { getLessonContent, getLessonMeta } from "../videoLesson/content";
import { useLesson } from "../videoLesson/useLesson";
import { videoProgress } from "../videoLesson/model";
import {
  newTrainer,
  reduceTrainer,
  TrainerAction,
  sessionQuestion,
} from "./model";
import { topicReferences } from "./topics";
import { trainerModules } from "./modules";
import { moduleSetComplete } from "./moduleProgress";
import type { TopicProgress } from "../model";
import { trainerOpening } from "./opening";

type Props = { actorId: string; lessonId: string; back: () => void };
export function TrainerLesson(props: Props) {
  return (
    <VideoLessonTheme>
      <Lesson {...props} />
    </VideoLessonTheme>
  );
}
function Lesson({ actorId, lessonId, back }: Props) {
  const rawStorage = useCourseProgress(actorId);
  const entry = rawStorage.progress[lessonId];
  const modules = trainerModules(lessonId);
  const selectedModule =
    entry?.selectedModule ?? (entry?.trainer ? "legacy" : modules[0]?.id);
  const module = modules.find((m) => m.id === selectedModule);
  const storage = {
    ...rawStorage,
    progress: {
      ...rawStorage.progress,
      [lessonId]: {
        ...entry,
        trainer: module ? entry?.modulePractice?.[module.id] : entry?.trainer,
      },
    },
    update: (
      id: string,
      patch:
        Partial<TopicProgress> | ((p: TopicProgress) => Partial<TopicProgress>),
    ) =>
      rawStorage.update(id, (current) => {
        const view = {
          ...current,
          trainer: module
            ? current.modulePractice?.[module.id]
            : current.trainer,
        };
        const next = typeof patch === "function" ? patch(view) : patch;
        return module && next.trainer
          ? {
              modulePractice: {
                ...current.modulePractice,
                [module.id]: { ...next.trainer, moduleId: module.id },
              },
            }
          : next;
      }),
  };
  const videoStore = useLesson(actorId, AsyncStorage, lessonId);
  const { colors } = useUITheme();
  const { width, height } = useWindowDimensions();
  const active = useContext(MotionActiveContext);
  const reduced = useReducedMotion();
  const { play } = useSounds();
  const { award } = useRewards();
  const meta = getLessonMeta(lessonId);
  const opening = trainerOpening(
    lessonId,
    getLessonContent({
      lessonId,
      contentVersion: meta.version,
    }).opening,
  );
  const video =
    meta.videos.find(
      (v) => v.id === (module?.videoId ?? videoStore.data.selectedVideo),
    ) ?? meta.videos[0];
  const session = storage.progress[lessonId]?.trainer;
  const [stage, changeStage] = useState<"intro" | "video" | "practice">(
    "intro",
  );
  const restored = useRef(false);
  useEffect(() => {
    if (!rawStorage.ready || restored.current) return;
    restored.current = true;
    changeStage(entry?.trainerStage ?? "intro");
    if (session?.finished)
      storage.update(lessonId, {
        trainer: reduceTrainer(session, lessonId, { type: "continue" }),
      });
  }, [rawStorage.ready]);
  function setStage(value: "intro" | "video" | "practice") {
    changeStage(value);
    rawStorage.update(lessonId, { trainerStage: value });
  }
  function selectModule(id: string) {
    stopTaskMotion();
    setLeaving(false);
    setReview(null);
    setExplanation(false);
    setShowFormulas(false);
    setPrelude(false);
    answering.current = false;
    rawStorage.update(lessonId, { selectedModule: id, trainerStage: "video" });
    const nextModule = modules.find((m) => m.id === id);
    if (nextModule?.videoId)
      videoStore.send({ type: "selectVideo", id: nextModule.videoId });
    changeStage("video");
  }
  const [introChoice, setIntroChoice] = useState<number>();
  const [prelude, setPrelude] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);
  const [explanation, setExplanation] = useState(false);
  const [review, setReview] = useState<number | null>(null);
  const [burst, setBurst] = useState(0);
  const [mistake, setMistake] = useState(0);
  const taskOpacity = useRef(new Animated.Value(1)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const moving = useRef(false);
  const answering = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [leaving, setLeaving] = useState(false);
  const finished = stage === "practice" && leaving;
  const canProceed = module
    ? moduleSetComplete(lessonId, session)
    : !!session && session.correct + session.incorrect > 0;
  useEffect(() => {
    if (!leaving || !active) return;
    const timeout = setTimeout(
      () => {
        setLeaving(false);
        const following = module && modules[modules.indexOf(module) + 1];
        if (following) selectModule(following.id);
        else back();
      },
      reduced ? 500 : 1800,
    );
    return () => clearTimeout(timeout);
  }, [leaving, active]);
  const cursor = review ?? session?.cursor ?? 0;
  const question = session
    ? sessionQuestion(lessonId, session, cursor)
    : undefined;
  const answer = session?.answers[cursor];
  const submitted = review !== null ? !!answer : !!session?.submitted;
  const rejected =
    review !== null ? (answer?.rejected ?? []) : (session?.rejected ?? []);
  const selected =
    review !== null ? answer?.choice : (session?.choice ?? undefined);
  const background = stage === "practice" && !finished ? "#0B1719" : "#0B111B";
  useLessonScene(
    background,
    finished ? 1 : stage === "practice" ? 2 / 3 : stage === "video" ? 1 / 3 : 0,
  );
  useScreenScroll(`${lessonId}:${stage}:${cursor}:${finished}:${prelude}`);
  function cancelAdvance() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }
  useEffect(() => {
    const entry = setTimeout(() => setLoaded(true), 420);
    const sub = AppState.addEventListener("change", () => cancelAdvance());
    return () => {
      clearTimeout(entry);
      cancelAdvance();
      animation.current?.stop();
      sub.remove();
    };
  }, []);
  useEffect(() => {
    if (!active) {
      cancelAdvance();
      animation.current?.stop();
      moving.current = false;
      taskOpacity.setValue(1);
      setBurst(0);
    }
  }, [active]);
  useEffect(() => {
    answering.current = false;
  }, [session?.cursor, session?.seed, session?.rejected.length]);
  function act(action: TrainerAction) {
    if (!session) return;
    storage.update(lessonId, (current) => ({
      trainer: reduceTrainer(
        current.trainer ?? session,
        lessonId,
        action,
        session.cursor,
      ),
    }));
  }
  function transitionTask(move: () => void) {
    cancelAdvance();
    if (moving.current) return;
    setBurst(0);
    if (reduced) {
      move();
      return;
    }
    moving.current = true;
    animation.current = Animated.timing(taskOpacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: Platform.OS !== "web",
    });
    animation.current.start(({ finished }) => {
      if (!finished) return;
      move();
      animation.current = Animated.timing(taskOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: Platform.OS !== "web",
      });
      animation.current.start(() => {
        moving.current = false;
      });
    });
  }
  function next() {
    transitionTask(() => {
      if (review !== null)
        setReview(review + 1 < (session?.cursor ?? 0) ? review + 1 : null);
      else act({ type: "next" });
    });
  }
  function stopTaskMotion() {
    cancelAdvance();
    animation.current?.stop();
    moving.current = false;
    taskOpacity.setValue(1);
    setBurst(0);
  }
  function finish() {
    if (!canProceed || leaving) return;
    setLeaving(true);
    stopTaskMotion();
    setReview(null);
    setExplanation(false);
    setShowFormulas(false);
    // Finish the latest stored cursor even if an automatic transition just advanced it.
    storage.update(lessonId, (current) =>
      current.trainer
        ? {
            trainer: reduceTrainer(current.trainer, lessonId, {
              type: "finish",
            }),
          }
        : {},
    );
  }
  function start(fresh = false) {
    stopTaskMotion();
    setReview(null);
    setExplanation(false);
    setBurst(0);
    answering.current = false;
    if (!session || fresh)
      storage.update(lessonId, {
        trainer: newTrainer(Date.now(), session, module?.id),
      });
    else if (session.finished) act({ type: "continue" });
    setStage("practice");
    setPrelude(true);
  }
  function choose(choice: number) {
    if (
      !session ||
      !question ||
      submitted ||
      rejected.includes(choice) ||
      review !== null ||
      answering.current ||
      moving.current
    )
      return;
    answering.current = true;
    storage.update(lessonId, (current) => ({
      trainer: reduceTrainer(
        reduceTrainer(
          current.trainer ?? session,
          lessonId,
          { type: "select", choice },
          session.cursor,
        ),
        lessonId,
        { type: "submit" },
        session.cursor,
      ),
    }));
    if (choice === question.correct) {
      award(
        [{ kind: "question", id: `trainer:${lessonId}:${question.id}` }],
        false,
      );
      play("success");
      setBurst((n) => n + 1);
      timer.current = setTimeout(
        () => {
          timer.current = null;
          if (rejected.length === 0) next();
          else setExplanation(true);
        },
        reduced ? 800 : 2000,
      );
    } else {
      play("wrong");
      setMistake((n) => n + 1);
      if (rejected.length + 1 >= question.choices.length - 1) {
        timer.current = setTimeout(() => {
          timer.current = null;
          setExplanation(true);
        }, 450);
      }
    }
  }
  function inspect(index: number) {
    transitionTask(() => setReview(index === session?.cursor ? null : index));
  }
  const earliest = session
    ? Math.min(session.cursor, ...Object.keys(session.answers).map(Number))
    : 0;
  const first = Math.max(earliest, cursor - 2);
  const stars = session
    ? Array.from(
        { length: Math.min(5, session.cursor - first + 1) },
        (_, i) => first + i,
      )
    : [];
  const counters = session && (
    <View
      testID="trainer-counters"
      accessibilityLiveRegion="polite"
      style={{ flexDirection: "row", alignItems: "center", gap: 18 }}
    >
      <View
        accessible
        accessibilityLabel={`Верно: ${session.correct}`}
        style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
      >
        <Icon name="check" size={16} color={colors.green} />
        <Txt size={16} color={colors.green}>
          {session.correct}
        </Txt>
      </View>
      <View
        accessible
        accessibilityLabel={`Ошибок: ${session.incorrect}`}
        style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
      >
        <Icon name="x" size={16} color={colors.red} />
        <Txt size={16} color={colors.red}>
          {session.incorrect}
        </Txt>
      </View>
    </View>
  );
  return (
    <View
      testID="topic-trainer"
      style={{
        width: "100%",
        minHeight: height - 3,
        backgroundColor: background,
      }}
    >
      <View
        style={{
          paddingHorizontal: width < 600 ? 24 : 40,
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
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: stage === "video" ? 1080 : 740,
          alignSelf: "center",
          paddingHorizontal: width < 380 ? 24 : width < 600 ? 28 : 44,
          paddingTop: prelude ? 0 : width < 600 ? 16 : 34,
          paddingBottom: 48,
          justifyContent: stage === "intro" ? "center" : undefined,
          gap: 26,
        }}
      >
        {!!storage.error && (
          <View style={{ gap: 8 }}>
            <Txt accessibilityRole="alert" color={colors.red}>
              {storage.error}
            </Txt>
            <QuietAction label="Повторить" onPress={storage.retry} />
          </View>
        )}
        {rawStorage.ready &&
          modules.length > 0 &&
          !finished &&
          review === null && (
            <View style={{ gap: 16 }}>
              <View
                accessibilityLabel="Модули"
                style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}
              >
                {modules.map((m, i) => {
                  const done = moduleSetComplete(
                    lessonId,
                    entry?.modulePractice?.[m.id],
                  );
                  const chosen = m.id === selectedModule;
                  return (
                    <Pressable
                      key={m.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Модуль ${i + 1}: ${m.title}${done ? ", набор выполнен" : ""}`}
                      accessibilityState={{ selected: chosen }}
                      onPress={() => selectModule(m.id)}
                      style={{
                        minWidth: 40,
                        height: 40,
                        flex: 1,
                        maxWidth: 72,
                        alignItems: "center",
                        justifyContent: "center",
                        borderBottomWidth: 2,
                        borderBottomColor: chosen
                          ? "#D2EAE0"
                          : done
                            ? "#72AD96"
                            : "#FFFFFF20",
                      }}
                    >
                      {done ? (
                        <Icon
                          name="check"
                          size={17}
                          color={chosen ? "#D2EAE0" : "#72AD96"}
                        />
                      ) : (
                        <Txt size={14} color={chosen ? "#D2EAE0" : "#64777F"}>
                          {i + 1}
                        </Txt>
                      )}
                    </Pressable>
                  );
                })}
                {!!entry?.trainer && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Прежняя практика"
                    onPress={() => selectModule("legacy")}
                    style={{
                      width: 40,
                      height: 40,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="clock" size={17} color="#8DA49C" />
                  </Pressable>
                )}
              </View>
              {stage !== "intro" && (
                <View style={{ flexDirection: "row", gap: 24 }}>
                  <QuietAction
                    label="Теория"
                    onPress={() => {
                      stopTaskMotion();
                      setStage("video");
                    }}
                  />
                  <QuietAction label="Практика" onPress={() => start()} />
                </View>
              )}
            </View>
          )}
        {!loaded || !storage.ready ? (
          <LessonLoading />
        ) : prelude ? (
          <StagePrelude stage="practice" onDone={() => setPrelude(false)} />
        ) : stage === "intro" ? (
          <SoftReveal changeKey="intro" style={{ gap: 26 }}>
            <OpeningQuestion question={opening} />
            <Choices
              question={opening}
              value={introChoice}
              disabled={false}
              revealResult={false}
              mistake={0}
              onSelect={setIntroChoice}
            />
            <View style={{ alignItems: "flex-end" }}>
              <PrimaryAction
                label="Разобраться"
                disabled={introChoice === undefined}
                onPress={() => setStage("video")}
              />
            </View>
            {!!session && (
              <QuietAction
                label="Продолжить тренировку"
                onPress={() => start()}
              />
            )}
          </SoftReveal>
        ) : stage === "video" ? (
          <>
            <View
              style={{
                flexDirection: width >= 1100 ? "row" : "column",
                gap: 30,
                alignItems: "flex-start",
              }}
            >
              <View
                style={{
                  flex: width >= 1100 ? 1 : undefined,
                  width: width >= 1100 ? undefined : "100%",
                  minWidth: 0,
                }}
              >
                {active && videoStore.ready && (!module || module.videoId) && (
                  <YouTubePlayer
                    key={video.id}
                    id={video.id}
                    title={video.title}
                    progress={videoProgress(
                      videoStore.data,
                      lessonId,
                      video.id,
                    )}
                    onProgress={(progress) =>
                      videoStore.send({ type: "video", id: video.id, progress })
                    }
                    onWatched={() =>
                      award([{ kind: "video", id: `youtube:${video.id}` }])
                    }
                  />
                )}
              </View>
              <View style={{ width: width >= 1100 ? 230 : "100%" }}>
                <VideoNotes notes={module?.notes ?? meta.notes} />
              </View>
            </View>
            {!modules.length && meta.videos.length > 1 && (
              <Fold title={`Видео по теме · ${meta.videos.length}`}>
                {meta.videos.map((item) => (
                  <QuietAction
                    key={item.id}
                    label={item.title}
                    onPress={() =>
                      videoStore.send({ type: "selectVideo", id: item.id })
                    }
                  />
                ))}
              </Fold>
            )}
            <Fold title="Конспект">
              <View style={{ gap: 18 }}>
                {(module?.notes ?? meta.notes).map((note, i) => (
                  <Txt key={i} prose size={18}>
                    {note}
                  </Txt>
                ))}
              </View>
            </Fold>
            <View style={{ alignItems: "flex-end" }}>
              <PrimaryAction
                arrow
                label="К тренировке"
                onPress={() => start()}
              />
            </View>
          </>
        ) : finished && session ? (
          <SoftReveal
            testID="trainer-result"
            changeKey="result"
            style={{
              minHeight: 340,
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
            }}
          >
            <ConstellationCelebration
              burst={1}
              immersive
              silent
              duration={1800}
            />
            <Icon name="check" size={42} color="#A1E4C4" />
            <Txt size={26} weight="400">
              {session.correct}
            </Txt>
          </SoftReveal>
        ) : session && question ? (
          <Animated.View
            testID="lesson-tasks"
            style={{ gap: 30, flex: 1, opacity: taskOpacity }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {review === null && counters}
            </View>
            <View
              testID="training-stars"
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                marginBottom: 16,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Предыдущая задача"
                disabled={!session.answers[cursor - 1]}
                onPress={() => inspect(cursor - 1)}
                style={{
                  width: 32,
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: session.answers[cursor - 1] ? 1 : 0.2,
                }}
              >
                <Icon name="chevron-left" size={20} color="#AABEC0" />
              </Pressable>
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  justifyContent: "center",
                }}
              >
                {stars.map((index) => {
                  const saved = session.answers[index];
                  const right =
                    !saved?.rejected?.length &&
                    saved?.choice ===
                      sessionQuestion(lessonId, session, index).correct;
                  const color = saved
                    ? right && !saved.hints
                      ? "#A1E4C4"
                      : "#E8C781"
                    : "#54636C";
                  return (
                    <Pressable
                      key={index}
                      accessibilityRole="button"
                      accessibilityLabel={`Задание ${index + 1}: ${saved ? (right ? "верно" : "с разбором") : "не завершено"}`}
                      accessibilityState={{ selected: cursor === index }}
                      onPress={() => inspect(index)}
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
                          fill={saved ? color : "none"}
                        />
                      </Svg>
                      <View
                        style={{
                          height: 3,
                          width: 3,
                          borderRadius: 2,
                          backgroundColor:
                            cursor === index ? "#DDE9EA" : "transparent",
                        }}
                      />
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Следующая задача"
                disabled={!submitted}
                onPress={next}
                style={{
                  width: 32,
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: submitted ? 1 : 0.2,
                }}
              >
                <Icon name="chevron-right" size={20} color="#AABEC0" />
              </Pressable>
            </View>
            {review !== null && submitted ? (
              <View
                testID="completed-task-review"
                style={{
                  minHeight: 360,
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingBottom: 30,
                  overflow: "hidden",
                }}
              >
                {!explanation && (
                  <ConstellationCelebration
                    key={cursor}
                    burst={1}
                    immersive
                    persistent
                    silent
                  />
                )}
                <View style={{ zIndex: 1001 }}>
                  <QuietAction
                    label="Почему?"
                    onPress={() => setExplanation(true)}
                  />
                </View>
              </View>
            ) : (
              <>
                <SoftReveal
                  changeKey={`${session.seed}:${cursor}`}
                  style={{ gap: 26 }}
                >
                  <Txt
                    size={width < 380 ? 21 : 24}
                    weight="400"
                    accessibilityRole="header"
                  >
                    {question.prompt}
                  </Txt>
                  <Choices
                    question={question}
                    value={selected}
                    disabled={submitted}
                    rejected={rejected}
                    revealResult={submitted}
                    mistake={mistake}
                    wrongChoice={selected}
                    onSelect={choose}
                  />
                </SoftReveal>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <QuietAction
                    label="Формулы"
                    icon="book-open"
                    onPress={() => {
                      cancelAdvance();
                      setShowFormulas(true);
                    }}
                  />
                  {submitted ? (
                    <QuietAction
                      label="Почему?"
                      onPress={() => {
                        cancelAdvance();
                        setExplanation(true);
                      }}
                    />
                  ) : (
                    <QuietAction
                      label="Подсказка"
                      onPress={() => act({ type: "hint" })}
                    />
                  )}
                </View>
                {!submitted &&
                  question.hints.slice(0, session.hints).map((hint, index) => (
                    <Txt key={index} prose size={16} color={colors.muted}>
                      {hint}
                    </Txt>
                  ))}
              </>
            )}
          </Animated.View>
        ) : null}
        {stage === "practice" &&
          session &&
          !finished &&
          !prelude &&
          review === null && (
            <PrimaryAction
              large
              arrow
              label="Дальше"
              disabled={!canProceed}
              onPress={finish}
            />
          )}
      </View>
      <Modal
        visible={active && (explanation || showFormulas)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setExplanation(false);
          setShowFormulas(false);
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
            testID={
              showFormulas ? "trainer-formulas" : "answer-explanation-dialog"
            }
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
              {showFormulas ? "Формулы" : "Почему так?"}
            </Txt>
            <ScrollView>
              {showFormulas ? (
                topicReferences(lessonId).map((item) => (
                  <ReferenceRecord
                    key={item.id}
                    item={item}
                    showTopic={false}
                  />
                ))
              ) : (
                <Txt testID="answer-explanation" prose size={18} weight="400">
                  {question?.solution}
                </Txt>
              )}
            </ScrollView>
            <View style={{ alignItems: "flex-end" }}>
              <PrimaryAction
                label="Понятно"
                onPress={() => {
                  const advance = explanation && review === null;
                  setExplanation(false);
                  setShowFormulas(false);
                  if (advance) next();
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
