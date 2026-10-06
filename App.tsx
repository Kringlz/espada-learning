import { ClarityControls } from "./src/components/ClarityControls";
import { LessonFocus, FocusedLesson } from "./src/components/LessonFocus";
import { SoundProvider, useSounds } from "./src/engagement/Sounds";
import { RewardsProvider } from "./src/engagement/RewardContext";
import { RewardNotice } from "./src/engagement/LevelCard";
import { SoftReveal } from "./src/components/Motion";
import { Parent } from "./src/screens/Family";
import { useUITheme } from "./src/components/ui";
import { ClarityThemeProvider, ThemeProvider } from "./src/theme/Theme";
import { Brand } from "./src/components/Brand";
import { CourseProgressProvider } from "./src/course/storage";
import { ScreenAnchor, ScreenScroll } from "./src/components/ScreenScroll";
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
import { Role } from "./src/core/types";
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
      <ClarityThemeProvider>
        <SoundProvider>
          <SafeAreaProvider>
            <LearningProvider fallback={(props) => <Welcome {...props} />}>
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
    <CourseProgressProvider key={actor.id} actorId={actor.id}>
      <RewardsProvider key={actor.id}>
        <Shell />
      </RewardsProvider>
    </CourseProgressProvider>
  );
}
const roleLabels: Record<Exclude<Role, "admin">, string> = {
  teacher: "Учитель",
  student: "Ученик",
  parent: "Родитель",
};
function Welcome({
  loading,
  error,
  retry,
  login,
  hasSession,
  pendingRegistration,
  registerProfile,
  confirmEmail,
  resendConfirmation,
}: {
  loading: boolean;
  error: string | null;
  retry: () => void;
  login: (e: string, p: string) => Promise<void>;
  hasSession: boolean;
  pendingRegistration: {
    name: string;
    role: Role;
    code?: string;
    email?: string;
  } | null;
  registerProfile: (input: {
    name: string;
    role: Role;
    code?: string;
    email?: string;
    password?: string;
  }) => Promise<"ready" | "confirmEmail">;
  confirmEmail: (email: string, token: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
}) {
  const { colors, styles } = useUITheme();
  const [screen, setScreen] = useState<"login" | "register" | "confirm">(
    "login",
  );
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Exclude<Role, "admin">>("teacher");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (hasSession) setScreen("register");
  }, [hasSession]);
  useEffect(() => {
    if (pendingRegistration) {
      setName(pendingRegistration.name);
      setRole(pendingRegistration.role as Exclude<Role, "admin">);
      setCode(pendingRegistration.code ?? "");
      if (pendingRegistration.email && !hasSession) {
        setEmail(pendingRegistration.email);
        setScreen("confirm");
      }
    }
  }, [pendingRegistration, hasSession]);
  const roleButtons = (
    <View style={[styles.row, { flexWrap: "wrap" }]}>
      {(Object.keys(roleLabels) as (keyof typeof roleLabels)[]).map((r) => (
        <Button key={r} small secondary={role !== r} onPress={() => setRole(r)}>
          {roleLabels[r]}
        </Button>
      ))}
    </View>
  );
  const submitRegister = (extra: { email?: string; password?: string }) => {
    setBusy(true);
    setMessage("");
    void registerProfile({
      name: name.trim(),
      role,
      code: role === "teacher" ? undefined : code.trim(),
      ...extra,
    })
      .then((outcome) => {
        if (outcome === "confirmEmail") {
          setOtp("");
          setResendIn(60);
          setScreen("confirm");
        }
      })
      .catch((e) => setMessage(errorMessage(e)))
      .finally(() => setBusy(false));
  };
  const registerDisabled =
    busy || !name.trim() || (role !== "teacher" && !code.trim());
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <View style={{ maxWidth: 480, width: "100%", gap: 24 }}>
          <View style={[styles.row, { justifyContent: "space-between" }]}>
            <Brand />
            <ClarityControls />
          </View>
          <Card style={{ gap: 20, marginTop: 16 }}>
            <Txt size={30} weight="600">
              {screen === "confirm"
                ? "Проверьте почту"
                : screen === "register"
                  ? "Начнём знакомство"
                  : "Рады видеть вас"}
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
                    {!hasSession && screen !== "confirm" && (
                      <View style={[styles.row, { gap: 8, flexWrap: "wrap" }]}>
                        <Button
                          small
                          secondary={screen !== "login"}
                          onPress={() => setScreen("login")}
                        >
                          Войти
                        </Button>
                        <Button
                          small
                          secondary={screen !== "register"}
                          onPress={() => setScreen("register")}
                        >
                          Создать аккаунт
                        </Button>
                      </View>
                    )}
                    {screen === "confirm" && !hasSession ? (
                      <>
                        <Txt color={colors.muted}>
                          {`Мы отправили код подтверждения на ${email}. Введите его ниже. Если письма нет — проверьте «Спам» и «Промоакции».`}
                        </Txt>
                        <Field
                          label="Код из письма"
                          numeric
                          maxLength={10}
                          value={otp}
                          onChangeText={(s) => setOtp(s.replace(/\D/g, ""))}
                        />
                        <Button
                          disabled={busy || otp.length < 6}
                          onPress={() => {
                            setBusy(true);
                            setMessage("");
                            void confirmEmail(email.trim(), otp)
                              .catch((e) => setMessage(errorMessage(e)))
                              .finally(() => setBusy(false));
                          }}
                        >
                          Подтвердить
                        </Button>
                        <Button
                          secondary
                          disabled={busy || resendIn > 0}
                          onPress={() => {
                            setBusy(true);
                            setMessage("");
                            void resendConfirmation(email.trim())
                              .then(() => {
                                setResendIn(60);
                                setMessage("Новый код отправлен.");
                              })
                              .catch((e) => setMessage(errorMessage(e)))
                              .finally(() => setBusy(false));
                          }}
                        >
                          {resendIn > 0
                            ? `Отправить код ещё раз (${resendIn} с)`
                            : "Отправить код ещё раз"}
                        </Button>
                        <Button
                          secondary
                          disabled={busy}
                          onPress={() => {
                            setMessage("");
                            setOtp("");
                            setScreen("register");
                          }}
                        >
                          Изменить email
                        </Button>
                      </>
                    ) : screen === "login" ? (
                      <>
                        <Field
                          label="Email"
                          value={email}
                          onChangeText={setEmail}
                        />
                        <Field
                          label="Пароль"
                          secure
                          value={password}
                          onChangeText={setPassword}
                        />
                        <Button
                          disabled={busy || !email || !password}
                          onPress={() => {
                            setBusy(true);
                            setMessage("");
                            void login(email.trim(), password)
                              .catch((e) => {
                                const m = errorMessage(e);
                                if (m === errorMessage("Email not confirmed")) {
                                  setOtp("");
                                  setScreen("confirm");
                                }
                                setMessage(m);
                              })
                              .finally(() => setBusy(false));
                          }}
                        >
                          Войти
                        </Button>
                      </>
                    ) : (
                      <>
                        <Txt color={colors.muted}>
                          {hasSession
                            ? "Почта подтверждена. Завершите регистрацию."
                            : role === "student"
                              ? "Код группы можно получить у учителя."
                              : role === "parent"
                                ? "Код ученика есть в профиле ребёнка."
                                : "Создайте свою группу после регистрации."}
                        </Txt>
                        {roleButtons}
                        <Field
                          label="Имя"
                          value={name}
                          onChangeText={setName}
                        />
                        {!hasSession && (
                          <>
                            <Field
                              label="Email"
                              value={email}
                              onChangeText={setEmail}
                            />
                            <Field
                              label="Пароль"
                              secure
                              value={password}
                              onChangeText={setPassword}
                            />
                          </>
                        )}
                        {role === "student" && (
                          <Field
                            label="Код группы"
                            value={code}
                            onChangeText={setCode}
                          />
                        )}
                        {role === "parent" && (
                          <Field
                            label="Код ученика"
                            value={code}
                            onChangeText={setCode}
                          />
                        )}
                        <Button
                          disabled={
                            registerDisabled ||
                            (!hasSession && (!email || !password))
                          }
                          onPress={() =>
                            submitRegister(
                              hasSession
                                ? {}
                                : { email: email.trim(), password },
                            )
                          }
                        >
                          {hasSession
                            ? "Завершить регистрацию"
                            : "Зарегистрироваться"}
                        </Button>
                      </>
                    )}
                  </>
                ) : screen === "login" ? (
                  <>
                    <Button onPress={retry}>Retry loading local demo</Button>
                    <Button secondary onPress={() => setScreen("register")}>
                      Зарегистрироваться (демо)
                    </Button>
                  </>
                ) : (
                  <>
                    <Txt color={colors.muted}>
                      Демо-регистрация создаёт новый синтетический аккаунт на
                      этом устройстве.
                    </Txt>
                    {roleButtons}
                    <Field label="Имя" value={name} onChangeText={setName} />
                    {role === "student" && (
                      <Field
                        label="Код группы"
                        value={code}
                        onChangeText={setCode}
                      />
                    )}
                    {role === "parent" && (
                      <Field
                        label="Код ученика"
                        value={code}
                        onChangeText={setCode}
                      />
                    )}
                    <Button
                      disabled={registerDisabled}
                      onPress={() => submitRegister({})}
                    >
                      Зарегистрироваться
                    </Button>
                    <Button secondary onPress={() => setScreen("login")}>
                      Назад
                    </Button>
                  </>
                )}
              </>
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  const leaveLesson = () => (topic ? setTopic(null) : focusedLesson?.exit());

  const offsets = useRef<Record<string, number>>({});
  const routeKey = `${actor.id}:${topic ? `topic:${topic}` : result ? `result:${result}` : tab}`;
  const restoring = useRef(false);
  const selectedTab = topic ? "Learn" : result ? "Progress" : tab;
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
      if (focusedLesson) {
        focusedLesson.exit();
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
  function navigate(next: string) {
    sounds.play("open");
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
            Home: "Главная",
            Learn: "Темы",
            Progress: "Успехи",
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
              gap: clarity ? 7 : mobile ? 3 : 10,
              paddingHorizontal: mobile ? 3 : 12,
              paddingVertical: clarity ? 12 : mobile ? 8 : 10,
              minHeight: clarity ? 56 : undefined,
              borderRadius: 16,
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
            size={clarity ? 26 : mobile ? 19 : 20}
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
          {!clarity && (
            <Txt
              size={clarity ? 16 : mobile ? 11 : 16}
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
              {tabLabel(t)}
            </Txt>
          )}
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
          {desktop && !student && !clarity && (
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
                paddingHorizontal: desktop
                  ? Math.max(28, (width - 1040) / 2)
                  : desktop
                    ? 24
                    : 18,
                paddingVertical: 16,
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
                    Выйти
                  </Button>
                  <Brand compact={width < 600} />
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
            <LessonFocus.Provider value={registerLesson}>
              <ScreenScroll.Provider value={scrollStaffToTop}>
                <ScreenAnchor.Provider value={scrollToAnchor}>
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
                    <View
                      ref={scrollContent}
                      collapsable={false}
                      style={{ width: "100%", maxWidth: 1100 }}
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
                                !topic && !result && tab === "Home"
                                  ? "flex"
                                  : "none",
                            }}
                          >
                            <Home
                              openCourse={openCourse}
                              openTopic={setTopic}
                              navigate={navigate}
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
                              active={tab === "Learn" && !topic && !result}
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
                        </SoftReveal>
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
            {student && <RewardNotice />}
            {(!desktop || clarity) && !focused && (
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
              Учебные аккаунты. Изменения сохраняются только на этом устройстве.
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
