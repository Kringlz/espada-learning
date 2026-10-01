import { upgradeFamilyDemo } from "../data/familyDemo";
import { upgradeVisualReportDemo } from "../data/visualReportDemo";
import { upgradeReportDemo } from "../data/reportDemo";
import { upgradeCurriculum } from "../data/upgrade";
import { State, Command } from "../core/types";
import { applyCommand } from "../core/engine";
import { createSeed } from "../data/seed";
import { curriculum } from "../data/curriculum";
export const STORAGE_KEY = "espada.learning.v1";
export interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export class LocalRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private storage: Storage) {}
  async read(): Promise<State> {
    const raw = await this.storage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.schemaVersion !== 1 || !Array.isArray(data.profiles))
        throw Error(
          "Saved data could not be read. Your records have not been replaced.",
        );
      // Repair ambiguous original demo distractors from pre-release seeds only.
      // Never rewrite a question with recorded attempts, or unrelated authored content.
      let repaired = false;
      for (const topic of data.topics) {
        const original = curriculum.find((t) => t.id === topic.id);
        if (!original) continue;
        topic.checks = topic.checks.map((q: any) => {
          const attempted = data.attempts.some((a: any) =>
            a.answers.some((x: any) => x.questionId === q.id),
          );
          const corrected = original.checks.find((x) => x.id === q.id);
          if (
            !attempted &&
            corrected &&
            q.prompt === corrected.prompt &&
            q.explanation === corrected.explanation &&
            new Set(q.choices).size !== q.choices.length
          ) {
            repaired = true;
            return corrected;
          }
          return q;
        });
      }
      if (repaired)
        await this.storage.setItem(STORAGE_KEY, JSON.stringify(data));
      const upgraded = upgradeFamilyDemo(
        upgradeVisualReportDemo(upgradeReportDemo(upgradeCurriculum(data))),
      );
      if (upgraded !== data)
        await this.storage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
      return upgraded;
    }
    const seed = upgradeFamilyDemo(
      upgradeVisualReportDemo(upgradeReportDemo(createSeed())),
    );
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
  dispatch(actorId: string, cmd: Command): Promise<State> {
    const task = this.queue.then(async () => {
      const old = await this.read();
      const next = applyCommand(old, actorId, cmd);
      await this.storage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    this.queue = task.catch(() => {});
    return task;
  }
}
