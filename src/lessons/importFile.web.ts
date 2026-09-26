import type { DocumentPickerAsset } from "expo-document-picker";
export async function readImportFile(asset: DocumentPickerAsset) {
  if (!asset.file) throw Error("Файл недоступен. Выберите его ещё раз.");
  return asset.file.text();
}
