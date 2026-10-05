import { addRewards, parseRewards, RewardEvent, RewardLedger } from "./rewards";

export type Engagement = {
  version: 2;
  rewards: RewardLedger;
  timeZone: string;
  days: string[];
};
export function localDay(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function dayNumber(day: string) {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day))
    throw Error("Invalid streak day");
  const date = new Date(`${day}T00:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== day
  )
    throw Error("Invalid streak day");
  return date.getTime() / 86400000;
}
export function parseEngagement(
  raw: string | null,
  legacy: string | null,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): Engagement {
  if (raw === null)
    return { version: 2, rewards: parseRewards(legacy), timeZone, days: [] };
  const data = JSON.parse(raw);
  if (
    !data ||
    data.version !== 2 ||
    typeof data.timeZone !== "string" ||
    !Array.isArray(data.days) ||
    !data.rewards ||
    typeof data.rewards !== "object" ||
    Array.isArray(data.rewards)
  )
    throw Error("Invalid engagement");
  localDay(new Date(), data.timeZone);
  data.days.forEach((day: string) => dayNumber(day));
  return {
    version: 2,
    rewards: parseRewards(JSON.stringify(data.rewards)),
    timeZone: data.timeZone,
    days: [...new Set<string>(data.days)].sort(),
  };
}
export function streakSummary(data: Engagement, now = new Date()) {
  const today = localDay(now, data.timeZone);
  const days = data.days.filter((day) => day <= today).map(dayNumber);
  let run = 0,
    best = 0;
  days.forEach((day, index) => {
    run = index > 0 && day === days[index - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  const last = days.at(-1);
  return {
    current: last !== undefined && dayNumber(today) - last <= 1 ? run : 0,
    best,
    today: data.days.includes(today),
    day: today,
  };
}
export function recordEngagement(
  data: Engagement,
  events: RewardEvent[],
  qualify: boolean,
  now = new Date(),
) {
  const result = addRewards(data.rewards, events);
  const day = localDay(now, data.timeZone);
  const newDay = qualify && result.gained > 0 && !data.days.includes(day);
  return {
    data: {
      ...data,
      rewards: result.ledger,
      days: newDay ? [...data.days, day].sort() : data.days,
    },
    gained: result.gained,
    newDay,
  };
}
export const engagementStorageKey = (actorId: string) =>
  `espada.engagement.v2:${encodeURIComponent(actorId)}`;

export function streakDays(count: number) {
  const tens = count % 100;
  const unit = count % 10;
  return `${count} ${tens >= 11 && tens <= 14 ? "дней" : unit === 1 ? "день" : unit >= 2 && unit <= 4 ? "дня" : "дней"}`;
}
