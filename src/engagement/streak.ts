/** Calendar dates use the learner's device timezone, not UTC day boundaries. */
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && dayKey(date) === value;
}
export function shiftDay(day: string, offset: number) {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return dayKey(date);
}
export function parseStreak(raw: string | null): string[] {
  if (!raw) return [];
  const days: unknown = JSON.parse(raw);
  if (!Array.isArray(days)) throw Error("Invalid streak dates");
  return [
    ...new Set(
      days.filter((d): d is string => typeof d === "string" && validDay(d)),
    ),
  ].sort();
}
export function streakStats(days: string[], today: string) {
  const ordered = [
    ...new Set(days.filter((d) => validDay(d) && d <= today)),
  ].sort();
  const set = new Set(ordered);
  let cursor = set.has(today) ? today : shiftDay(today, -1);
  let current = 0,
    best = 0,
    run = 0,
    previous = "";
  while (set.has(cursor)) {
    current++;
    cursor = shiftDay(cursor, -1);
  }
  for (const day of ordered) {
    run = previous && shiftDay(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return { current, best, todayDone: set.has(today) };
}
export function monthCells(month: string): (string | null)[] {
  const first = new Date(`${month}-01T12:00:00`);
  const start = (first.getDay() + 6) % 7;
  const count = new Date(
    first.getFullYear(),
    first.getMonth() + 1,
    0,
  ).getDate();
  const cells: (string | null)[] = Array(start).fill(null);
  for (let d = 1; d <= count; d++)
    cells.push(`${month}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}
export function dayWord(n: number) {
  return n % 10 === 1 && n % 100 !== 11
    ? "день"
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
      ? "дня"
      : "дней";
}
export const streakKey = (id: string) =>
  `espada.streak.v1:${encodeURIComponent(id)}`;

export function didStudy(
  before: { readPages: number[]; quiz: Record<string, { submitted: boolean }> },
  after: { readPages: number[]; quiz: Record<string, { submitted: boolean }> },
) {
  return (
    after.readPages.some((page) => !before.readPages.includes(page)) ||
    Object.entries(after.quiz).some(
      ([id, attempt]) => attempt.submitted && !before.quiz[id]?.submitted,
    )
  );
}
