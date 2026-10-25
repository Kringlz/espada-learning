import {
  trainerBank as bankV1,
  trainerQuestion as questionV1,
  type Question as LegacyQuestion,
} from "./legacyBank";
import {
  trainerBank as bankV2,
  trainerQuestion as questionV2,
} from "./legacyBankV2";
import { juniorFamilies } from "./juniorFamilies";
import { middleFamilies } from "./middleFamilies";
import { advancedFamilies } from "./advancedFamilies";
import { type FamilyDraft } from "./qualityTypes";

export type Question = LegacyQuestion & { skill?: string; difficulty?: 1 | 2 };
export const TRAINER_BANK_VERSION = 3;
const VARIANTS = 24;
function families(topic: string, variant: number): FamilyDraft[] {
  const result =
    juniorFamilies(topic, variant) ??
    middleFamilies(topic, variant) ??
    advancedFamilies(topic, variant);
  if (!result) throw Error(`No reviewed trainer families for ${topic}`);
  return result;
}
function fromDraft(
  topic: string,
  variant: number,
  draft: FamilyDraft,
): Question {
  return {
    id: `${topic}-generated-v3-${draft.skill}-${variant}`,
    prompt: draft.prompt,
    choices: draft.choices,
    correct: 0,
    concept: topic,
    hints: [draft.hint],
    solution: draft.solution,
    skill: draft.skill,
    difficulty: draft.difficulty,
    source:
      "Собственная задача Espada: проверенное семейство с ограниченными параметрами.",
  };
}
export function generatedQuestion(topic: string, i: number): Question {
  const count = families(topic, 0).length;
  const variant = Math.floor(i / count) % VARIANTS;
  return fromDraft(topic, variant, families(topic, variant)[i % count]);
}
const banks = new Map<string, Question[]>();
export function trainerBank(topic: string): Question[] {
  if (!banks.has(topic)) {
    const unique = new Map<string, Question>();
    for (let variant = 0; variant < VARIANTS; variant++) {
      for (const draft of families(topic, variant)) {
        const q = fromDraft(topic, variant, draft);
        // A choice-identification question can legitimately keep its wording while its options change.
        const signature = JSON.stringify([q.prompt, [...q.choices].sort()]);
        if (!unique.has(signature)) unique.set(signature, q);
      }
    }
    banks.set(topic, [...unique.values()]);
  }
  return banks.get(topic)!;
}
export function questionById(topic: string, id: string): Question | undefined {
  return (
    trainerBank(topic).find((q) => q.id === id) ??
    bankV2(topic).find((q) => q.id === id) ??
    bankV1(topic).find((q) => q.id === id)
  );
}
function shuffled<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const j = Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
/** Stable, family-balanced cycles. First encounter introduces basic skills before compound tasks. */
function practiceOrder(topic: string, seed: number): Question[] {
  const groups = new Map<string, Question[]>();
  for (const q of trainerBank(topic)) {
    const group = groups.get(q.skill!) ?? [];
    group.push(q);
    groups.set(q.skill!, group);
  }
  const queues = [...groups.values()].map((group, index) =>
    shuffled(group, seed + index * 997),
  );
  const result: Question[] = [];
  for (const queue of shuffled(
    queues.filter((group) => group.some((q) => q.difficulty === 1)),
    seed,
  )) {
    const basic = queue.findIndex((q) => q.difficulty === 1);
    result.push(queue.splice(basic, 1)[0]);
  }
  const order = shuffled(queues, seed ^ 0x4bd16a53);
  while (order.some((group) => group.length)) {
    for (const queue of order) if (queue.length) result.push(queue.shift()!);
  }
  return result;
}
const orders = new Map<string, Question[]>();
export function trainerQuestion(
  topic: string,
  seed: number,
  cursor: number,
  version = TRAINER_BANK_VERSION,
): Question {
  if (version === 1) return questionV1(topic, seed, cursor);
  if (version === 2) return questionV2(topic, seed, cursor);
  const key = `${topic}:${seed}`;
  if (!orders.has(key)) {
    // Bound the cache: a user can explicitly start many sessions.
    if (orders.size >= 128) orders.delete(orders.keys().next().value!);
    orders.set(key, practiceOrder(topic, seed));
  }
  const order = orders.get(key)!,
    round = Math.floor(cursor / order.length);
  const q = order[((cursor % order.length) + round) % order.length];
  const options = shuffled(
    q.choices.map((text, id) => ({ text, id })),
    seed + cursor * 31,
  );
  return {
    ...q,
    choices: options.map((x) => x.text),
    correct: options.findIndex((x) => x.id === q.correct),
  };
}
