import { useEffect, useState } from "react";
import { GroupSummary } from "./model";
export function useGroupSummary(
  actorId: string,
  groupId: string,
  enabled: boolean,
  load: (actorId: string, groupId: string) => Promise<GroupSummary>,
) {
  const [data, setData] = useState<GroupSummary | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const requestedScope = `${actorId}:${groupId}`;
  const [scope, setScope] = useState("");
  useEffect(() => {
    setScope(`${actorId}:${groupId}`);
    let active = true;
    setData(null);
    setError("");
    setLoading(enabled);
    if (enabled)
      void load(actorId, groupId)
        .then((d) => {
          if (active) setData(d);
        })
        .catch(() => {
          if (active)
            setError(
              "Не удалось загрузить активность группы. Проверьте подключение и повторите.",
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    return () => {
      active = false;
    };
  }, [actorId, groupId, enabled, load, revision]);
  return {
    data: enabled && scope === requestedScope ? data : null,
    error: scope === requestedScope ? error : "",
    loading: enabled && (scope !== requestedScope || loading),
    refresh: () => setRevision((n) => n + 1),
  };
}
