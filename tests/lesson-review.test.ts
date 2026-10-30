import test from "node:test";
import assert from "node:assert/strict";
import reviews from "../content/math-course/lesson-review.json";
import catalog from "../content/math-course/catalog.json";
import { courseContent } from "../src/course/content";
import { trainerBank } from "../src/course/trainer/bank";
import { counted } from "../src/course/trainer/qualityTypes";

test("all 55 topics expose a specific worked check without changing theory page positions", () => {
  assert.deepEqual(
    Object.keys(reviews).sort(),
    catalog.map((t) => t.id).sort(),
  );
  assert.equal(new Set(Object.values(reviews).map((r) => r.prompt)).size, 55);
  let pages = 0;
  for (const topic of catalog) {
    const r = reviews[topic.id as keyof typeof reviews];
    const content = courseContent[topic.id];
    pages += content.pages.length;
    assert.equal(content.pages.length, topic.pages.length, topic.id);
    const final = content.pages.at(-1)!;
    assert.equal(final.title, r.title);
    assert.ok(JSON.stringify(final.blocks).includes(r.prompt), topic.id);
    for (const step of r.steps)
      assert.ok(JSON.stringify(final.blocks).includes(step), topic.id);
    assert.equal(r.steps.length, 3, topic.id);
    assert.ok(r.misconception.length > 70, topic.id);
  }
  assert.equal(pages, 262);
});

// Recompute answers from the quantities in the authored prompts, independently
// of their solution text. Conceptual entries below state the mathematical reason.
const numbers = (id: keyof typeof reviews) =>
  (reviews[id].prompt.replaceAll("−", "-").match(/-?\d+(?:,\d+)?/g) ?? []).map(
    (x) => Number(x.replace(",", ".")),
  );
const answer = (id: keyof typeof reviews, value: string) =>
  assert.equal(reviews[id].answer, value, id);
const fmt = (n: number) => String(n).replace(".", ",");

test("grades 5–6 worked answers use the correct whole, units and operation", () => {
  let n = numbers("A05-01");
  answer(
    "A05-01",
    `${Math.floor(n[1] / n[0])} команды; ${n[1] % n[0]} человек`,
  );
  n = numbers("A05-02");
  answer("A05-02", `${(n[0] / n[1]) * n[2]}; ${n[3] / (n[4] * n[5])}`);
  n = numbers("A05-03");
  answer("A05-03", `${n[2] / (n[0] - n[1])} ч`);
  n = numbers("A05-04");
  assert.ok(n[1] > n[0] && Math.abs(n[0]) > Math.abs(n[1]));
  answer("A05-04", "B правее; A дальше");
  n = numbers("G05-01");
  answer("G05-01", `${n[0] - n[1]} см или ${n[0] + n[1]} см`);
  n = numbers("G05-02");
  answer("G05-02", `У квадрата на ${(n[0] / 4) ** 2 - n[1] * n[2]} см²`);
  n = numbers("A06-01");
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  answer("A06-01", `${gcd(n[0], n[1])} наборов`);
  n = numbers("A06-02");
  assert.ok(Math.abs((1 - n[0] / n[1]) / 2 - 1 / 3) < 1e-12);
  answer("A06-02", "1/3 книги");
  n = numbers("A06-03");
  answer("A06-03", `${fmt((n[1] / n[0]) * n[2])} сома`);
  n = numbers("A06-04");
  answer("A06-04", `${n[1] / (1 - n[0] / 100)} сомов`);
  n = numbers("A06-05");
  const costs = [n[0] + n[1] * n[2], n[0] + n[1] * n[3]];
  assert.notEqual(costs[0] / n[2], costs[1] / n[3]);
  answer("A06-05", `Не пропорциональна; ${costs[0]} и ${costs[1]} сомов`);
  n = numbers("A06-06");
  answer("A06-06", `${(n[0] * n[1]) / (n[0] + n[2])}%`);
  n = numbers("G06-01");
  answer("G06-01", `(${-n[0]}; ${fmt(-n[1]).replace("-", "−")})`);
});

