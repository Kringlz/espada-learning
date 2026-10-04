export const rewardPoints = { video: 10, question: 20 } as const;
export type RewardKind = keyof typeof rewardPoints;
export type RewardEvent = { kind: RewardKind; id: string };
export type RewardLedger = Record<string, RewardKind>;
export const levels = [
  { name: "Новичок", points: 0, icon: "compass" },
  { name: "Исследователь", points: 100, icon: "map" },
  { name: "Знаток", points: 300, icon: "award" },
] as const;
export function rewardKey(event: RewardEvent) {
  return `${event.kind}:${event.id}`;
}
export function totalPoints(ledger: RewardLedger) {
  return Object.values(ledger).reduce(
    (sum, kind) => sum + rewardPoints[kind],
    0,
  );
}
export function levelFor(points: number) {
  return points >= 300 ? 2 : points >= 100 ? 1 : 0;
}
export function addRewards(ledger: RewardLedger, events: RewardEvent[]) {
  const next = { ...ledger };
  for (const event of events) {
    if (
      (event.kind !== "video" && event.kind !== "question") ||
      !event.id ||
      event.id.length > 500
    )
      continue;
    next[rewardKey(event)] = event.kind;
  }
  return { ledger: next, gained: totalPoints(next) - totalPoints(ledger) };
}
export function parseRewards(raw: string | null): RewardLedger {
  if (!raw) return {};
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid rewards");
  const ledger: RewardLedger = {};
  for (const [key, kind] of Object.entries(value)) {
    if (
      (kind === "video" || kind === "question") &&
      key.startsWith(`${kind}:`) &&
      key.length > kind.length + 1 &&
      key.length < 510
    )
      ledger[key] = kind;
  }
  return ledger;
}
export function rewardsStorageKey(actorId: string) {
  return `espada.rewards.v1:${encodeURIComponent(actorId)}`;
}

/** Count watched media time, not seeking, buffering, or an open player. */
export type WatchState = {
  position: number | null;
  clock: number | null;
  seconds: number;
  ranges: [number, number][];
};
export const emptyWatch = (): WatchState => ({
  position: null,
  clock: null,
  seconds: 0,
  ranges: [],
});
export function trackWatch(
  state: WatchState,
  position: number,
  duration: number,
  playing: boolean,
  now: number,
) {
  if (
    ![position, duration, now].every(Number.isFinite) ||
    position < 0 ||
    duration <= 0
  )
    return { state, completed: false };
  const elapsed = state.clock === null ? 0 : (now - state.clock) / 1000;
  const delta = state.position === null ? 0 : position - state.position;
  const watched =
    playing &&
    elapsed > 0 &&
    elapsed <= 6 &&
    delta > 0 &&
    delta <= elapsed * 2.5 + 0.5
      ? delta
      : 0;
  const ranges = watched
    ? [
        ...state.ranges,
        [Math.max(0, position - watched), Math.min(position, duration)] as [
          number,
          number,
        ],
      ].sort((a, b) => a[0] - b[0])
    : state.ranges;
  const merged: [number, number][] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1] + 0.05)
      last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }
  const next = {
    position,
    clock: now,
    seconds: merged.reduce((sum, [start, end]) => sum + end - start, 0),
    ranges: merged,
  };
  return { state: next, completed: next.seconds >= duration * 0.8 };
}
