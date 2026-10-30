import { applyCommand } from "../core/engine";
import { Command, State } from "../core/types";
import { curriculum } from "../data/curriculum";
import type { Storage } from "./repository";

export const GUEST_ID = "local-guest-student";
export const GUEST_ACTIVE_KEY = "espada.guest.active.v1";
export const GUEST_STATE_KEY = "espada.guest.learning.v1";

export function createGuestState(): State {
  return {
    schemaVersion: 1,
    profiles: [
      { id: GUEST_ID, name: "Гость", role: "student", active: true, code: "" },
    ],
    topics: curriculum,
    classes: [],
    templates: [],
    assessments: [],
    attempts: [],
    activities: [],
    assignments: [],
    audit: [],
    deletionRequests: [],
  };
}

export class GuestRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private storage: Storage) {}
  async read(): Promise<State> {
    const raw = await this.storage.getItem(GUEST_STATE_KEY);
    if (!raw) return createGuestState();
    const saved: State = JSON.parse(raw);
    if (
      saved.schemaVersion !== 1 ||
      saved.profiles?.length !== 1 ||
      saved.profiles[0].id !== GUEST_ID ||
      saved.profiles[0].role !== "student"
    )
      throw Error(
        "Не удалось прочитать гостевой прогресс. Данные не заменены.",
      );
    return { ...saved, topics: curriculum };
  }
  dispatch(cmd: Command): Promise<State> {
    const task = this.queue.then(async () => {
      const next = applyCommand(await this.read(), GUEST_ID, cmd);
      await this.storage.setItem(GUEST_STATE_KEY, JSON.stringify(next));
      return next;
    });
    this.queue = task.catch(() => {});
    return task;
  }
}
