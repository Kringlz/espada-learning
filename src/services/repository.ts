import { upgradeFamilyDemo } from "../data/familyDemo";
import { upgradeVisualReportDemo } from "../data/visualReportDemo";
import { upgradeReportDemo } from "../data/reportDemo";
import { upgradeCurriculum, upgradeCodes } from "../data/upgrade";
import { State, Command, Role } from "../core/types";
import { applyCommand } from "../core/engine";
import { createSeed } from "../data/seed";
import { curriculum } from "../data/curriculum";
import { uid, generateUniqueCode } from "../core/ids";
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
      const upgraded = upgradeCodes(
        upgradeFamilyDemo(
          upgradeVisualReportDemo(upgradeReportDemo(upgradeCurriculum(data))),
        ),
      );
      if (upgraded !== data)
        await this.storage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
      return upgraded;
    }
    const seed = upgradeCodes(
      upgradeFamilyDemo(upgradeVisualReportDemo(upgradeReportDemo(createSeed()))),
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
  registerProfile(name: string, role: Role, code?: string): Promise<string> {
    const task = this.queue.then(async () => {
      const s = await this.read();
      const cleanName = name.trim();
      if (!cleanName) throw Error("Укажите имя.");
      if (!["teacher", "student", "parent"].includes(role))
        throw Error("Недопустимая роль.");
      const id = uid();
      const profile = {
        id,
        name: cleanName,
        role,
        active: true,
        code: generateUniqueCode(s.profiles.map((p) => p.code)),
      };
      if (role === "student") {
        const group = s.classes.find(
          (c) => c.joinCode === (code ?? "").trim().toUpperCase(),
        );
        if (!group) throw Error("Код группы не найден.");
        group.studentIds.push(id);
      } else if (role === "parent") {
        const student = s.profiles.find(
          (p) =>
            p.code === (code ?? "").trim().toUpperCase() &&
            p.role === "student" &&
            p.active,
        );
        if (!student) throw Error("Код ученика не найден.");
        s.parentLinks = [
          ...(s.parentLinks ?? []),
          {
            parentId: id,
            studentId: student.id,
            verifiedAt: new Date().toISOString(),
          },
        ];
      }
      s.profiles.push(profile);
      await this.storage.setItem(STORAGE_KEY, JSON.stringify(s));
      return id;
    });
    this.queue = task.catch(() => {});
    return task;
  }
}
