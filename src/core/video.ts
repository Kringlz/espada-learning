import { VideoLesson } from "./types";
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export function validateVideoFile(name: string, size: number, mime?: string) {
  if (
    !/\.mp4$/i.test(name) ||
    (mime && mime !== "video/mp4" && mime !== "application/octet-stream")
  )
    throw Error("Выберите видео в формате MP4.");
  if (!Number.isFinite(size) || size <= 0 || size > MAX_VIDEO_BYTES)
    throw Error("Размер видео должен быть от 1 байта до 50 МБ.");
}
export function validateVideo(
  v: VideoLesson,
  actorId: string,
  topicId: string,
) {
  validateVideoFile(v.fileName, v.size, v.mimeType);
  if (
    !v.title.trim() ||
    v.title.length > 160 ||
    !/^[a-zA-Z0-9-]+$/.test(v.id) ||
    v.uploadedBy !== actorId ||
    !Number.isFinite(Date.parse(v.uploadedAt)) ||
    !["local", "supabase"].includes(v.storage) ||
    v.storageKey !== `${actorId}/${topicId}/${v.id}.mp4`
  )
    throw Error("Некорректные данные видеоурока.");
}
