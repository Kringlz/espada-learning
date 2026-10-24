import { LessonSceneContext, LessonScene } from "./src/components/LessonFocus";
import { lessonFromHash } from "./src/course/navigation";
import { SpaceBackdrop } from "./src/components/SpaceBackdrop";
import { AuthScreen } from "./src/screens/Auth";
import { Arena } from "./src/arena/Arena";
import { Calculator } from "./src/tools/Calculator";
import { StreakProvider } from "./src/engagement/StreakContext";
import { ClarityControls } from "./src/components/ClarityControls";
import { LessonFocus, FocusedLesson } from "./src/components/LessonFocus";
import { SoundProvider, useSounds } from "./src/engagement/Sounds";
import { RewardsProvider } from "./src/engagement/RewardContext";
import { RewardNotice } from "./src/engagement/LevelCard";
import { MotionActiveContext, SoftReveal } from "./src/components/Motion";
import { Parent } from "./src/screens/Family";
import { useUITheme } from "./src/components/ui";
import {
  ClarityThemeProvider,
  CosmicSurface,
  ThemeProvider,
  VideoLessonTheme,
} from "./src/theme/Theme";
import { Brand } from "./src/components/Brand";
import { CourseProgressProvider } from "./src/course/storage";
import { ScreenAnchor, ScreenScroll } from "./src/components/ScreenScroll";
import { isLessonPreview } from "./src/lessons/service";
import { ReportDetail } from "./src/screens/Reports";
import { translate } from "./src/i18n";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Modal,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
  BackHandler,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LearningProvider, useLearning } from "./src/services/context";
