import * as DocumentPicker from "expo-document-picker";
import { bytes, storeFile, resolveFile, removeFile } from "./videoFiles";
import { backend, mode } from "./supabase";
import { uid } from "../core/ids";
import { VideoLesson } from "../core/types";
import { validateVideoFile } from "../core/video";
export const VIDEO_BUCKET = "lesson-videos";
export async function pickVideo() {
  const picked = await DocumentPicker.getDocumentAsync({
    type: "video/mp4",
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  validateVideoFile(asset.name, asset.size ?? 0, asset.mimeType);
  return asset;
}
export async function uploadVideo(
  asset: DocumentPicker.DocumentPickerAsset,
  title: string,
  actorId: string,
  topicId: string,
): Promise<VideoLesson> {
  validateVideoFile(asset.name, asset.size ?? 0, asset.mimeType);
  if (!title.trim() || title.trim().length > 160)
    throw Error("Введите название видеоурока (до 160 символов).");
  const id = uid();
  const storageKey = `${actorId}/${topicId}/${id}.mp4`;
  const video: VideoLesson = {
    id,
    title: title.trim(),
    fileName: asset.name,
    mimeType: "video/mp4",
    size: asset.size!,
    storage: mode === "demo" ? "local" : "supabase",
    storageKey,
    uploadedBy: actorId,
    uploadedAt: new Date().toISOString(),
  };
  if (mode === "demo") await storeFile(storageKey, asset);
  else {
    if (!backend) throw Error("Сервер не настроен.");
    const { error } = await backend.storage
      .from(VIDEO_BUCKET)
      .upload(storageKey, await bytes(asset), {
        contentType: "video/mp4",
        upsert: false,
      });
    if (error)
      throw Error(
        "Не удалось загрузить видео на сервер. Проверьте соединение и повторите попытку.",
      );
  }
  return video;
}
export async function resolveVideo(video: VideoLesson) {
  if (video.storage === "local") return resolveFile(video.storageKey);
  if (!backend)
    throw Error("Для просмотра этого видео войдите в подключённый аккаунт.");
  const { data, error } = await backend.storage
    .from(VIDEO_BUCKET)
    .createSignedUrl(video.storageKey, 21600);
  if (error || !data)
    throw Error(
      "Не удалось открыть видео. Проверьте соединение и повторите попытку.",
    );
  return { url: data.signedUrl, release: () => {} };
}
export async function discardVideo(video: VideoLesson) {
  if (video.storage === "local") await removeFile(video.storageKey);
  else {
    if (!backend) return;
    const { error } = await backend.storage
      .from(VIDEO_BUCKET)
      .remove([video.storageKey]);
    if (error) throw error;
  }
}
