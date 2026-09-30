import { errorMessage } from "../i18n/errors";
import { Platform } from "react-native";
import { backend, mode } from "../services/supabase";
import {
  LessonCatalog,
  PublicLesson,
  LessonPackage,
  ImportPreview,
  LessonAttempt,
  AttemptSummary,
} from "./types";
const previewUrl = process.env.EXPO_PUBLIC_LESSON_PREVIEW_URL;
export const isLessonPreview =
  mode === "demo" &&
  Platform.OS === "web" &&
  typeof location !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(location.hostname) &&
  previewUrl === "http://127.0.0.1:55433";
export const lessonStorageReady = !!backend || isLessonPreview;
export const missingLessonStorage =
  "База уроков ещё не подключена. После подключения Supabase здесь появятся уроки, тесты и сохранённые результаты.";
export function lessonService(actorId: string) {
  async function call<T>(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<T> {
    if (backend) {
      const { data, error } = await backend.rpc(name, args);
      if (error)
        throw Error(
          error.code === "PGRST202"
            ? "Уроки пока недоступны. Обратитесь к администратору."
            : errorMessage(error),
        );
      return data as T;
    }
    if (isLessonPreview) {
      let response: Response;
      try {
        response = await fetch(`${previewUrl}/rpc`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Preview-Actor": actorId,
          },
          body: JSON.stringify({ name, args }),
        });
      } catch {
        throw Error(
          "Локальная база недоступна. Запустите сервер предпросмотра и повторите действие.",
        );
      }
      const result = await response.json();
      if (!response.ok || result.error)
        throw Error(
          errorMessage(
            typeof result.error === "string"
              ? result.error.split("\n")[0].replace(/^ERROR:\s*/, "")
              : "База недоступна. Повторите действие.",
          ),
        );
      return result.data;
    }
    throw Error(missingLessonStorage);
  }
  return {
    catalog: () => call<LessonCatalog>("lesson_catalog"),
    read: (id: string) => call<PublicLesson>("lesson_read", { p_id: id }),
    export: (id: string | null) =>
      call<LessonPackage>("lesson_admin_export", { p_id: id }),
    import: (
      data: LessonPackage,
      dryRun: boolean,
      requestId: string | null = null,
    ) =>
      call<ImportPreview>("lesson_import", {
        p_package: data,
        p_dry_run: dryRun,
        p_request_id: requestId,
      }),
    history: (id: string | null) =>
      call<AttemptSummary[]>("lesson_attempt_history", { p_lesson_id: id }),
    attempt: (id: string) =>
      call<LessonAttempt>("lesson_attempt_read", { p_id: id }),
    start: (id: string, key: string) =>
      call<LessonAttempt>("lesson_start", {
        p_lesson_id: id,
        p_request_id: key,
      }),
    save: (attempt: LessonAttempt, answers: LessonAttempt["answers"]) =>
      call<LessonAttempt>("lesson_save_answers", {
        p_attempt_id: attempt.id,
        p_answers: answers,
        p_revision: attempt.revision,
      }),
    submit: (attempt: LessonAttempt) =>
      call<LessonAttempt>("lesson_submit", {
        p_attempt_id: attempt.id,
        p_revision: attempt.revision,
      }),
  };
}
