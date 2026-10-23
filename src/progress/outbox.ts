export type Store = {
  getItem(k: string): Promise<string | null>;
  setItem(k: string, v: string): Promise<void>;
  removeItem(k: string): Promise<void>;
};
export type ProgressCommand = {
  type: string;
  studentId: string;
  requestId: string;
  item?: any;
  event?: any;
  expectedRevision?: number;
};
/** Durable ordered queue scoped to identity and backend; network never blocks local persistence. */
export class ProgressOutbox {
  private serial: Promise<unknown> = Promise.resolve();
  private sending = new Map<string, Promise<void>>();
  constructor(
    private store: Store,
    private namespace: string,
    private send: (actor: string, c: ProgressCommand) => Promise<unknown>,
  ) {}
  private key(actor: string) {
    return `espada.progress.pending.v1:${this.namespace}:${actor}`;
  }
  read(actor: string): Promise<ProgressCommand[]> {
    return this.store
      .getItem(this.key(actor))
      .then((x) => (x ? JSON.parse(x) : []));
  }
  private lock<T>(fn: () => Promise<T>) {
    const job = this.serial.catch(() => {}).then(fn);
    this.serial = job;
    return job;
  }
  enqueue(actor: string, c: ProgressCommand) {
    return this.lock(async () => {
      const q = await this.read(actor);
      const prior = q.find((x) => x.requestId === c.requestId);
      if (prior && JSON.stringify(prior) !== JSON.stringify(c))
        throw Error("Конфликт сохранённой попытки. Ответы не заменены.");
      if (!prior) {
        q.push(c);
        await this.store.setItem(this.key(actor), JSON.stringify(q));
      }
    });
  }
  flush(actor: string): Promise<void> {
    const active = this.sending.get(actor);
    if (active) return active;
    const job = (async () => {
      while (true) {
        const next = await this.lock(async () => (await this.read(actor))[0]);
        if (!next) return;
        await this.send(actor, next);
        await this.lock(async () => {
          const q = await this.read(actor);
          await this.store.setItem(
            this.key(actor),
            JSON.stringify(q.filter((c) => c.requestId !== next.requestId)),
          );
        });
      }
    })();
    this.sending.set(actor, job);
    void job
      .finally(() => {
        if (this.sending.get(actor) === job) this.sending.delete(actor);
      })
      .catch(() => {});
    return job;
  }
}
