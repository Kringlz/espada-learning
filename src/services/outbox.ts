import { Command, State } from "../core/types";
export interface PrivateStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export class LearningOutbox {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private storage: PrivateStorage,
    private send: (command: Command) => Promise<State>,
  ) {}
  private key(actorId: string) {
    return `espada.pending.${actorId}`;
  }
  async read(actorId: string): Promise<Command[]> {
    const raw = await this.storage.getItem(this.key(actorId));
    return raw ? JSON.parse(raw) : [];
  }
  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const work = this.queue.then(operation);
    this.queue = work.catch(() => {});
    return work;
  }
  submit(actorId: string, command: Command): Promise<State> {
    return this.serial(async () => {
      // Persist only the student's own learning commands. Staff mutations require an explicit online retry.
      if (
        command.type !== "saveActivity" &&
        command.type !== "submitAttempt" &&
        command.type !== "saveVideoPosition"
      )
        return this.send(command);
      const pending = await this.read(actorId);
      const duplicate = pending.some(
        (c) =>
          c.type === "submitAttempt" &&
          command.type === "submitAttempt" &&
          c.attempt.id === command.attempt.id,
      );
      if (!duplicate) {
        pending.push(command);
        await this.storage.setItem(this.key(actorId), JSON.stringify(pending));
      }
      return this.flush(actorId);
    });
  }
  retry(actorId: string): Promise<State> {
    return this.serial(() => this.flush(actorId));
  }
  private async flush(actorId: string): Promise<State> {
    const pending = await this.read(actorId);
    let state: State | undefined;
    while (pending.length) {
      state = await this.send(pending[0]);
      pending.shift();
      if (pending.length)
        await this.storage.setItem(this.key(actorId), JSON.stringify(pending));
      else await this.storage.removeItem(this.key(actorId));
    }
    if (!state)
      throw Error("No pending work. Refresh to load your latest records.");
    return state;
  }
}