import { Home, Learn, Progress, Profile } from "./src/screens/Student";
import { Staff } from "./src/screens/Staff";
import { Lesson } from "./src/screens/Lesson";
import { Txt, Icon, Button, Card, Pill } from "./src/components/ui";
const navIcons: Record<string, any> = {
  Home: "compass",
  Arena: "zap",
  Calculator: "hash",
  FamilyProgress: "bar-chart-2",
  Homework: "book-open",
  Contacts: "phone",
  Learn: "map",
  Progress: "bar-chart-2",
  Profile: "user",
  Overview: "grid",
  Assessments: "clipboard",
  Students: "users",
  Curriculum: "book-open",
  Manage: "settings",
};
export default function App() {
  return (
    <ThemeProvider>
      <ClarityThemeProvider>
        <SoundProvider>
          <SafeAreaProvider>
            <LearningProvider
              fallback={(props) => (
                <VideoLessonTheme>
                  <AuthScreen {...props} />
                </VideoLessonTheme>
              )}
            >
              <Workspace />
            </LearningProvider>
          </SafeAreaProvider>
        </SoundProvider>
      </ClarityThemeProvider>
    </ThemeProvider>
  );
}
function Workspace() {
  const { actor } = useLearning();
  return (
    <StreakProvider key={actor.id}>
      <CourseProgressProvider key={actor.id} actorId={actor.id}>
        <RewardsProvider key={actor.id}>
          <Shell />
        </RewardsProvider>
      </CourseProgressProvider>
    </StreakProvider>
  );
}
function Shell() {
  const sounds = useSounds();
  const { colors, styles } = useUITheme();
  const {
    actor,
    accounts,
    switchAccount,
    saving,
    pendingCount,
    retryPending,
    error,
    clearError,
    mode,
    refresh,
  } = useLearning();
  const { width } = useWindowDimensions();
  const desktop = width >= 1000;
  const student = actor.role === "student" || actor.role === "parent";
  const { dark, setPreference } = useUITheme();
  const [tab, setTab] = useState(
    actor.role === "student"
      ? "Home"
      : actor.role === "parent"
        ? "FamilyProgress"
        : "Overview",
  );
  const [courseRequest, setCourseRequest] = useState<
    { id: string; key: number } | undefined
  >();
  const [learnVisited, setLearnVisited] = useState(false);
  const [progressVisited, setProgressVisited] = useState(false);
  const [topic, setTopic] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [focusedLesson, setFocusedLesson] = useState<FocusedLesson | null>(
    null,
  );
  const registerLesson = useCallback(
    (lesson: FocusedLesson | null, owner: string) => {
      setFocusedLesson(
        (current) => lesson ?? (current?.id === owner ? null : current),
      );
    },
    [],
  );
  const clarity = true;
  const focused = clarity && (!!topic || !!focusedLesson);
  const courseOrigin = useRef<string | null>(null);
  const leaveLesson = () => {
    if (topic) setTopic(null);
    else {
      focusedLesson?.exit();
      if (courseOrigin.current) {
        setTab(courseOrigin.current);
        courseOrigin.current = null;
      }
    }
  };

  const offsets = useRef<Record<string, number>>({});
  const routeKey = `${actor.id}:${topic ? `topic:${topic}` : result ? `result:${result}` : tab}`;
  const restoring = useRef(false);
  const selectedTab = topic ? "Learn" : result ? "Progress" : tab;
  const explorer = actor.role === "student";
  const [lessonScene, setLessonScene] = useState<LessonScene | null>(null);
  const immersiveLesson =
    explorer && tab === "Learn" && !!courseRequest && !topic && !result;
  const lessonColor = lessonScene?.color ?? "#0B111B";
  const inSpace = explorer && tab === "Home" && !topic && !result;
  function returnToSpace() {
    if (Platform.OS === "web" && window.location.hash.startsWith("#/"))
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}#/`,
      );
    courseOrigin.current = null;
    navigate("Home");
  }
  const [accountOpen, setAccountOpen] = useState(false);
  const scroller = useRef<ScrollView>(null);
  const scrollContent = useRef<View>(null);
  const scrollToAnchor = useCallback((node: View | null) => {
    if (node && scrollContent.current)
      node.measureLayout(
        scrollContent.current,
        (_x, y) => scroller.current?.scrollTo({ y, animated: false }),
        () => {},
      );
  }, []);
  const scrollStaffToTop = useCallback(() => {
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, []);
  const tabs =
    actor.role === "student"
      ? ["Home", "Progress", "Calculator"]
      : actor.role === "parent"
        ? ["FamilyProgress", "Homework", "Contacts"]
        : [
            "Overview",
            "Assessments",
            "Students",
            "Curriculum",
            "Arena",
            "Calculator",
            ...(actor.role === "admin" ? ["Manage"] : []),
          ];
  useEffect(() => {
    setTab(
      actor.role === "student"
        ? "Home"
        : actor.role === "parent"
          ? "FamilyProgress"
          : "Overview",
    );
    setTopic(null);
    setResult(null);
  }, [actor.id, actor.role]);
  useEffect(() => {
    restoring.current = true;
    const frame = requestAnimationFrame(() => {
      scroller.current?.scrollTo({
        y: offsets.current[routeKey] ?? 0,
        animated: false,
      });
      requestAnimationFrame(() => {
        restoring.current = false;
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [routeKey]);
  useEffect(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (topic) {
        setTopic(null);
        return true;
      }
      if (focusedLesson) {
        leaveLesson();
        return true;
      }
      if (result) {
        setResult(null);
        return true;
      }
      if (tab !== tabs[0]) {
        setTab(tabs[0]);
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [topic, tab, result, focusedLesson]);
  useEffect(() => {
    if (Platform.OS !== "web" || actor.role !== "student") return;
    const route = () => {
      const lessonId = lessonFromHash(window.location.hash);
      if (lessonId) {
        setCourseRequest({ id: lessonId, key: Date.now() });
        setLearnVisited(true);
        setTab("Learn");
        setTopic(null);
        setResult(null);
      } else {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}#/`,
        );
        setTab("Home");
        setTopic(null);
        setResult(null);
      }
    };
    route();
    window.addEventListener("hashchange", route);
    return () => window.removeEventListener("hashchange", route);
  }, [actor.id, actor.role]);
  function navigate(next: string) {
    sounds.play("navigate");
    setTopic(null);
    setResult(null);
    if (next === "Learn") setLearnVisited(true);
    if (next === "Progress") setProgressVisited(true);
    setTab(next);
  }
  const tabLabel = (name: string) =>
    name === "Arena"
      ? "Арена"
      : name === "Calculator"
        ? "Лаборатория"
        : actor.role === "parent"
          ? ({
              FamilyProgress: "Прогресс",
              Homework: "Задания",
              Contacts: "Учитель",
              Profile: "Профиль",
            }[name] ?? name)
          : actor.role === "student"
            ? ({
                Home: "Вселенная",
                Learn: "Созвездия",
                Progress: "Открытия",
                Profile: "Профиль",
              }[name] ?? translate(name))
            : translate(name);
  function openCourse(id: string) {
    courseOrigin.current = tab;
    if (Platform.OS === "web" && window.location.hash !== `#/lesson/${id}`) {
      window.location.hash = `/lesson/${id}`;
      return;
    }
    setCourseRequest({ id, key: Date.now() });
    navigate("Learn");
  }
  const nav = (mobile = false) => (
    <View
      style={{
        gap: mobile ? 4 : 7,
        flexDirection: mobile ? "row" : "column",
        justifyContent: mobile ? "space-around" : undefined,
      }}
    >
      {tabs.map((t) => (
        <Pressable
          key={t}
          accessibilityRole="tab"
          accessibilityLabel={tabLabel(t)}
          accessibilityState={{ selected: selectedTab === t }}
          aria-selected={selectedTab === t}
          onPress={() => navigate(t)}
          style={({ pressed }) => [
            {
              flexDirection: mobile ? "column" : "row",
              alignItems: "center",
              gap: clarity ? 7 : mobile ? 3 : 10,
              paddingHorizontal: mobile ? 3 : 12,
              paddingVertical: clarity ? 12 : mobile ? 8 : 10,
              minHeight: clarity ? 56 : undefined,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: selectedTab === t ? colors.line : "transparent",
              backgroundColor:
                selectedTab === t
                  ? student
                    ? clarity
                      ? colors.light
                      : "#304D3D"
                    : colors.light
                  : "transparent",
              opacity: pressed ? 0.7 : 1,
            },
            mobile ? { flex: 1 } : { minHeight: 48 },
          ]}
        >
          <Icon
            name={navIcons[t]}
            size={mobile ? 21 : 19}
            color={
              selectedTab === t
                ? student
                  ? clarity
                    ? colors.ink
                    : "#F5F3E5"
                  : colors.green
                : colors.muted
            }
          />
          {!mobile && (
            <Txt
              size={mobile ? 10 : 14}
              weight={selectedTab === t ? "600" : "400"}
              color={
                selectedTab === t
                  ? student
                    ? clarity
                      ? colors.ink
                      : "#F5F3E5"
                    : colors.green
                  : colors.muted
              }
            >
              {mobile && t === "Calculator" ? "Кальк." : tabLabel(t)}
            </Txt>
          )}
        </Pressable>
      ))}
    </View>
  );
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: immersiveLesson ? lessonColor : colors.paper,
      }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {explorer && (
          <View
            style={{
              position: "absolute",
              inset: 0,
              display: inSpace ? "flex" : "none",
            }}
          >
            <MotionActiveContext.Provider value={inSpace}>
              <Home
                openCourse={openCourse}
                openTopic={setTopic}
                navigate={navigate}
                openResult={setResult}
              />
            </MotionActiveContext.Provider>
          </View>
        )}
        <View
          pointerEvents={inSpace ? "box-none" : "auto"}
          style={{ flex: 1, flexDirection: "row" }}
        >
          {desktop && !focused && !explorer && (
            <View
              style={{
                width: 186,
                borderRightWidth: 1,
                borderColor: colors.line,
                padding: 20,
                gap: 40,
                backgroundColor: colors.paper,
              }}
            >
              <Brand />
              {nav()}
              <View style={{ flex: 1 }} />
              <View style={{ gap: 8 }}>
                <Icon name="star" size={17} color={colors.green} />
                <Txt size={12} color={colors.muted}>
                  Большие открытия начинаются с тебя
                </Txt>
              </View>
            </View>
          )}
          <View
            pointerEvents={inSpace ? "box-none" : "auto"}
            style={{
              flex: 1,
              minWidth: 0,
              backgroundColor: immersiveLesson
                ? lessonColor
                : !inSpace
                  ? "#080613"
                  : undefined,
            }}
          >
            {!inSpace && !immersiveLesson && <SpaceBackdrop />}
            {explorer && !inSpace && !immersiveLesson && (
              <View
                style={{
                  backgroundColor: colors.paper,
                  paddingHorizontal: desktop ? 36 : 22,
                  paddingVertical: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Вернуться в космос"
                  onPress={returnToSpace}
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Txt size={14} color={colors.ink}>
                    ← К карте
                  </Txt>
                </Pressable>
                <Brand />
              </View>
            )}
            <View
              style={{
                display: explorer ? "none" : "flex",
                paddingHorizontal: desktop ? 32 : 18,
                paddingVertical: 13,
                borderBottomWidth: 1,
                borderColor: colors.line,
                backgroundColor: colors.paper,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              {focused ? (
                <View style={[styles.row, { gap: 14, flexShrink: 1 }]}>
                  <Button
                    secondary
                    small
                    icon="arrow-left"
                    onPress={leaveLesson}
                  >
                    {actor.role === "student" ? "К созвездию" : "Назад"}
                  </Button>
                  <Brand compact={width < 600} />
                </View>
              ) : desktop ? (
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <Brand />
                </View>
              ) : clarity || student ? (
                <Brand />
              ) : desktop ? (
                <View style={styles.row}>
                  <Txt size={13} color={colors.muted}>
                    {actor.role === "student"
                      ? "My learning"
                      : "Staff workspace"}
                  </Txt>
                  <Txt color="#B6BDB1">/</Txt>
                  <Txt size={13} weight="600">
                    {topic
                      ? "Уроки и практика"
                      : result
                        ? "Результаты работ"
                        : tabLabel(tab)}
                  </Txt>
                </View>
              ) : (
                <Brand />
              )}
              {student && desktop && !clarity && nav()}
              <View style={[styles.row, { gap: clarity ? 8 : 4 }]}>
                {clarity && <ClarityControls />}
                {student && !clarity && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      sounds.enabled ? "Выключить звуки" : "Включить звуки"
                    }
                    onPress={sounds.toggle}
                    style={{
                      minWidth: 44,
                      minHeight: 44,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon
                      name={sounds.enabled ? "volume-2" : "volume-x"}
                      size={19}
                    />
                  </Pressable>
                )}
                {!clarity && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      dark ? "Включить светлую тему" : "Включить тёмную тему"
                    }
                    onPress={() => setPreference(dark ? "light" : "dark")}
                    style={{
                      padding: 10,
                      minWidth: 44,
                      minHeight: 44,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Icon name={dark ? "sun" : "moon"} size={20} />
                  </Pressable>
                )}
                {student && mode === "demo" && width >= 440 && (
                  <Pill tone="neutral">Демо</Pill>
                )}
                {desktop && !student && !clarity && (
                  <Pill tone="neutral">
                    {mode === "demo" ? "LOCAL DEMO" : "CONNECTED"}
                  </Pill>
                )}
                {!clarity && !student && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Обновить учебные данные"
                    onPress={() => void refresh()}
                    style={{ padding: 12, minWidth: 44, minHeight: 44 }}
                  >
                    <Icon name="refresh-cw" size={17} color={colors.muted} />
                  </Pressable>
                )}
                {!focused && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={"Открыть профиль"}
                    onPress={() => navigate("Profile")}
                    style={styles.row}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: colors.light,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Txt weight="600" size={13}>
                        {actor.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </Txt>
                    </View>
                    {desktop && <Txt size={15}>{actor.name.split(" ")[0]}</Txt>}
                    {width >= 500 && <Icon name="chevron-down" size={15} />}
                  </Pressable>
                )}
              </View>
            </View>
            {mode === "demo" && !clarity && !student && (
              <View
                style={{
                  paddingHorizontal: desktop ? 24 : 14,
                  paddingVertical: 8,
                  backgroundColor: colors.light,
                }}
              >
                <Txt size={11} color={colors.muted}>
                  {isLessonPreview
                    ? "Локальный предпросмотр · тестовые аккаунты · новые уроки и тесты в PostgreSQL"
                    : "Демо · данные сохраняются на этом устройстве"}
                </Txt>
              </View>
            )}
            {pendingCount > 0 && (
              <View
                style={{ backgroundColor: colors.light, padding: 14, gap: 8 }}
              >
                <Txt size={13}>
                  {pendingCount} learning change(s) are kept on this device and
                  awaiting confirmation. Reconnect and retry to update your
                  progress.
                </Txt>
                <Button
                  disabled={saving}
                  secondary
                  small
                  onPress={() => void retryPending()}
                >
                  Retry pending work
                </Button>
                {inSpace && (
                  <Button small secondary onPress={() => navigate("Profile")}>
                    Профиль
                  </Button>
                )}
              </View>
            )}
            {Boolean(error) && (
              <View
                style={{ backgroundColor: colors.light, padding: 15, gap: 8 }}
              >
                <Txt size={13} color={colors.red} accessibilityRole="alert">
                  {error}
                </Txt>
                <Button secondary small onPress={clearError}>
                  Dismiss
                </Button>
              </View>
            )}
            {immersiveLesson && (
              <View
                accessibilityRole="progressbar"
                accessibilityLabel="Прогресс урока"
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: Math.round((lessonScene?.progress ?? 0) * 100),
                }}
                testID="lesson-progress"
                style={{ height: 3, backgroundColor: "#FFFFFF06" }}
              >
                <View
                  style={{
                    height: 3,
                    width: `${(lessonScene?.progress ?? 0) * 100}%`,
                    backgroundColor: "#B6D2CC66",
                  }}
                />
              </View>
            )}
            <LessonSceneContext.Provider value={setLessonScene}>
              <CosmicSurface>
                <LessonFocus.Provider value={registerLesson}>
                  <ScreenScroll.Provider value={scrollStaffToTop}>
                    <ScreenAnchor.Provider value={scrollToAnchor}>
                      <ScrollView
                        style={{ display: inSpace ? "none" : "flex" }}
                        ref={scroller}
                        scrollEventThrottle={16}
                        onScroll={(event) => {
                          if (!restoring.current)
                            offsets.current[routeKey] =
                              event.nativeEvent.contentOffset.y;
                        }}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{
                          paddingHorizontal: immersiveLesson
                            ? 0
                            : desktop
                              ? 32
                              : 18,
                          paddingTop: immersiveLesson ? 0 : desktop ? 26 : 20,
                          paddingBottom: immersiveLesson ? 0 : 40,
                          alignItems: "center",
                        }}
                      >
                        <View
                          ref={scrollContent}
                          collapsable={false}
                          style={{
                            width: "100%",
                            maxWidth: immersiveLesson ? undefined : 1380,
                          }}
                        >
                          {actor.role === "student" ? (
                            <SoftReveal
                              key={actor.id}
                              changeKey={routeKey}
                              testID="student-screen-transition"
                            >
                              <View
                                style={{
                                  display:
                                    !topic && !result && tab === "Learn"
                                      ? "flex"
                                      : "none",
                                }}
                              >
                                {learnVisited && (
                                  <MotionActiveContext.Provider
                                    value={tab === "Learn" && !topic && !result}
                                  >
                                    <Learn
                                      courseRequest={courseRequest}
                                      back={returnToSpace}
                                    />
                                  </MotionActiveContext.Provider>
                                )}
                              </View>
                              <View
                                style={{
                                  display:
                                    !topic && !result && tab === "Progress"
                                      ? "flex"
                                      : "none",
                                }}
                              >
                                {progressVisited && (
                                  <Progress
                                    active={
                                      tab === "Progress" && !topic && !result
                                    }
                                    openCourse={openCourse}
                                    openResult={setResult}
                                    openTopic={setTopic}
                                  />
                                )}
                              </View>
                              {!topic && !result && tab === "Arena" && (
                                <Arena />
                              )}
                              {!topic && !result && tab === "Calculator" && (
                                <VideoLessonTheme>
                                  <Calculator />
                                </VideoLessonTheme>
                              )}
                              {!topic && !result && tab === "Profile" && (
                                <Profile
                                  switchDemo={() => setAccountOpen(true)}
                                />
                              )}
                              {result && (
                                <View
                                  style={{ display: topic ? "none" : "flex" }}
                                >
                                  <ReportDetail
                                    key={result}
                                    id={result}
                                    back={() => setResult(null)}
                                    openTopic={setTopic}
                                  />
                                </View>
                              )}
                              {topic && (
                                <Lesson
                                  key={`${actor.id}-${topic}`}
                                  topicId={topic}
                                  back={() => setTopic(null)}
                                  openTopic={setTopic}
                                />
                              )}
                            </SoftReveal>
                          ) : tab === "Arena" ? (
                            <Arena />
                          ) : tab === "Calculator" ? (
                            <VideoLessonTheme>
                              <Calculator />
                            </VideoLessonTheme>
                          ) : tab === "Profile" ? (
                            <Profile switchDemo={() => setAccountOpen(true)} />
                          ) : actor.role === "parent" ? (
                            <Parent key={actor.id} tab={tab} />
                          ) : (
                            <Staff
                              key={`${actor.id}-${tab}`}
                              tab={tab}
                              onScreenChange={scrollStaffToTop}
                            />
                          )}
                        </View>
                        {(saving || isLessonPreview) && (
                          <View style={{ marginTop: 20 }}>
                            <Txt size={11} color={colors.muted}>
                              {saving
                                ? "Saving…"
                                : mode === "demo"
                                  ? isLessonPreview
                                    ? "Новые уроки и тесты сохраняются в локальной PostgreSQL."
                                    : "Your demo workspace saves on this device."
                                  : "Connected to your learning organisation."}
                            </Txt>
                          </View>
                        )}
                      </ScrollView>
                    </ScreenAnchor.Provider>
                  </ScreenScroll.Provider>
                </LessonFocus.Provider>
              </CosmicSurface>
            </LessonSceneContext.Provider>
            {student && <RewardNotice />}
            {!desktop && !focused && !explorer && (
              <View
                style={{
                  backgroundColor: colors.white,
                  borderTopWidth: 1,
                  borderColor: colors.line,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                }}
              >
                <View
                  style={{
                    width: "100%",
                    maxWidth: clarity
                      ? tabs.length > 3
                        ? 480
                        : 360
                      : undefined,
                    alignSelf: "center",
                  }}
                >
                  {nav(true)}
                </View>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
      <Modal
        transparent
        visible={accountOpen}
        animationType="none"
        onRequestClose={() => setAccountOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#142A2266",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Card style={{ width: "100%", maxWidth: 460, maxHeight: "90%" }}>
            <Txt size={24} weight="600">
              Выберите роль и аккаунт
            </Txt>
            <Txt size={13} color={colors.muted}>
              {process.env.EXPO_PUBLIC_PROGRESS_PREVIEW_URL
                ? "Тестовые аккаунты. Прогресс и школьные работы сохраняются в отдельной локальной базе."
                : "Учебные аккаунты. Изменения сохраняются только на этом устройстве."}
            </Txt>
            <ScrollView>
              {accounts.map((p) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Переключиться на аккаунт ${p.name}`}
                  onPress={() =>
                    void switchAccount(p.id).then(() => setAccountOpen(false))
                  }
                  style={[
                    styles.row,
                    {
                      padding: 14,
                      marginBottom: 7,
                      borderRadius: 10,
                      backgroundColor:
                        p.id === actor.id ? colors.light : colors.white,
                    },
                  ]}
                >
                  <Icon
                    name={
                      p.role === "student"
                        ? "user"
                        : p.role === "teacher"
                          ? "briefcase"
                          : "shield"
                    }
                  />
                  <View style={{ flex: 1 }}>
                    <Txt weight="600">{p.name}</Txt>
                    <Txt size={12} color={colors.muted}>
                      {
                        {
                          student: "Ученик",
                          parent: "Родитель",
                          teacher: "Учитель",
                          admin: "Администратор",
                        }[p.role]
                      }
                    </Txt>
                  </View>
                  {p.id === actor.id && <Icon name="check" />}
                </Pressable>
              ))}
            </ScrollView>
            <Button secondary onPress={() => setAccountOpen(false)}>
              Close
            </Button>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
