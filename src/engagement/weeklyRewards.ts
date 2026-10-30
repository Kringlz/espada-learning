import { RewardEvent, rewardKey } from "./rewards";
type Store = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
};
/** Durable, actor-scoped retries. Only newly earned awards enter this queue. */
export class WeeklyRewardOutbox {
  private pending = new Map<string, RewardEvent>();
  private loaded = false;
  private stopped = false;
  private jobs: Promise<void> = Promise.resolve();
  private key: string;
  constructor(
    actorId: string,
    private store: Store,
    private send: (events: RewardEvent[]) => Promise<void>,
    private status: (error: string) => void,
  ) {
    this.key = `espada.weekly.pending:${encodeURIComponent(actorId)}`;
  }
  private async load() {
    if (this.loaded) return;
    const raw = await this.store.getItem(this.key);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) throw Error("Invalid pending rewards");
    for (const e of parsed)
      if (
        (e?.kind === "video" || e?.kind === "question") &&
        typeof e.id === "string" &&
        e.id.length <= 500
      )
        this.pending.set(rewardKey(e), e);
    this.loaded = true;
  }
  private save() {
    return this.store.setItem(
      this.key,
      JSON.stringify([...this.pending.values()]),
    );
  }
  enqueue(events: RewardEvent[]) {
    return this.run(events);
  }
  retry() {
    return this.run([]);
  }
  stop() {
    this.stopped = true;
  }
  private run(events: RewardEvent[]) {
    // Keep newly earned events in memory even if the initial storage read fails.
    for (const e of events) this.pending.set(rewardKey(e), e);
    this.jobs = this.jobs
      .catch(() => {})
      .then(async () => {
        try {
          await this.load();
          await this.save();
          while (this.pending.size && !this.stopped) {
            const batch = [...this.pending.values()].slice(0, 100);
            await this.send(batch);
            for (const e of batch) this.pending.delete(rewardKey(e));
            await this.save();
          }
          if (!this.stopped) this.status("");
        } catch {
          if (!this.stopped)
            this.status(
              "Очки лиги ещё не отправлены. Повторим при подключении.",
            );
        }
      });
    return this.jobs;
  }
}
