export type ClassroomAction = {
  type: "classroom";
  id: "select" | "refresh" | "older" | "send" | "active" | "meeting";
  value?: string;
};
export function validClassroomAction(a: ClassroomAction) {
  return (
    ["select", "refresh", "older", "send", "active", "meeting"].includes(
      a.id,
    ) &&
    (a.value === undefined ||
      (typeof a.value === "string" && a.value.length <= 2000))
  );
}
