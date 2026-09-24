import { MyGroups } from "../components/Groups";
import React, { useState } from "react";
import { View } from "react-native";
import { useLearning } from "../services/context";
import { uid } from "../core/ids";
import { Button, Card, Txt, Pill, colors, styles } from "../components/ui";
export { Home, Learn, Progress } from "./Reports";
export function Profile() {
  const { actor, mode, state: s, dispatch, signOut } = useLearning();
  const [confirm, setConfirm] = useState(false);
  const requested = s.deletionRequests.some((r) => r.studentId === actor.id);
  return (
    <View style={{ gap: 24, maxWidth: 800 }}>
      <Txt size={34} weight="600">
        Your learning space.
      </Txt>
      <Card>
        <Pill>{actor.role.toUpperCase()}</Pill>
        <Txt size={25} weight="600">
          {actor.name}
        </Txt>
        <Txt color={colors.muted}>
          {mode === "demo"
            ? "Local demo · synthetic account · saved on this device"
            : "Connected account · access controlled by your tutoring organisation"}
        </Txt>
      </Card>
      {actor.role === "student" && <MyGroups />}
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
