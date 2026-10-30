import { Linking } from "react-native";
import { classroomService, safeMeetingUrl, WeeklyLeader } from "./service";
import { useEffect, useState } from "react";
import { useLearning } from "../services/context";
import { useClassroom } from "./useClassroom";
import { type ClassroomAction } from "./protocol";
export function useStudentClassroom(active: boolean) {
  const { actor, state, mode } = useLearning();
  const connected = mode === "supabase" && actor.role === "student";
  const groups = connected
    ? state.classes.filter((g) => g.studentIds.includes(actor.id))
    : [];
  const [selected, setSelected] = useState("");
  const group = groups.find((g) => g.id === selected) ?? groups[0];
  const [panel, setPanel] = useState(false);
  const c = useClassroom(group?.id ?? "", connected && active && panel);
  const [leaders, setLeaders] = useState<WeeklyLeader[]>([]);
  const [boardError, setBoardError] = useState("");
  const [boardLoading, setBoardLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [linkError, setLinkError] = useState("");
  const [sent, setSent] = useState(0);
  useEffect(() => {
    let live = true,
      running = false;
    setLeaders([]);
    setBoardError("");
    setBoardLoading(false);
    setLinkError("");
    if (!connected || !group || !panel || !active) return;
    async function refresh() {
      if (running) return;
      running = true;
      setBoardLoading(true);
      try {
        const rows = await classroomService.league(group!.id);
        if (live) {
          setLeaders(rows.leaders);
          setBoardError("");
        }
      } catch {
        if (live) setBoardError("Не удалось загрузить рейтинг.");
      } finally {
        running = false;
        if (live) setBoardLoading(false);
      }
    }
    void refresh();
    const timer = setInterval(refresh, 15000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [connected, actor.id, group?.id, panel, active, revision]);
  function action(a: ClassroomAction) {
    if (a.id === "active") {
      setPanel(a.value === "true");
      return;
    }
    if (a.id === "select" && groups.some((g) => g.id === a.value)) {
      setSelected(a.value!);
      setSent(0);
      return;
    }
    if (a.id === "meeting") {
      const item = c.data?.sessions.find(
        (s) => s.id === a.value && !s.cancelled,
      );
      const url = safeMeetingUrl(item?.meeting_url ?? "");
      if (url)
        void Linking.openURL(url).catch(() =>
          setLinkError("Не удалось открыть ссылку."),
        );
      return;
    }
    if (a.id === "refresh") {
      void c.refresh();
      setRevision((n) => n + 1);
      return;
    }
    if (a.id === "older") {
      void c.refresh(true);
      return;
    }
    if (a.id === "send")
      void c.send(a.value ?? "").then((ok) => {
        if (ok) setSent((n) => n + 1);
      });
  }
  return {
    action,
    snapshot: {
      groups: groups.map((g) => ({ id: g.id, name: g.name })),
      selected: group?.id ?? "",
      schedule: group?.schedule ?? "",
      data: c.data,
      error: c.error,
      loading: c.loading,
      busy: c.busy,
      hasOlder: c.hasOlder,
      leaders,
      boardError,
      boardLoading,
      linkError,
      connected,
      actorId: actor.id,
      sent,
    },
  };
}
export type StudentClassroomData = ReturnType<
  typeof useStudentClassroom
>["snapshot"];
