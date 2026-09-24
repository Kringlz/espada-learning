import type { DocumentPickerAsset } from "expo-document-picker";
import { File, Directory, Paths } from "expo-file-system";
function destination(key: string) {
  const dir = new Directory(Paths.document, "lesson-videos");
  dir.create({ idempotent: true, intermediates: true });
  return new File(dir, encodeURIComponent(key));
}
export async function bytes(asset: DocumentPickerAsset) {
  return new File(asset.uri).arrayBuffer();
}
export async function storeFile(key: string, asset: DocumentPickerAsset) {
  new File(asset.uri).copy(destination(key));
}
export async function resolveFile(key: string) {
  const file = destination(key);
  if (!file.exists)
    throw Error(
      "Видео не найдено на этом устройстве. Попросите преподавателя загрузить его снова.",
    );
  return { url: file.uri, release: () => {} };
}
export async function removeFile(key: string) {
  const file = destination(key);
  if (file.exists) file.delete();
}