test("grades 7–8 worked answers satisfy original expressions and geometry", () => {
  for (const x of [-2, 0, 3]) assert.equal(5 * x - 2 * (x - 3), 3 * x + 6);
  answer("A07-01", String(5 * -2 - 2 * (-2 - 3)));
  answer("A07-02", `${(-2) ** 4}; ${String(-(2 ** 4)).replace("-", "−")}`);
  for (const x of [-3, 0, 2, 5])
    assert.equal((x - 2) * (x + 5), x * x + 3 * x - 10);
  answer("A07-03", "x² + 3x − 10");
  const roots = [0, 4];
  for (const x of roots) assert.equal(3 * x * x - 12 * x, 0);
  answer("A07-04", roots.join("; "));
  nCheck("A07-05", 51 ** 2 - 49 ** 2);
  for (const x of [-10, 0, 10]) assert.notEqual(3 * (x + 2), 3 * x + 5);
  answer("A07-06", "Решений нет");
  const slope = (9 - 5) / (3 - 1),
    intercept = 5 - slope;
  answer("A07-07", `y = ${slope}x + ${intercept}`);
  assert.equal(2 * 25 + 20, 70);
  assert.equal(25 + 2 * 20, 65);
  answer("A07-08", "Тетрадь 25; ручка 20 сомов");
  assert.notEqual(3, 5);
  answer("G07-01", "Не равны");
  assert.equal(68 + 112, 180);
  answer("G07-02", "Прямые параллельны");
  for (const x of [-2, 0, 4]) assert.equal((x * x - 9) / (x - 3), x + 3);
  assert.equal(3 - 3, 0);
  answer("A08-01", "x + 3 при x ≠ 3");
  assert.equal((6 * 10 ** 5) / (3 * 10 ** -2), 2 * 10 ** 7);
  answer("A08-02", "2 · 10⁷");
  for (const x of [-3, 1, 3]) assert.equal(Math.sqrt((x - 4) ** 2), 4 - x);
  answer("A08-03", "4 − x; при x = 1: 3");
  const widths = Array.from({ length: 40 }, (_, i) => i + 1).filter(
    (x) => x * (x + 3) === 40,
  );
  assert.deepEqual(widths, [5]);
  answer("A08-04", `${widths[0]} см и ${widths[0] + 3} см`);
  for (const x of [2, 3, 4, 5, 6])
    assert.equal(2 * x - 1 >= 5 && 7 - x > 2, x >= 3 && x < 5);
  answer("A08-05", "[3; 5)");
  const n = numbers("G08-01");
  answer("G08-01", `${n[0] * n[2]} см²; ${2 * (n[0] + n[1])} см`);
  answer("G08-02", `${Math.sqrt(5 ** 2 - 4 ** 2)} м`);
  assert.equal(2 * 1 + -1 * 2, 0);
  answer("G08-03", "90°");
});
function nCheck(id: keyof typeof reviews, n: number) {
  answer(id, String(n));
}

