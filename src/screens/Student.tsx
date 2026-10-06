import { TeacherContactEditor } from "./Family";
import { useUITheme } from "../components/ui";
import { MyGroups } from "../components/Groups";
import React, { useState } from "react";
import { View } from "react-native";
import { useLearning } from "../services/context";
import { uid } from "../core/ids";
import { Button, Card, Txt, Pill, colors, styles } from "../components/ui";
export { Home, Learn, Progress } from "./Reports";
export function Profile({ switchDemo }: { switchDemo?: () => void }) {
  const { colors, styles, preference, setPreference } = useUITheme();
  const { actor, mode, state: s, dispatch, signOut, refresh } = useLearning();
  const [confirm, setConfirm] = useState(false);
  const requested = s.deletionRequests.some((r) => r.studentId === actor.id);
  return (
    <View style={{ gap: 16, maxWidth: 800 }}>
      <Txt size={27} weight="600">
        Your learning space.
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
            ? "Local demo · synthetic account · saved on this device"
            : "Connected account · access controlled by your tutoring organisation"}
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
      <Card>
        <Txt size={20} weight="600">
          Learning, with care
        </Txt>
        <Txt>
          Espada хранит результаты работ, состояния тем и учебную активность
          отдельно. Просмотр урока или видео не подтверждает освоение темы.
        </Txt>
        <Txt color={colors.muted}>
          No adverts. No public profiles. No student rankings. AI tutoring is
          disabled; no learning data is sent to an AI provider.
        </Txt>
        <Txt size={13} color={colors.muted}>
          Need help? Bring a tricky question to your next tutoring session. Your
          teacher can see completed checks and choose a useful next step.
        </Txt>
      </Card>
      <Card>
        <Txt size={20} weight="600">
          Your data
        </Txt>
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
      </Card>
      {mode === "supabase" && (
        <Button secondary onPress={() => void signOut()}>
          Sign out
        </Button>
      )}
    </View>
  );
}
