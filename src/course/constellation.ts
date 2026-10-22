/** Stable visual identities: progress and selection never change a star's appearance. */
export const constellations: Record<
  number,
  { name: string; subtitle: string; color: string }
> = {
  5: { name: "Орион", subtitle: "Первые большие открытия", color: "#BAC9FF" },
  6: { name: "Лира", subtitle: "Гармония чисел и пропорций", color: "#A5E7DC" },
  7: { name: "Кассиопея", subtitle: "Новый язык математики", color: "#D0B8FF" },
  8: {
    name: "Лебедь",
    subtitle: "От закономерностей к решениям",
    color: "#F0CFA8",
  },
  9: {
    name: "Андромеда",
    subtitle: "За пределами известного",
    color: "#B4D8FF",
  },
  10: { name: "Персей", subtitle: "Пространство новых идей", color: "#F0B8D5" },
  11: {
    name: "Пегас",
    subtitle: "Готовность к новым высотам",
    color: "#DAD7A6",
  },
};
export function starIdentity(id: string) {
  let seed = 2166136261;
  for (const char of id)
    seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  return {
    seed,
    hue: seed % 5,
    rays: 4 + (seed % 3) * 2,
    rotation: seed % 90,
    size: 0.85 + (seed % 35) / 100,
  };
}
export function starPosition(index: number, grade: number) {
  return {
    x: index * 190,
    y:
      152 +
      Math.sin(index * 1.72 + grade * 0.6) * 48 +
      Math.cos(index * 0.6) * 14,
  };
}
export function adjacentStar(index: number, direction: number, count: number) {
  return Math.max(0, Math.min(Math.max(0, count - 1), index + direction));
}
