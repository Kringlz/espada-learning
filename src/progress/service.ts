import { Platform } from "react-native";
import { File } from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { backend, mode } from "../services/supabase";
import { ProgressOutbox, ProgressCommand } from "./outbox";
import { ProgressData, validateAttachment } from "./model";
export const previewURL = process.env.EXPO_PUBLIC_PROGRESS_PREVIEW_URL;
export const progressConnected = !!backend || !!previewURL;
export const progressEnvironment = previewURL
  ? "Локальная тестовая база · тестовые аккаунты"
  : backend
    ? "Синхронизация с сервером"
    : "Сервер прогресса не подключён";
async function deadline<T>(
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}
export async function progressRPC(
  actor: string,
  name: string,
  args: Record<string, unknown>,
) {
  if (previewURL && mode === "demo") {
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(previewURL))
      throw Error("Разрешён только локальный тестовый сервер.");
    const r = await deadline((signal) =>
      fetch(`${previewURL}/rpc`, {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          "X-Preview-Actor": actor,
        },
        body: JSON.stringify({ name, args }),
      }),
    );
    const body = await r.json();
    if (!r.ok || body.error) throw Error(body.error || "Сервер недоступен.");
    return body.data;
  }
  if (!backend)
    throw Error(
      "История занятий требует подключения к серверу. Локальная демонстрация её не подменяет.",
    );
  const session = await backend.auth.getSession();
  if (session.error || session.data.session?.user.id !== actor)
    throw Error(
      "Сессия изменилась. Войдите в исходный аккаунт для отправки данных.",
    );
  const { data, error } = await deadline((signal) =>
    Promise.resolve(backend!.rpc(name, args).abortSignal(signal)),
  );
  if (error) throw Error(error.message);
  return data;
}
export const readProgress = (
  actor: string,
  student: string,
): Promise<ProgressData> =>
  progressRPC(actor, "progress_read", { p_student: student });
export const sendProgress = (actor: string, command: ProgressCommand) =>
  progressRPC(actor, "progress_command", { p_command: command });
export const progressOutbox = new ProgressOutbox(
  AsyncStorage,
  previewURL || process.env.EXPO_PUBLIC_SUPABASE_URL || "unconfigured",
  sendProgress,
);
export async function uploadWorkFile(
  actor: string,
  path: string,
  file: { uri: string; mimeType: string; size: number },
) {
  validateAttachment(file.mimeType, file.size);
  const buffer =
    Platform.OS === "web"
      ? await (await fetch(file.uri)).arrayBuffer()
      : await new File(file.uri).arrayBuffer();
  validateAttachment(file.mimeType, buffer.byteLength);
  const bytes = new Uint8Array(buffer);
  const detected =
    bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      ? "image/jpeg"
      : bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10"
        ? "image/png"
        : String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-"
          ? "application/pdf"
          : null;
  if (detected !== file.mimeType)
    throw Error("Содержимое файла не соответствует его типу.");
  if (previewURL && mode === "demo") {
    const r = await fetch(
      `${previewURL}/file?path=${encodeURIComponent(path)}`,
      {
        method: "POST",
        headers: { "X-Preview-Actor": actor, "Content-Type": file.mimeType },
        body: buffer,
      },
    );
    const body = await r.json();
    if (!r.ok) throw Error(body.error || "Загрузка не подтверждена.");
    return;
  }
  if (!backend) throw Error("Сервер файлов не подключён.");
  const { error } = await backend.storage
    .from("student-works")
    .upload(path, buffer, { contentType: file.mimeType, upsert: false });
  if (error) throw Error(error.message);
}
export async function workFileURL(actor: string, path: string) {
  if (previewURL && mode === "demo") {
    const r = await fetch(
      `${previewURL}/file?path=${encodeURIComponent(path)}`,
      { headers: { "X-Preview-Actor": actor } },
    );
    if (!r.ok) throw Error("Файл недоступен.");
    return URL.createObjectURL(await r.blob());
  }
  if (!backend) throw Error("Сервер файлов не подключён.");
  const { data, error } = await backend.storage
    .from("student-works")
    .createSignedUrl(path, 60);
  if (error) throw Error(error.message);
  return data.signedUrl;
}

export const lessonSync = progressConnected
  ? { outbox: progressOutbox, read: readProgress }
  : undefined;
