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

/** Hand-placed, stable silhouettes. Coordinates are local to each class. */
const classShapes: Record<number, [number, number][]> = {
  5: [
    [0, 0.15],
    [0.18, 0.65],
    [0.38, 0.35],
    [0.6, 0.65],
    [0.8, 0.2],
    [1, 0.4],
  ],
  6: [
    [0, 0.5],
    [0.2, 0.18],
    [0.5, 0.08],
    [0.82, 0.28],
    [1, 0.7],
    [0.62, 0.88],
    [0.35, 0.58],
  ],
  7: [
    [0, 0.25],
    [0.12, 0.5],
    [0.22, 0.8],
    [0.35, 0.5],
    [0.45, 0.18],
    [0.57, 0.5],
    [0.7, 0.82],
    [0.8, 0.55],
    [0.9, 0.3],
    [1, 0.05],
  ],
  8: [
    [0, 0.85],
    [0.18, 0.58],
    [0.38, 0.36],
    [0.58, 0.13],
    [0.48, 0.48],
    [0.68, 0.62],
    [0.83, 0.78],
    [1, 0.88],
  ],
  9: [
    [0, 0.25],
    [0.2, 0.08],
    [0.42, 0.2],
    [0.58, 0.5],
    [0.45, 0.82],
    [0.72, 0.9],
    [0.85, 0.65],
    [1, 0.45],
  ],
  10: [
    [0, 0.8],
    [0.22, 0.82],
    [0.45, 0.8],
    [0.47, 0.48],
    [0.48, 0.15],
    [0.75, 0.15],
    [1, 0.18],
    [0.98, 0.5],
    [0.95, 0.84],
  ],
  11: [
    [0, 0.7],
    [0.18, 0.4],
    [0.36, 0.15],
    [0.58, 0.12],
    [0.8, 0.35],
    [1, 0.65],
    [0.58, 0.88],
  ],
};
export function classStarPosition(grade: number, index: number, count: number) {
  const points = classShapes[grade] ?? classShapes[5];
  const at = Math.max(
    0,
    Math.min(
      points.length - 1,
      (index * (points.length - 1)) / Math.max(1, count - 1),
    ),
  );
  const a = points[Math.floor(at)],
    b = points[Math.ceil(at)],
    t = at % 1;
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t };
}
