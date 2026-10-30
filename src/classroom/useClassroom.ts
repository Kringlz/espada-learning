import { useCallback, useEffect, useRef, useState } from "react";
import { uid } from "../core/ids";
import {
  ClassData,
  ClassSession,
  classroomService,
  mergeMessages,
} from "./service";
export function useClassroom(classId: string, enabled: boolean) {
  const [data, setData] = useState<ClassData>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const epoch = useRef(0),
    lock = useRef(false),
    request = useRef(0);
  const pending = useRef<
    { classId: string; body: string; id: string } | undefined
  >(undefined);
  const current = useRef(data);
  current.current = data;
  const refresh = useCallback(
    async (older = false) => {
      if (!enabled || !classId) return;
      const generation = epoch.current,
        sequence = ++request.current;
      setLoading(true);
      try {
        const before = older ? current.current?.messages[0] : undefined;
        const next = await classroomService.read(classId, before);
        if (generation !== epoch.current || sequence !== request.current)
          return;
        setData((previous) => ({
          ...next,
          messages: mergeMessages(
            previous?.classId === classId ? previous.messages : [],
            next.messages,
          ),
        }));
        if (older || current.current?.classId !== classId)
          setHasOlder(next.messages.length === 50);
        setError("");
      } catch (e) {
        if (generation === epoch.current && sequence === request.current) {
          setData(undefined);
          setError((e as Error).message);
        }
      } finally {
        if (generation === epoch.current && sequence === request.current)
          setLoading(false);
      }
    },
    [classId, enabled],
  );
  useEffect(() => {
    epoch.current++;
    request.current++;
    setData(undefined);
    setError("");
    setBusy(false);
    lock.current = false;
    setHasOlder(false);
    if (!enabled || !classId) {
      setLoading(false);
      return;
    }
    void refresh();
    const timer = setInterval(() => {
      if (!lock.current) void refresh();
    }, 15000);
    return () => {
      epoch.current++;
      request.current++;
      clearInterval(timer);
    };
  }, [refresh]);
  async function mutate(run: () => Promise<void>) {
    if (!enabled || !classId || lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    const generation = epoch.current;
    try {
      await run();
      if (generation !== epoch.current) return false;
      await refresh();
      return true;
    } catch (e) {
      if (generation === epoch.current) setError((e as Error).message);
      return false;
    } finally {
      if (generation === epoch.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  return {
    data: data?.classId === classId && enabled ? data : undefined,
    error,
    loading,
    busy,
    hasOlder,
    refresh,
    send: async (body: string) => {
      const text = body.trim();
      if (!text || text.length > 2000) return false;
      if (pending.current?.body !== text || pending.current.classId !== classId)
        pending.current = { classId, body: text, id: uid() };
      const item = pending.current;
      const ok = await mutate(() =>
        classroomService.send(classId, item.id, item.body),
      );
      if (ok && pending.current === item) pending.current = undefined;
      return ok;
    },
    save: (item: Partial<ClassSession>) =>
      mutate(() => classroomService.save(classId, item)),
  };
}
