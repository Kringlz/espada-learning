import { State } from "../core/types";
import { fixedId } from "../core/ids";
export function upgradeFamilyDemo(s: State): State {
  if (s.familyDemoVersion) return s;
  const parentId = fixedId(450),
    studentId = fixedId(1);
  if (s.profiles.some((p) => p.id === parentId))
    return { ...s, familyDemoVersion: 1 };
  const linked = s.profiles.some(
    (p) => p.id === studentId && p.role === "student" && p.active,
  );
  return {
    ...s,
    familyDemoVersion: 1,
    profiles: [
      ...s.profiles,
      { id: parentId, name: "Елена Морозова", role: "parent", active: true },
    ],
    parentLinks: [
      ...(s.parentLinks ?? []),
      ...(linked
        ? [{ parentId, studentId, verifiedAt: new Date().toISOString() }]
        : []),
    ],
  };
}
