import type { DocumentPickerAsset } from "expo-document-picker";
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("espada-videos", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(Error("Не удалось открыть хранилище видео в браузере."));
  });
}
async function transact<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", mode);
    const req = operation(tx.objectStore("files"));
    tx.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(
        Error(
          "Не удалось сохранить видео. Проверьте свободное место в браузере.",
        ),
      );
    };
  });
}
export async function bytes(asset: DocumentPickerAsset) {
  if (!asset.file) throw Error("Файл недоступен. Выберите его ещё раз.");
  return asset.file.arrayBuffer();
}
export async function storeFile(key: string, asset: DocumentPickerAsset) {
  if (!asset.file) throw Error("Файл недоступен.");
  await transact("readwrite", (store) => store.put(asset.file, key));
}
export async function resolveFile(key: string) {
  const blob = await transact<Blob | undefined>("readonly", (store) =>
    store.get(key),
  );
  if (!blob)
    throw Error(
      "Видео не найдено на этом устройстве. Попросите преподавателя загрузить его снова.",
    );
  const url = URL.createObjectURL(blob);
  return { url, release: () => URL.revokeObjectURL(url) };
}
export async function removeFile(key: string) {
  await transact("readwrite", (store) => store.delete(key));
}
