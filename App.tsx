import { Parent } from "./src/screens/Family";
import { useUITheme } from "./src/components/ui";
import { ThemeProvider } from "./src/theme/Theme";
import { Brand } from "./src/components/Brand";
import { CourseProgressProvider } from "./src/course/storage";
import { ScreenScroll } from "./src/components/ScreenScroll";
import { isLessonPreview } from "./src/lessons/service";
import { ReportDetail } from "./src/screens/Reports";
import { errorMessage } from "./src/i18n/errors";
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
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LearningProvider, useLearning } from "./src/services/context";
import { Home, Learn, Progress, Profile } from "./src/screens/Student";
import { Staff } from "./src/screens/Staff";
import { Lesson } from "./src/screens/Lesson";
import {
  Txt,
  Icon,
  Button,
  Card,
  Pill,
  Field,
  colors,
  styles,
} from "./src/components/ui";
import { mode } from "./src/services/supabase";
const navIcons: Record<string, any> = {
  Home: "home",
  FamilyProgress: "bar-chart-2",
  Homework: "book-open",
  Contacts: "phone",
  Learn: "book-open",
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
      <SafeAreaProvider>
        <LearningProvider fallback={(props) => <Welcome {...props} />}>
          <Workspace />
        </LearningProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
function Workspace() {
  const { actor } = useLearning();
  return (
    <CourseProgressProvider key={actor.id} actorId={actor.id}>
      <Shell />
    </CourseProgressProvider>
  );
}
function Welcome({
  loading,
  error,
  retry,
  login,
}: {
  loading: boolean;
  error: string | null;
  retry: () => void;
  login: (e: string, p: string) => Promise<void>;
}) {
  const { colors, styles } = useUITheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <Card style={{ maxWidth: 470, width: "100%", gap: 20 }}>
          <Brand />
          <Txt size={30} weight="600">
            A little progress, every day.
          </Txt>
          {loading ? (
            <ActivityIndicator color={colors.green} />
          ) : (
            <>
              {Boolean(error || message) && (
                <Txt color={colors.red} accessibilityRole="alert">
                  {error || message}
                </Txt>
              )}
              {mode === "supabase" ? (
                <>
                  <Txt color={colors.muted}>
                    Sign in with the account from your tutoring organisation.
                  </Txt>
                  <Field label="Email" value={email} onChangeText={setEmail} />
                  <Field
                    label="Password"
                    secure
                    value={password}
                    onChangeText={setPassword}
                  />
                  <Button
                    disabled={busy || !email || !password}
                    onPress={() => {
                      setBusy(true);
                      void login(email.trim(), password)
                        .catch((e) => setMessage(errorMessage(e)))
                        .finally(() => setBusy(false));
                    }}
                  >
                    Sign in
                  </Button>
                </>
              ) : (
                <Button onPress={retry}>Retry loading local demo</Button>
              )}
            </>
          )}
        </Card>
      </View>
    </SafeAreaView>
  );
}
function Shell() {
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
  const [topic, setTopic] = useState<string | null>(null);
  const [showHistoryRequest, setShowHistoryRequest] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const offsets = useRef<Record<string, number>>({});
  const routeKey = `${actor.id}:${topic ? `topic:${topic}` : result ? `result:${result}` : tab}`;
  const restoring = useRef(false);
  const selectedTab = topic ? "Learn" : result ? "Progress" : tab;
  const [accountOpen, setAccountOpen] = useState(false);
  const scroller = useRef<ScrollView>(null);
  const scrollStaffToTop = useCallback(() => {
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, []);
  const tabs =
    actor.role === "student"
      ? ["Home", "Learn", "Progress"]
      : actor.role === "parent"
        ? ["FamilyProgress", "Homework", "Contacts"]
        : [
            "Overview",
            "Assessments",
            "Students",
            "Curriculum",
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
  }, [topic, tab, result]);
  function navigate(next: string) {
    setTopic(null);
    setResult(null);
    setTab(next);
  }
  const tabLabel = (name: string) =>
    actor.role === "parent"
      ? ({
          FamilyProgress: "Прогресс",
          Homework: "Задания",
          Contacts: "Учитель",
          Profile: "Профиль",
        }[name] ?? name)
      : actor.role === "student"
        ? ({
            Home: "Сегодня",
            Learn: "Учиться",
            Progress: "Мой прогресс",
            Profile: "Профиль",
          }[name] ?? translate(name))
        : translate(name);
  function openCourse(id: string) {
    setCourseRequest({ id, key: Date.now() });
    navigate("Learn");
  }
  const nav = (mobile = false) => (
    <View
      style={{
        gap: mobile ? 4 : 7,
        flexDirection: mobile || (student && desktop) ? "row" : "column",
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
              gap: mobile ? 3 : 10,
              paddingHorizontal: mobile ? 3 : 12,
              paddingVertical: mobile ? 8 : 10,
              borderRadius: 16,
              backgroundColor:
                selectedTab === t
                  ? student
                    ? "#304D3D"
                    : colors.light
                  : "transparent",
              opacity: pressed ? 0.7 : 1,
            },
            mobile ? { flex: 1 } : { minHeight: 48 },
          ]}
        >
          <Icon
            name={navIcons[t]}
            size={mobile ? 19 : 20}
            color={
              selectedTab === t
                ? student
                  ? "#F5F3E5"
                  : colors.green
                : "#7A8378"
            }
          />
          <Txt
            size={mobile ? (actor.role === "student" ? 13 : 11) : 16}
            weight={selectedTab === t ? "600" : "400"}
            color={
              selectedTab === t
                ? student
                  ? "#F5F3E5"
                  : colors.green
                : colors.muted
            }
          >
            {tabLabel(t)}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1, flexDirection: "row" }}>
          {desktop && !student && (
            <View
              style={{
                width: 220,
                borderRightWidth: 1,
                borderColor: colors.line,
                padding: 18,
                gap: 24,
                backgroundColor: colors.white,
              }}
            >
              <Brand />
              <View style={{ gap: 14 }}>
                <Txt style={styles.label}>
                  {actor.role === "student" ? "MY LEARNING" : "STAFF WORKSPACE"}
                </Txt>
                {nav()}
              </View>
              <View style={{ flex: 1 }} />
              <View>
                <Txt size={11} color={colors.muted}>
                  Small steps. Lasting understanding.
                </Txt>
                <Txt size={10} color="#87907F" style={{ marginTop: 8 }}>
                  ESPADA LEARNING
                </Txt>
              </View>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View
              style={{
                paddingHorizontal:
                  desktop && student
                    ? Math.max(28, (width - 1040) / 2)
                    : desktop
                      ? 24
                      : 18,
                paddingVertical: student ? 16 : 10,
                borderBottomWidth: 1,
                borderColor: colors.line,
                backgroundColor: student ? colors.paper : colors.white,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              {student ? (
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
              {student && desktop && nav()}
              <View style={[styles.row, { gap: 8 }]}>
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
                {student && mode === "demo" && <Pill tone="neutral">Демо</Pill>}
                {desktop && !student && (
                  <Pill tone="neutral">
                    {mode === "demo" ? "LOCAL DEMO" : "CONNECTED"}
                  </Pill>
                )}
                {!student && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Обновить учебные данные"
                    onPress={() => void refresh()}
                    style={{ padding: 12, minWidth: 44, minHeight: 44 }}
                  >
                    <Icon name="refresh-cw" size={17} color={colors.muted} />
                  </Pressable>
                )}
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
                  {desktop && <Txt size={13}>{actor.name.split(" ")[0]}</Txt>}
                  <Icon name="chevron-down" size={15} />
                </Pressable>
              </View>
            </View>
            {mode === "demo" && !student && (
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
            <ScreenScroll.Provider value={scrollStaffToTop}>
              <ScrollView
                ref={scroller}
                scrollEventThrottle={16}
                onScroll={(event) => {
                  if (!restoring.current)
                    offsets.current[routeKey] =
                      event.nativeEvent.contentOffset.y;
                }}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  paddingHorizontal: desktop ? 32 : 18,
                  paddingTop: desktop ? 36 : 22,
                  paddingBottom: 40,
                  alignItems: "center",
                }}
              >
                <View style={{ width: "100%", maxWidth: 1100 }}>
                  {actor.role === "student" ? (
                    <View key={actor.id}>
                      <View
                        style={{
                          display:
                            !topic && !result && tab === "Home"
                              ? "flex"
                              : "none",
                        }}
                      >
                        <Home
                          openCourse={openCourse}
                          openTopic={setTopic}
                          navigate={(next) => {
                            if (next === "Progress")
                              setShowHistoryRequest((n) => n + 1);
                            navigate(next);
                          }}
                          openResult={setResult}
                        />
                      </View>
                      <View
                        style={{
                          display:
                            !topic && !result && tab === "Learn"
                              ? "flex"
                              : "none",
                        }}
                      >
                        <Learn
                          openTopic={setTopic}
                          courseRequest={courseRequest}
                        />
                      </View>
                      <View
                        style={{
                          display:
                            !topic && !result && tab === "Progress"
                              ? "flex"
                              : "none",
                        }}
                      >
                        <Progress
                          active={tab === "Progress" && !topic && !result}
                          openCourse={openCourse}
                          showHistoryRequest={showHistoryRequest}
                          openResult={setResult}
                          openTopic={setTopic}
                        />
                      </View>
                      {!topic && !result && tab === "Profile" && (
                        <Profile switchDemo={() => setAccountOpen(true)} />
                      )}
                      {result && (
                        <View style={{ display: topic ? "none" : "flex" }}>
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
                    </View>
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
                {(!student || saving || isLessonPreview) && (
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
            </ScreenScroll.Provider>
            {!desktop && (
              <View
                style={{
                  backgroundColor: colors.white,
                  borderTopWidth: 1,
                  borderColor: colors.line,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                }}
              >
                {nav(true)}
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
              Demo identity switching is not authentication. These synthetic
              accounts share this device’s saved data.
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
                        p.id === actor.id ? colors.light : "#F8F9F5",
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
