import { backend } from "../services/supabase";
export type ClassSession = {
  id: string;
  class_id: string;
  starts_at: string;
  previous_starts_at: string | null;
  topic: string;
  location: string;
  meeting_url: string;
  cancelled: boolean;
  revision: number;
};
export type ClassMessage = {
  id: string;
  class_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
};
export type ClassData = {
  classId: string;
  members: { id: string; name: string; role: string }[];
  messages: ClassMessage[];
  sessions: ClassSession[];
};
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  if (!backend) throw Error("Нет подключения.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const { data, error } = await backend
      .rpc(name, args)
      .abortSignal(controller.signal);
    if (error)
      throw Error(
        error.code === "PGRST202"
          ? "Раздел пока недоступен."
          : error.code === "42501"
            ? "Нет доступа к группе."
            : "Не удалось загрузить или сохранить данные. Повторите попытку.",
      );
    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}
export type WeeklyLeader = {
  id: string;
  name: string;
  points: number;
  rank: number;
};
export const classroomService = {
  league: (classId: string) =>
    rpc<{ startsAt: string; endsAt: string; leaders: WeeklyLeader[] }>(
      "classroom_league",
      { p_class: classId },
    ),
  read: (classId: string, before?: ClassMessage) =>
    rpc<ClassData>("classroom_read", {
      p_class: classId,
      p_before: before?.created_at ?? null,
      p_before_id: before?.id ?? null,
    }),
  send: (classId: string, id: string, body: string) =>
    rpc<void>("classroom_send", { p_class: classId, p_id: id, p_body: body }),
  save: (classId: string, item: Partial<ClassSession>) =>
    rpc<void>("classroom_save_session", { p_class: classId, p_item: item }),
};
export function sessionDate(at: string) {
  return new Date(at).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
export function safeMeetingUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}
export function mergeMessages(previous: ClassMessage[], next: ClassMessage[]) {
  return [
    ...new Map([...previous, ...next].map((m) => [m.id, m])).values(),
  ].sort(
    (a, b) =>
      a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
}
