import { LessonLoading } from "../course/videoLesson/LessonAtmosphere";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeToggle } from "../components/ThemeToggle";
import { Brand } from "../components/Brand";
import { SpaceBackdrop } from "../components/SpaceBackdrop";
import { AuthForm } from "../components/AuthForm";
import { AuthField } from "../components/AuthField";
import { Button, Card, Icon, Txt, useUITheme } from "../components/ui";
import { AuthFlowError, validEmail } from "../services/authFlow";
import { AuthScreenProps } from "../services/context";
import { getRememberMe, mode } from "../services/supabase";
import {
  isRegistrationRole,
  RegistrationRole,
  registrationRoles,
} from "../services/registration";
import { passwordError, repeatPasswordError } from "../services/password";
import { errorMessage } from "../i18n/errors";

type Screen =
  | "login"
  | "register"
  | "confirm"
  | "forgot"
  | "recoveryCode"
  | "reset"
  | "account";
export function AuthScreen(p: AuthScreenProps) {
  const { colors } = useUITheme();
  const [screen, setScreen] = useState<Screen>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [repeatChecked, setRepeatChecked] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<RegistrationRole | "teacher">("student");
  const [code, setCode] = useState("");
  const [otp, setOtp] = useState("");
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const touchedRemember = useRef(false);
  const [message, setMessage] = useState("");
  const [serverPasswordError, setServerPasswordError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const passwordRef = useRef<TextInput>(null);
  const repeatRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const codeRef = useRef<TextInput>(null);
  useEffect(() => {
    let live = true;
    void getRememberMe()
      .then((v) => {
        if (live && !touchedRemember.current) setRemember(v);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    let live = true;
    const update = () => {
      void p.emailCooldown(email).then((v) => {
        if (live) setCooldown(v);
      });
    };
    update();
    const timer = setInterval(update, 1000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [email, p.emailCooldown]);
  useEffect(() => {
    if (p.recovering) {
      change("reset");
      return;
    }
    if (p.hasSession) {
      change(p.needsProfile ? "register" : "account");
      return;
    }
    if (p.pendingRegistration) {
      const pending = p.pendingRegistration;
      setName(pending.name);
      setCode(pending.code ?? "");
      if (
        isRegistrationRole(pending.role) ||
        (pending.role === "teacher" && pending.invitedTeacher)
      )
        setRole(pending.role);
      setEmail(pending.email ?? "");
      change("confirm");
    }
  }, [p.hasSession, p.pendingRegistration, p.recovering, p.needsProfile]);
  function change(next: Screen) {
    setScreen(next);
    setMessage("");
    setNotice("");
    setSubmitted(false);
    setPassword("");
    setRepeat("");
    setRepeatChecked(false);
    setOtp("");
    setServerPasswordError("");
  }
  const credentials = !p.hasSession && mode === "supabase";
  const newPassword =
    screen === "reset" || (screen === "register" && credentials);
  const emailError = submitted && !validEmail(email) ? "Проверьте почту" : "";
  const passError =
    serverPasswordError ||
    (submitted && newPassword ? passwordError(password) : "");
  const repeatError = repeatPasswordError(
    password,
    repeat,
    repeatChecked || submitted,
  );
  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      if (e instanceof AuthFlowError && e.code === "email_not_confirmed")
        change("confirm");
      else if (
        e instanceof AuthFlowError &&
        ["weak_password", "same_password"].includes(e.code)
      )
        setServerPasswordError(e.message);
      else setMessage(errorMessage(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  function submit() {
    if (locked.current) return;
    setSubmitted(true);
    if (
      (screen === "login" ||
        screen === "forgot" ||
        (screen === "register" && credentials)) &&
      !validEmail(email)
    )
      return;
    if (newPassword && (passwordError(password) || password !== repeat)) return;
    void run(async () => {
      if (screen === "login") {
        if (!password) {
          setMessage("Введите пароль");
          return;
        }
        await p.login(email.trim(), password, remember);
      } else if (screen === "register") {
        const result = await p.registerProfile({
          name,
          role,
          code,
          remember,
          ...(credentials ? { email: email.trim(), password } : {}),
        });
        if (result === "confirmEmail") change("confirm");
      } else if (screen === "confirm") await p.confirmEmail(email.trim(), otp);
      else if (screen === "forgot") {
        await p.requestRecovery(email.trim());
        change("recoveryCode");
        setNotice("Если адрес подходит для восстановления, письмо отправлено.");
      } else if (screen === "recoveryCode")
        await p.confirmRecovery(email.trim(), otp);
      else if (screen === "reset") {
        await p.updatePassword(password);
        change("login");
        setNotice("Пароль изменён. Войдите с новым паролем.");
      }
    });
  }
  const link = (label: string, action: () => void) => (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={action}
      style={{ minHeight: 44, justifyContent: "center", alignItems: "center" }}
    >
      <Txt size={14} color={colors.green}>
        {label}
      </Txt>
    </Pressable>
  );
  const rememberControl = (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel="Запомнить меня"
      accessibilityState={{ checked: remember, disabled: busy }}
      aria-checked={remember}
      disabled={busy}
      onPress={() => {
        touchedRemember.current = true;
        setRemember((v) => !v);
      }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: 44,
        gap: 10,
      }}
    >
      <Icon name={remember ? "check-square" : "square"} color={colors.green} />
      <Txt size={14}>Запомнить меня</Txt>
    </Pressable>
  );
  const emailField = (
    <AuthField
      ref={emailRef}
      label="Почта"
      value={email}
      onChangeText={setEmail}
      error={emailError}
      editable={!busy}
      keyboardType="email-address"
      autoComplete="email"
      textContentType="emailAddress"
      returnKeyType={screen === "forgot" ? "send" : "next"}
      onSubmitEditing={() =>
        screen === "forgot" ? submit() : passwordRef.current?.focus()
      }
    />
  );
  const passwords = (
    <>
      <AuthField
        ref={passwordRef}
        label={screen === "reset" ? "Новый пароль" : "Пароль"}
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setServerPasswordError("");
        }}
        password={newPassword ? "new" : "current"}
        error={passError}
        editable={!busy}
        returnKeyType={newPassword ? "next" : "go"}
        onSubmitEditing={() =>
          newPassword ? repeatRef.current?.focus() : submit()
        }
      />
      {newPassword && (
        <AuthField
          ref={repeatRef}
          label="Повтор пароля"
          value={repeat}
          onChangeText={setRepeat}
          password="new"
          error={repeatError}
          editable={!busy}
          onBlur={() => {
            if (repeat.length) setRepeatChecked(true);
          }}
          returnKeyType={
            screen === "register" && role === "parent" ? "next" : "done"
          }
          onSubmitEditing={() =>
            screen === "register" && role === "parent"
              ? codeRef.current?.focus()
              : submit()
          }
        />
      )}
    </>
  );
  if (p.loading) return <LessonLoading />;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <SpaceBackdrop />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
            paddingVertical: 28,
          }}
        >
          <View style={{ width: "100%", maxWidth: 420, gap: 22 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Brand />
              <ThemeToggle />
            </View>
            <Card style={{ gap: 14, padding: 22 }}>
              <AuthForm onSubmit={submit}>
                <Txt size={27} weight="600">
                  {
                    {
                      login: "Вход",
                      register: "Регистрация",
                      confirm: "Подтверждение почты",
                      forgot: "Восстановление",
                      recoveryCode: "Проверьте почту",
                      reset: "Новый пароль",
                      account: "Аккаунт",
                    }[screen]
                  }
                </Txt>
                {p.loading ? (
                  <ActivityIndicator color={colors.green} />
                ) : (
                  <>
                    {!!(message || p.error) && (
                      <Txt
                        size={14}
                        color={colors.red}
                        accessibilityRole="alert"
                      >
                        {message || p.error}
                      </Txt>
                    )}
                    {!!notice && (
                      <Txt
                        size={14}
                        color={colors.green}
                        accessibilityRole="status"
                      >
                        {notice}
                      </Txt>
                    )}
                    {screen === "account" && (
                      <>
                        <Txt size={14} color={colors.muted}>
                          Не удалось открыть кабинет.
                        </Txt>
                        <Button fullWidth disabled={busy} onPress={p.retry}>
                          Повторить
                        </Button>
                        {link(
                          "Другой аккаунт",
                          () =>
                            void run(async () => {
                              await p.leaveRegistration();
                              change("login");
                            }),
                        )}
                      </>
                    )}
                    {screen === "login" && (
                      <>
                        {mode === "supabase" ? (
                          <>
                            {emailField}
                            {passwords}
                            {rememberControl}
                            <Button fullWidth disabled={busy} onPress={submit}>
                              {busy ? "Входим…" : "Войти"}
                            </Button>
                            {link("Забыли пароль?", () => change("forgot"))}
                          </>
                        ) : (
                          <Button onPress={p.retry}>Открыть демо</Button>
                        )}
                        {link("Создать аккаунт", () => {
                          setRole("student");
                          change("register");
                        })}
                        {mode === "supabase" &&
                          link("Учитель · по приглашению", () => {
                            setRole("teacher");
                            change("register");
                          })}
                      </>
                    )}
                    {screen === "register" && (
                      <>
                        {role === "teacher" ? (
                          <Txt size={14} color={colors.muted}>
                            Учитель · по приглашению администратора
                          </Txt>
                        ) : (
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            {registrationRoles.map((r) => (
                              <Button
                                key={r}
                                small
                                secondary={role !== r}
                                disabled={busy}
                                onPress={() => setRole(r)}
                              >
                                {r === "student" ? "Ученик" : "Родитель"}
                              </Button>
                            ))}
                          </View>
                        )}
                        <AuthField
                          label="Имя"
                          value={name}
                          onChangeText={setName}
                          autoComplete="name"
                          textContentType="name"
                          editable={!busy}
                          returnKeyType="next"
                          onSubmitEditing={() =>
                            credentials
                              ? emailRef.current?.focus()
                              : role === "parent"
                                ? codeRef.current?.focus()
                                : submit()
                          }
                          error={submitted && !name.trim() ? "Введите имя" : ""}
                        />
                        {credentials && (
                          <>
                            {emailField}
                            {passwords}
                            <Txt size={12} color={colors.muted}>
                              Минимум 8 символов
                            </Txt>
                          </>
                        )}
                        {role === "student" ? (
                          <Txt size={13} color={colors.muted}>
                            Код группы не нужен. После регистрации передайте
                            учителю код из своего профиля — он добавит вас в
                            группу.
                          </Txt>
                        ) : role === "parent" ? (
                          <AuthField
                            ref={codeRef}
                            label="Код ученика"
                            value={code}
                            onChangeText={setCode}
                            editable={!busy}
                            autoComplete="off"
                            returnKeyType="done"
                            onSubmitEditing={submit}
                            error={
                              submitted &&
                              !/^[A-Z2-9]{7}$/.test(code.trim().toUpperCase())
                                ? "Введите код из 7 символов"
                                : ""
                            }
                          />
                        ) : null}
                        {mode === "supabase" &&
                          role !== "teacher" &&
                          link("Я учитель · есть приглашение", () =>
                            setRole("teacher"),
                          )}
                        {credentials && rememberControl}
                        <Button
                          fullWidth
                          disabled={busy || (credentials && cooldown > 0)}
                          onPress={submit}
                        >
                          {busy
                            ? "Создаём…"
                            : cooldown > 0 && credentials
                              ? `Повторить через ${cooldown} с`
                              : p.hasSession
                                ? "Завершить"
                                : "Создать аккаунт"}
                        </Button>
                        {link(
                          p.hasSession
                            ? "Другой аккаунт"
                            : "Уже есть аккаунт? Войти",
                          () => {
                            if (p.hasSession)
                              void run(async () => {
                                await p.leaveRegistration();
                                change("login");
                              });
                            else change("login");
                          },
                        )}
                      </>
                    )}
                    {screen === "forgot" && (
                      <>
                        {emailField}
                        <Button
                          fullWidth
                          disabled={busy || cooldown > 0}
                          onPress={submit}
                        >
                          {cooldown > 0
                            ? `Повторить через ${cooldown} с`
                            : "Отправить письмо"}
                        </Button>
                        {link("К входу", () => change("login"))}
                      </>
                    )}
                    {(screen === "confirm" || screen === "recoveryCode") && (
                      <>
                        <Txt size={14} color={colors.muted}>
                          {screen === "confirm"
                            ? `Откройте ссылку из письма для ${email} или введите код.`
                            : "Откройте ссылку из письма или введите код, если он указан."}
                        </Txt>
                        <AuthField
                          label="Код из письма"
                          value={otp}
                          onChangeText={(s) => setOtp(s.replace(/\D/g, ""))}
                          keyboardType="number-pad"
                          autoComplete="one-time-code"
                          textContentType="oneTimeCode"
                          maxLength={10}
                          editable={!busy}
                          returnKeyType="done"
                          onSubmitEditing={submit}
                        />
                        <Button
                          fullWidth
                          disabled={busy || otp.length < 6}
                          onPress={submit}
                        >
                          Подтвердить
                        </Button>
                        {link(
                          cooldown > 0
                            ? `Повторить через ${cooldown} с`
                            : "Отправить ещё раз",
                          () => {
                            if (!cooldown)
                              void run(async () => {
                                if (screen === "confirm")
                                  await p.resendConfirmation(email.trim());
                                else await p.requestRecovery(email.trim());
                                setNotice(
                                  "Запрос принят. Проверьте почту и папку «Спам».",
                                );
                              });
                          },
                        )}
                        {link("Изменить почту", () =>
                          change(screen === "confirm" ? "register" : "forgot"),
                        )}
                        {link("К входу", () => change("login"))}
                      </>
                    )}
                    {screen === "reset" && (
                      <>
                        {passwords}
                        <Txt size={12} color={colors.muted}>
                          Минимум 8 символов
                        </Txt>
                        <Button fullWidth disabled={busy} onPress={submit}>
                          Сохранить пароль
                        </Button>
                        {link(
                          "К входу",
                          () =>
                            void run(async () => {
                              await p.leaveRegistration();
                              change("login");
                            }),
                        )}
                      </>
                    )}
                  </>
                )}
              </AuthForm>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
