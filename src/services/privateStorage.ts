import { PrivateStorage } from "./outbox";
/** Two generations keep the prior value readable if a chunk write is interrupted. */
export class ChunkedPrivateStorage implements PrivateStorage {
  constructor(private storage: PrivateStorage) {}
  async getItem(key: string) {
    const slot = await this.storage.getItem(`${key}.slot`);
    if (!slot) return null;
    const count = Number(
      (await this.storage.getItem(`${key}.${slot}.count`)) ?? 0,
    );
    if (!count) return null;
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        this.storage.getItem(`${key}.${slot}.${i}`),
      ),
    );
    return chunks.some((c) => c === null) ? null : chunks.join("");
  }
  async setItem(key: string, value: string) {
    const slot =
      (await this.storage.getItem(`${key}.slot`)) === "a" ? "b" : "a";
    const prefix = `${key}.${slot}`;
    const previous = Number(
      (await this.storage.getItem(`${prefix}.count`)) ?? 0,
    );
    const chunks = value.match(/[\s\S]{1,500}/g) ?? [""];
    await this.storage.setItem(
      `${prefix}.count`,
      String(Math.max(previous, chunks.length)),
    );
    for (let i = 0; i < chunks.length; i++)
      await this.storage.setItem(`${prefix}.${i}`, chunks[i]);
    for (let i = chunks.length; i < previous; i++)
      await this.storage.removeItem(`${prefix}.${i}`);
    await this.storage.setItem(`${prefix}.count`, String(chunks.length));
    await this.storage.setItem(`${key}.slot`, slot);
  }
  async removeItem(key: string) {
    await this.storage.removeItem(`${key}.slot`);
    for (const slot of ["a", "b"]) {
      const prefix = `${key}.${slot}`;
      const count = Number(
        (await this.storage.getItem(`${prefix}.count`)) ?? 0,
      );
      for (let i = 0; i < count; i++)
        await this.storage.removeItem(`${prefix}.${i}`);
      await this.storage.removeItem(`${prefix}.count`);
    }
  }
}
