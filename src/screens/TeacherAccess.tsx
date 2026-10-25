import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Button, Disclosure, Field, Txt, useUITheme } from "../components/ui";
import { useLearning } from "../services/context";
import { backend } from "../services/supabase";
import { validEmail } from "../services/authFlow";
import { errorMessage } from "../i18n/errors";

type Invitation = {
  id: string;
  email: string;
  name: string;
  expiresAt: string;
  status: "pending" | "accepted" | "revoked" | "expired";
};
const labels = {
  pending: "Ожидает входа",
  accepted: "Принято",
  revoked: "Отозвано",
  expired: "Истекло",
};
export function TeacherAccess() {
  const { actor, mode } = useLearning();
  const { colors } = useUITheme();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [items, setItems] = useState<Invitation[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const locked = useRef(false);
  async function act(action: "list" | "grant" | "revoke", id?: string) {
    if (!backend || actor.role !== "admin" || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data, error } = await backend.rpc("manage_teacher_invitation", {
        p_action: action,
        p_email: email.trim(),
        p_name: name.trim(),
        p_id: id ?? null,
      });
      if (error)
        throw Error(
          error.code === "PGRST202"
            ? "Приглашения ещё не подключены на сервере."
            : error.message,
        );
      setItems(data as Invitation[]);
      if (action === "grant") {
        setEmail("");
        setName("");
        setMessage(
          "Приглашение действует 7 дней. Учителю нужно войти или зарегистрироваться с этой почтой.",
        );
      }
      if (action === "revoke") setMessage("Приглашение отозвано.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (mode === "supabase") void act("list");
  }, [actor.id, mode]);
  if (actor.role !== "admin") return null;
  return (
    <Disclosure title="Доступ учителей" icon="user-plus" initiallyOpen>
      {mode !== "supabase" ? (
        <Txt size={14} color={colors.muted}>
          Приглашения доступны в подключённом аккаунте администратора.
        </Txt>
      ) : (
        <>
          <Field label="Имя учителя" value={name} onChangeText={setName} />
          <Field label="Почта учителя" value={email} onChangeText={setEmail} />
          <Button
            disabled={
              busy ||
              !name.trim() ||
              name.trim().length > 80 ||
              !validEmail(email.trim())
            }
            onPress={() => void act("grant")}
          >
            Разрешить вход учителю
          </Button>
          <Txt size={12} color={colors.muted}>
            Письмо не отправляется. Доступ откроется после подтверждения этой
            почты; группы назначаются отдельно.
          </Txt>
          {!!error && (
            <Txt size={14} color={colors.red} accessibilityRole="alert">
              {error}
            </Txt>
          )}
          {!!message && (
            <Txt size={14} color={colors.green} accessibilityRole="status">
              {message}
            </Txt>
          )}
          {items.map((item) => (
            <View
              key={item.id}
              style={{
                gap: 5,
                paddingVertical: 10,
                borderTopWidth: 1,
                borderTopColor: colors.line,
              }}
            >
              <Txt weight="600">{item.name}</Txt>
              <Txt size={13}>{item.email}</Txt>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <Txt size={12} color={colors.muted}>
                  {labels[item.status]}
                  {item.status === "pending"
                    ? ` · до ${new Date(item.expiresAt).toLocaleDateString("ru-RU")}`
                    : ""}
                </Txt>
                {item.status === "pending" && (
                  <Button
                    small
                    secondary
                    disabled={busy}
                    onPress={() => void act("revoke", item.id)}
                  >
                    Отозвать
                  </Button>
                )}
              </View>
            </View>
          ))}
          <Button
            small
            secondary
            disabled={busy}
            onPress={() => void act("list")}
          >
            Обновить
          </Button>
        </>
      )}
    </Disclosure>
  );
}
