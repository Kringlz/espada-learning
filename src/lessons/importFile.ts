import { File } from "expo-file-system";
import type { DocumentPickerAsset } from "expo-document-picker";
export async function readImportFile(asset: DocumentPickerAsset) {
  return new File(asset.uri).text();
}
