import { Profile, State } from "./types";

export const teachingGroups = (s: State, actor: Profile) =>
  actor.active && ["teacher", "admin"].includes(actor.role)
    ? s.classes.filter(
        (c) => actor.role === "admin" || c.teacherIds.includes(actor.id),
      )
    : [];

export function groupStudents(s: State, classId: string) {
  const group = s.classes.find((c) => c.id === classId);
  return s.profiles.filter(
    (p) => p.role === "student" && p.active && group?.studentIds.includes(p.id),
  );
}
