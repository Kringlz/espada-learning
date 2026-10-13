import { PrivateStorage } from "./outbox";

/** Stores SDK session tokens only. Passwords are never passed to this adapter. */
export class AuthSessionStorage implements PrivateStorage {
  private readonly preferenceKey: string;
  constructor(
    private readonly temporary: PrivateStorage,
    private readonly persistent: PrivateStorage,
    private readonly sessionKey: string,
  ) {
    this.preferenceKey = `${sessionKey}.remember`;
  }

  async remember() {
    return (await this.persistent.getItem(this.preferenceKey)) === "yes";
  }
  async choose(remember: boolean) {
    // Make the explicit choice before sign-in; never migrate a prior account's token.
    await this.clear();
    if (remember) await this.persistent.setItem(this.preferenceKey, "yes");
  }
  async getItem(key: string) {
    return ((await this.remember()) ? this.persistent : this.temporary).getItem(
      key,
    );
  }
  async setItem(key: string, value: string) {
    const remembered = await this.remember();
    const target = remembered ? this.persistent : this.temporary;
    const other = remembered ? this.temporary : this.persistent;
    await other.removeItem(key);
    await target.setItem(key, value);
  }
  async removeItem(key: string) {
    await Promise.all([
      this.temporary.removeItem(key),
      this.persistent.removeItem(key),
    ]);
    if (key === this.sessionKey)
      await this.persistent.removeItem(this.preferenceKey);
  }
  async clear() {
    for (const key of [
      this.sessionKey,
      `${this.sessionKey}-code-verifier`,
      `${this.sessionKey}-user`,
    ])
      await this.removeItem(key);
    await this.persistent.removeItem(this.preferenceKey);
  }
}
export function memoryStorage(): PrivateStorage {
  const data = new Map<string, string>();
  return {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
  };
}

/** UI state updates are asynchronous; also guard the actual auth request. */
export function singleFlight<T>() {
  let pending: Promise<T> | null = null;
  return (action: () => Promise<T>): Promise<T> => {
    if (pending) return pending;
    pending = Promise.resolve()
      .then(action)
      .finally(() => {
        pending = null;
      });
    return pending;
  };
}
