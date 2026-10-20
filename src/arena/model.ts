export const arenaTopics = [
  {
    id: "arithmetic",
    title: "Устный счёт",
    subtitle: "Четыре действия · 5–6 класс",
    icon: "hash",
  },
  {
    id: "percent",
    title: "Проценты",
    subtitle: "Находим часть от целого · 5–7 класс",
    icon: "percent",
  },
  {
    id: "equations",
    title: "Уравнения",
    subtitle: "Найди неизвестное · 6–8 класс",
    icon: "x",
  },
] as const;
export type ArenaTopic = (typeof arenaTopics)[number]["id"];
export type ArenaQuestion = {
  prompt: string;
  choices: string[];
  answer?: number;
  explanation?: string;
};
export type Review = ArenaQuestion & { choice: number | null; points: number };
export type ArenaPlayer = { id: string; name: string; points: number };
export type Leader = ArenaPlayer & { rank: number; games: number };
export type Room = {
  id: string;
  code: string;
  classId: string;
  hostId: string;
  topic: ArenaTopic;
  phase: "lobby" | "countdown" | "question" | "reveal" | "finished" | "closed";
  serverNow: string;
  startsAt: string | null;
  round: number | null;
  deadline: string | null;
  nextAt: string | null;
  question: ArenaQuestion | null;
  players: ArenaPlayer[];
  myAnswer: {
    choice: number;
    correct: boolean | null;
    points: number | null;
  } | null;
  review: Review[] | null;
};
/** Deterministic daily practice is independent of ranked, server-authored matches. */
export function practiceQuestions(
  topic: ArenaTopic,
  seed: number,
  count = 10,
): ArenaQuestion[] {
  let state = seed >>> 0;
  const random = (max: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % max;
  };
  return Array.from({ length: count }, (_, i) => {
    let a = 2 + random(18),
      b = 2 + random(10),
      answer: number,
      prompt: string,
      explanation: string;
    if (topic === "percent") {
      a *= 20;
      b = (1 + random(9)) * 5;
      answer = (a * b) / 100;
      prompt = `${b}% от ${a}`;
      explanation = `${a} × ${b} ÷ 100 = ${answer}`;
    } else if (topic === "equations") {
      answer = b;
      prompt = `${a}x + ${i + 3} = ${a * b + i + 3}. Найди x`;
      explanation = `x = (${a * b + i + 3} − ${i + 3}) ÷ ${a} = ${answer}`;
    } else {
      const op = ["+", "×", "−", "÷"][i % 4];
      if (op === "÷") a *= b;
      answer =
        op === "+" ? a + b : op === "×" ? a * b : op === "−" ? a - b : a / b;
      prompt = `${a} ${op} ${b}`;
      explanation = `${prompt} = ${answer}`;
    }
    // Use high bits: low LCG bits cycle predictably when sampled in fixed strides.
    random(100);
    const correct = (state >>> 16) % 4;
    return {
      prompt,
      explanation,
      answer: correct,
      choices: Array.from({ length: 4 }, (_, j) =>
        String(answer + (j - correct) * (1 + (i % 3))),
      ),
    };
  });
}
export function practiceScore(correct: boolean, elapsedMs: number) {
  if (
    !correct ||
    !Number.isFinite(elapsedMs) ||
    elapsedMs < 0 ||
    elapsedMs >= 15000
  )
    return 0;
  return 100 + Math.floor(400 * (1 - elapsedMs / 15000));
}
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function remainingSeconds(deadline: number, now: number) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