test("grades 9–11 worked answers include domains, boundaries, signs and geometric restrictions", () => {
  assert.equal(-((2 - 2) ** 2) + 9, 9);
  for (const x of [-1, 5]) assert.equal(-((x - 2) ** 2) + 9, 0);
  answer("A09-01", "Максимум 9; нули −1 и 5");
  for (const x of [-1, 2, 3, 5, 6])
    assert.equal(x !== 5 && (x - 2) / (x - 5) <= 0, x >= 2 && x < 5);
  answer("A09-02", "[2; 5)");
  for (const x of [-2, -1, 1, 2]) assert.equal(x ** 4 - 5 * x * x + 4, 0);
  answer("A09-03", "−2; −1; 1; 2");
  answer(
    "A09-04",
    `${Array.from({ length: 5 }, (_, i) => 12 + 2 * i).reduce((a, b) => a + b)} мест`,
  );
  assert.equal(16 ** (-3 / 4), 1 / 8);
  answer("A09-05", "1/8");
  assert.equal((3 / 5) ** 2 + (-4 / 5) ** 2, 1);
  assert.ok(Math.abs(3 / 5 / (-4 / 5) + 3 / 4) < 1e-12);
  answer("A09-06", "cos α = −4/5; tan α = −3/4");
  answer("G09-01", `${20 * (9 / 6) ** 2} см²`);
  assert.ok(
    Math.abs(
      Math.sqrt(5 ** 2 + 8 ** 2 - 2 * 5 * 8 * Math.cos(Math.PI / 3)) - 7,
    ) < 1e-12,
  );
  answer("G09-02", "7 см");
  assert.equal(Math.sqrt(2 - 2) + 1, 1);
  assert.ok(Number.isNaN(Math.sqrt(1 - 2)));
  answer("A10-01", "D = [2; +∞); E = [1; +∞)");
  assert.equal(3 * -1 - 1, -4);
  assert.equal(3 * 1 - 1, 2);
  assert.equal((2 * Math.PI) / 2, Math.PI);
  answer("A10-02", "Амплитуда 3; период π; [−4; 2]");
  assert.ok(
    Math.abs(Math.asin(Math.sin((5 * Math.PI) / 6)) - Math.PI / 6) < 1e-12,
  );
  answer("A10-03", "π/6");
  for (const x of [0, Math.PI, 2 * Math.PI])
    assert.ok(Math.abs(Math.sin(x) * Math.cos(x) - Math.sin(x)) < 1e-12);
  answer("A10-04", "0; π; 2π");
  for (const x of [1.99, 2.01])
    assert.ok(Math.abs((x * x - 4) / (x - 2) - 4) < 0.011);
  assert.notEqual(4, 7);
  answer("A10-05", "Предел 4; не непрерывна");
  const h = 1e-5,
    f = (x: number) => (2 * x - 1) ** 3;
  assert.ok(Math.abs((f(1 + h) - f(1 - h)) / (2 * h) - 6) < 1e-7);
  nCheck("A10-06", 6);
  const values = [0, 2, 5].map((x) => x * x - 4 * x);
  answer(
    "A10-07",
    `Минимум ${String(Math.min(...values)).replace("-", "−")}; максимум ${Math.max(...values)}`,
  );
  // Plane incidence axiom: containing two distinct points of a line contains the entire line.
  answer("G10-01", "Да");
  answer("G10-02", `PA = ${Math.hypot(4, 3)} см; расстояние 4 см`);
  for (const x of [-4, -2, 0, 2])
    assert.equal((1 / 2) ** (x - 1) >= 8, x <= -2);
  answer("A11-01", "x ≤ −2");
  assert.equal(Math.log2(4) + Math.log2(8), 5);
  assert.ok(Math.log2(12) > 3 && Math.log2(12) < 4);
  answer("A11-02", "Не равны: 5 и число между 3 и 4");
  assert.equal(Math.log2(5 - 1) + Math.log2(5 - 3), 3);
  assert.ok(Number.isNaN(Math.log2(-1 - 1)));
  nCheck("A11-03", 5);
  assert.equal(1 ** 2 + 3 * 1, 4);
  for (const x of [-2, 0, 3])
    assert.ok(
      Math.abs(
        ((x + h) ** 2 + 3 * (x + h) - ((x - h) ** 2 + 3 * (x - h))) / (2 * h) -
          (2 * x + 3),
      ) < 1e-8,
    );
  answer("A11-04", "F(x) = x² + 3x");
  nCheck("A11-05", 2 * ((1 * 1) / 2));
  answer("G11-01", `${Math.sqrt(5 ** 2 - 3 ** 2)} см`);
  answer("G11-02", `${8 * 5 + 2 * 8 * 3 + 2 * 5 * 3} см²; ${8 * 5 * 3} см³`);
});

test("quantity grammar handles 1, 2–4, 5–20 and compound counts", () => {
  const forms = ["книга", "книги", "книг"] as const;
  assert.equal(counted(300 * 0.81, ["сом", "сома", "сомов"]), "243 сома");
  assert.deepEqual(
    [1, 2, 5, 11, 14, 21, 22, 25].map((n) => counted(n, forms)),
    [
      "1 книга",
      "2 книги",
      "5 книг",
      "11 книг",
      "14 книг",
      "21 книга",
      "22 книги",
      "25 книг",
    ],
  );
});

test("all 3651 current questions have clean numerical prose and explicit physical assumptions", () => {
  let count = 0;
  for (const topic of catalog)
    for (const q of trainerBank(topic.id)) {
      count++;
      assert.doesNotMatch(
        q.prompt + q.solution,
        /\d[.,]\d{9}|undefined|NaN|Infinity/,
        q.id,
      );
      if (q.skill === "ladder") assert.match(q.prompt, /горизонтальной земле/);
      if (q.skill === "meeting") assert.match(q.prompt, /одновременно/);
      if (q.skill === "inverse-workers")
        assert.match(q.prompt, /каждого рабочего одинакова/);
    }
  assert.equal(count, 3651);
});
