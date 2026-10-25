/** Every family targets a named skill. Difficulty describes reasoning, not large numbers. */
export type FamilyDraft = {
  skill: string;
  difficulty: 1 | 2;
  prompt: string;
  choices: [string, string, string, string];
  solution: string;
  hint: string;
};
export const numberText = (n: number) =>
  String(Number(n.toFixed(8))).replace(".", ",");
/** Distractors are supplied by the author from likely mistakes; never invented by the sampler. */
export function numericFamily(
  skill: string,
  difficulty: 1 | 2,
  prompt: string,
  answer: number,
  errors: number[],
  solution: string,
  hint: string,
): FamilyDraft {
  const choices = [...new Set([answer, ...errors].map(numberText))];
  if (choices.length < 4 || choices.some((c) => /NaN|Infinity/.test(c)))
    throw Error(`Invalid authored choices: ${skill}: ${prompt}`);
  return {
    skill,
    difficulty,
    prompt,
    choices: choices.slice(0, 4) as FamilyDraft["choices"],
    solution,
    hint,
  };
}
