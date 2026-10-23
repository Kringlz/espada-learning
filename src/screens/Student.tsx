import { TeacherContactEditor } from "./Family";
import { useUITheme } from "../components/ui";
import { MyGroups } from "../components/Groups";
import React, { useState } from "react";
import { Linking, View } from "react-native";
import { useLearning } from "../services/context";
import { uid } from "../core/ids";
import {
  Button,
  Card,
  Disclosure,
  Txt,
  Pill,
  colors,
  styles,
} from "../components/ui";
export { Home, Learn, Progress } from "./Reports";
export function Profile({ switchDemo }: { switchDemo?: () => void }) {
  const { colors, styles, preference, setPreference } = useUITheme();
  const { actor, mode, state: s, dispatch, signOut, refresh } = useLearning();
  const [confirm, setConfirm] = useState(false);
  const requested = s.deletionRequests.some((r) => r.studentId === actor.id);
  return (
    <View
      style={{ gap: 24, maxWidth: 800, width: "100%", alignSelf: "center" }}
    >
      <Txt size={32} weight="500">
        Профиль
      </Txt>
      <Card>
        <Pill>
          {
            {
              student: "Ученик",
              parent: "Родитель",
              teacher: "Учитель",
              admin: "Администратор",
            }[actor.role]
          }
        </Pill>
        <Txt size={25} weight="600">
          {actor.name}
        </Txt>
        <Txt color={colors.muted}>
          {mode === "demo"
            ? "Учебный аккаунт · локальное демо"
            : "Аккаунт Espada"}
        </Txt>
      </Card>
      <Card>
        <Txt size={20} weight="600">
          Оформление
        </Txt>
        <View style={[styles.row, { flexWrap: "wrap" }]}>
          {(
            [
              ["light", "Светлая"],
              ["dark", "Тёмная"],
              ["system", "Как на устройстве"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              small
              secondary
              selected={preference === value}
              onPress={() => setPreference(value)}
            >
              {label}
            </Button>
          ))}
        </View>
      </Card>
      {(actor.role === "student" || actor.role === "parent") && (
        <Card>
          <Txt weight="600">
            {actor.role === "student" ? "Код ученика" : "Код родителя"}
          </Txt>
          <Txt color={colors.muted}>
            {actor.role === "student"
              ? "Этот код понадобится родителю, чтобы увидеть ваш прогресс, или учителю — чтобы добавить вас в группу."
              : "Этот код — ваш личный идентификатор аккаунта."}
          </Txt>
          <Txt selectable size={20} weight="700">
            {actor.code}
          </Txt>
        </Card>
      )}
      {actor.role === "teacher" && <TeacherContactEditor key={actor.id} />}
      {actor.role === "student" && <MyGroups />}
      <Button secondary icon="refresh-cw" onPress={() => void refresh()}>
        Обновить учебные данные
      </Button>
      {mode === "demo" && switchDemo && (
        <Button secondary icon="users" onPress={switchDemo}>
          Сменить демоаккаунт
        </Button>
      )}
      <Disclosure title="Об Espada" icon="info">
        <Txt>
          Espada хранит результаты работ, состояния тем и учебную активность
          отдельно. Просмотр урока или видео не подтверждает освоение темы.
        </Txt>
        <Txt color={colors.muted}>
          Без рекламы и публичных профилей. Рейтинг арены виден только внутри
          учебной группы и её преподавателям; оценки и освоение тем в нём не
          участвуют. Учебные данные не передаются ИИ-сервисам.
        </Txt>
        <Txt size={13} color={colors.muted}>
          Need help? Bring a tricky question to your next tutoring session. Your
          teacher can see completed checks and choose a useful next step.
        </Txt>
        <View style={{ gap: 4 }}>
          <Txt
            size={12}
            color={colors.muted}
            accessibilityRole="link"
            onPress={() => void Linking.openURL("https://game-icons.net/")}
          >
            Иллюстрации: Game-icons · Delapouite и Lorc
          </Txt>
          <Txt
            size={12}
            color={colors.muted}
            accessibilityRole="link"
            onPress={() =>
              void Linking.openURL(
                "https://creativecommons.org/licenses/by/3.0/",
              )
            }
          >
            CC BY 3.0 · цвета адаптированы
          </Txt>
        </View>
      </Disclosure>
      <Disclosure title="Ваши данные" icon="shield">
        <Txt color={colors.muted}>
          {mode === "demo"
            ? "This demo stays in local browser or device storage. Clearing that storage removes the demo records. Different devices do not sync."
            : "Your organisation holds your learning records. A deletion request goes to its administrator for review, including any lawful retention obligations."}
        </Txt>
        {actor.role === "student" &&
          (requested ? (
            <Pill>Deletion request received</Pill>
          ) : confirm ? (
            <>
              <Txt>
                Request deletion of your account and learning records? An
                administrator will review this request. In demo mode they can
                erase all of this student’s synthetic records.
              </Txt>
              <View style={styles.row}>
                <Button
                  onPress={() =>
                    void dispatch({ type: "requestDeletion", id: uid() }).catch(
                      () => {},
                    )
                  }
                >
                  Confirm deletion request
                </Button>
                <Button secondary onPress={() => setConfirm(false)}>
                  Cancel
                </Button>
              </View>
            </>
          ) : (
            <Button secondary onPress={() => setConfirm(true)}>
              Request account deletion
            </Button>
          ))}
      </Disclosure>
      {mode === "supabase" && (
        <Button secondary onPress={() => void signOut().catch(() => {})}>
          Sign out
        </Button>
      )}
    </View>
  );
}
