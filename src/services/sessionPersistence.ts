export interface SessionStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
/** Stores session tokens, never passwords. Queued moves prevent refresh/save races. */
export class SessionPersistence implements SessionStore {
  private queue: Promise<unknown> = Promise.resolve();
  private keys: Set<string>;
  constructor(
    private options: {
      durable: SessionStore;
      temporary: SessionStore;
      preferences: SessionStore;
      preferenceKey: string;
      authKey: string;
      defaultRemember?: boolean;
    },
  ) {
    this.keys = new Set([
      options.authKey,
      `${options.authKey}-code-verifier`,
      `${options.authKey}-user`,
    ]);
  }
  private run<T>(action: () => Promise<T>): Promise<T> {
    const job = this.queue.then(action);
    this.queue = job.catch(() => {});
    return job;
  }
  async remembers() {
    const value = await this.options.preferences.getItem(
      this.options.preferenceKey,
    );
    return value === null ? !!this.options.defaultRemember : value === "true";
  }
  setRemember(remember: boolean) {
    return this.run(async () => {
      const before = await this.remembers();
      const from = before ? this.options.durable : this.options.temporary;
      const to = remember ? this.options.durable : this.options.temporary;
      const other = remember ? this.options.temporary : this.options.durable;
      for (const key of this.keys) {
        const value = await from.getItem(key);
        if (value !== null) await to.setItem(key, value);
        await other.removeItem(key);
      }
      await this.options.preferences.setItem(
        this.options.preferenceKey,
        String(remember),
      );
    });
  }
  getItem(key: string) {
    return this.run(async () => {
      this.keys.add(key);
      const store = (await this.remembers())
        ? this.options.durable
        : this.options.temporary;
      return store.getItem(key);
    });
  }
  setItem(key: string, value: string) {
    return this.run(async () => {
      this.keys.add(key);
      const remember = await this.remembers();
      await (remember ? this.options.durable : this.options.temporary).setItem(
        key,
        value,
      );
      await (
        remember ? this.options.temporary : this.options.durable
      ).removeItem(key);
    });
  }
  removeItem(key: string) {
    return this.run(async () => {
      await Promise.all([
        this.options.durable.removeItem(key),
        this.options.temporary.removeItem(key),
      ]);
    });
  }
}
export function memorySessionStore(): SessionStore {
  const values = new Map<string, string>();
  return {
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      values.set(key, value);
    },
    async removeItem(key) {
      values.delete(key);
    },
  };
}
