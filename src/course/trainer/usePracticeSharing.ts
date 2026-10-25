import { useEffect, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { backend } from "../../services/supabase";
import { uid } from "../../core/ids";
import { CourseProgress } from "../model";
import { practiceSnapshots } from "./sharing";
export function usePracticeSharing(
  actorId: string,
  enabled: boolean,
  ready: boolean,
  progress: CourseProgress,
) {
  const [status, setStatus] = useState<"saved" | "pending" | "error">("saved");
  const [retry, setRetry] = useState(0);
  const payload = JSON.stringify(practiceSnapshots(progress));
  useEffect(() => {
    if (!backend || !enabled || !ready || payload === "[]") return;
    let live = true;
    const controller = new AbortController();
    setStatus("pending");
    const timer = setTimeout(async () => {
      try {
        const key = `espada.practice-device.v1:${actorId}`;
        let device = await AsyncStorage.getItem(key);
        if (!device) {
          device = uid();
          await AsyncStorage.setItem(key, device);
        }
        const { data, error: sessionError } = await backend!.auth.getSession();
        if (sessionError || data.session?.user.id !== actorId)
          throw Error("Сессия изменилась");
        if (!live) return;
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
          const { error } = await backend!
            .rpc("save_trainer_practice", {
              p_device: device,
              p_items: JSON.parse(payload),
            })
            .abortSignal(controller.signal);
          if (error) throw error;
          if (live) setStatus("saved");
        } finally {
          clearTimeout(timeout);
        }
      } catch {
        if (live) setStatus("error");
      }
    }, 600);
    return () => {
      live = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [actorId, enabled, ready, payload, retry]);
  useEffect(() => {
    if (!backend || !enabled) return;
    const again = () => setRetry((n) => n + 1);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") again();
    });
    const timer = setInterval(again, 60000);
    if (typeof window !== "undefined") window.addEventListener("online", again);
    return () => {
      clearInterval(timer);
      sub.remove();
      if (typeof window !== "undefined")
        window.removeEventListener("online", again);
    };
  }, [enabled]);
  return { status, retry: () => setRetry((n) => n + 1) };
}
