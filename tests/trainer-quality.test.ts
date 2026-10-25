import test from "node:test";
import assert from "node:assert/strict";
import catalog from "../content/math-course/catalog.json";
import {
  trainerBank,
  trainerQuestion,
  questionById,
} from "../src/course/trainer/bank";
import { trainerQuestion as oldQuestion } from "../src/course/trainer/legacyBankV2";

const value = (text: string) =>
  Number(text.replace("−", "-").replace(",", "."));
const numbers = (prompt: string) =>
  (prompt.match(/\d+(?:,\d+)?/g) ?? []).map(value);
function numericChoice(text: string): string {
  // Equivalent simple fractions must not become two selectable "correct" answers.
  const m = text
    .replace(/−/g, "-")
    .replace(/,/g, ".")
    .match(
      /^(-?\d+(?:\.\d+)?)(?:\/(\d+))?\s*(π)?\s*(см(?:²|³)?|м(?:²|³)?|°)?$/,
    );
  return m
    ? `${Number(m[1]) / (m[2] ? Number(m[2]) : 1)}:${m[3] ?? ""}:${m[4] ?? ""}`
    : text;
}

test("all current tasks have exactly four mathematically distinct options and reviewed skill metadata", () => {
  for (const topic of catalog) {
    const bank = trainerBank(topic.id);
    assert.ok(new Set(bank.map((q) => q.skill)).size >= 4, topic.id);
    for (const q of bank) {
      assert.equal(q.choices.length, 4, q.id);
      assert.equal(
        new Set(q.choices.map(numericChoice)).size,
        4,
        `${q.id}: ${q.choices.join(" | ")}`,
      );
      assert.ok(q.difficulty === 1 || q.difficulty === 2, q.id);
      assert.ok(q.skill && q.hints.length && q.solution.length > 20, q.id);
      assert.doesNotMatch(
        q.prompt + q.choices.join(" "),
        /undefined|NaN|Infinity/,
        q.id,
      );
    }
  }
});

test("grade-five rectangle and cube tasks never require root extraction or large arithmetic", () => {
  for (const q of trainerBank("G05-02")) {
    assert.doesNotMatch(q.prompt, /√|корень|корня|корни|\^\(1\//i, q.id);
    assert.ok(
      numbers(q.prompt).every((n) => n <= 150),
      q.id,
    );
    assert.ok(
      q.choices.every((c) => Number.isInteger(value(c)) && value(c) > 0),
      q.id,
    );
    const ns = numbers(q.prompt),
      answer = value(q.choices[q.correct]);
    switch (q.skill) {
      case "rectangle-perimeter":
        assert.equal(answer, 2 * (ns[0] + ns[1]));
        break;
      case "rectangle-area":
        assert.equal(answer, ns[0] * ns[1]);
        break;
      case "cube-volume":
        assert.equal(answer, ns[0] ** 3);
        assert.ok(ns[0] <= 5);
        break;
      case "rectangle-side":
        assert.equal(2 * (answer + ns[1]), ns[0]);
        break;
      case "area-to-side":
        assert.equal(answer * ns[1], ns[0]);
        break;
      case "cube-layers":
        assert.equal(answer, ns[0] * ns[1] * (ns[0] - 1));
        break;
      default:
        assert.fail(`Unaudited geometry family: ${q.skill}`);
    }
  }
});

test("early practice covers all rectangle/cube subskills instead of sampling only cubes", () => {
  const expected = new Set(trainerBank("G05-02").map((q) => q.skill));
  for (let seed = 0; seed < 100; seed++) {
    const first = Array.from({ length: 15 }, (_, i) =>
      trainerQuestion("G05-02", seed, i),
    );
    assert.equal(first[0].difficulty, 1);
    assert.deepEqual(new Set(first.map((q) => q.skill)), expected);
    assert.ok(first.filter((q) => q.skill === "cube-volume").length <= 3);
    for (let i = 1; i < first.length; i++)
      assert.notEqual(first[i].id, first[i - 1].id);
  }
});

test("all topics introduce a basic task and include every skill within the first fifteen", () => {
  for (const topic of catalog)
    for (const seed of [0, 23, 456, 0xffffffff]) {
      assert.equal(trainerQuestion(topic.id, seed, 0).difficulty, 1, topic.id);
      const seen = new Set(
        Array.from(
          { length: 15 },
          (_, i) => trainerQuestion(topic.id, seed, i).skill,
        ),
      );
      assert.deepEqual(
        seen,
        new Set(trainerBank(topic.id).map((q) => q.skill)),
        topic.id,
      );
    }
});

test("remainder families distinguish left-over items, whole groups and additional containers", () => {
  for (const q of trainerBank("A05-01")) {
    const ns = numbers(q.prompt),
      answer = value(q.choices[q.correct]);
    switch (q.skill) {
      case "division-remainder":
        assert.equal(answer, ns[0] % ns[1]);
        assert.ok(answer < ns[1]);
        break;
      case "recover-dividend":
        assert.equal(answer, ns[0] * ns[1] + ns[2]);
        break;
      case "round-up-groups":
        assert.equal(answer, Math.ceil(ns[1] / ns[0]));
        break;
      case "whole-groups":
        assert.equal(answer, Math.floor(ns[0] / ns[1]));
        break;
      case "inverse-operation":
        assert.equal(answer, ns[0] + ns[1]);
        break;
      default:
        assert.fail(q.skill);
    }
  }
});

test("Pythagoras tasks use modest valid triangles and correct inverse operations", () => {
  for (const q of trainerBank("G08-02")) {
    const ns = numbers(q.prompt),
      answer = value(q.choices[q.correct]);
    switch (q.skill) {
      case "pythagoras-hypotenuse":
        assert.equal(answer ** 2, ns[0] ** 2 + ns[1] ** 2);
        break;
      case "pythagoras-leg":
      case "ladder":
        assert.equal(answer ** 2 + ns[1] ** 2, ns[0] ** 2);
        break;
      case "diagonal-area":
        assert.equal((answer / ns[1]) ** 2 + ns[1] ** 2, ns[0] ** 2);
        break;
      case "right-triangle-check": {
        const triples = q.choices.map((c) => c.split(", ").map(Number));
        assert.equal(
          triples.filter(([a, b, c]) => a * a + b * b === c * c).length,
          1,
        );
        assert.ok(triples[0][2] <= 30);
        break;
      }
      default:
        assert.fail(q.skill);
    }
  }
});

test("old task identities and option order remain available for saved V2 reviews", () => {
  for (const id of ["G05-02", "A05-01", "A09-05"])
    for (const cursor of [0, 15, 80]) {
      const old = oldQuestion(id, 123, cursor);
      assert.deepEqual(trainerQuestion(id, 123, cursor, 2), old);
      const original = questionById(id, old.id)!;
      assert.equal(original.prompt, old.prompt);
      assert.equal(
        original.choices[original.correct],
        old.choices[old.correct],
      );
      assert.ok(trainerBank(id).every((q) => q.id.includes("-generated-v3-")));
    }
});

// Independent numeric evaluation of answer sets, including boundary points.
function scalar(text: string): number {
  let s = text.trim().replace(/−/g, "-").replace("°", "").replace(",", ".");
  if (s === "+∞" || s === "∞") return Infinity;
  if (s === "-∞") return -Infinity;
  const parts = s.split("/");
  const atom = (p: string): number => {
    const root = p.match(/^(-?)√(\d+)$/);
    if (root) return (root[1] ? -1 : 1) * Math.sqrt(Number(root[2]));
    const pi = p.match(/^(-?)(\d*)π$/);
    if (pi) return (pi[1] ? -1 : 1) * (pi[2] ? Number(pi[2]) : 1) * Math.PI;
    return Number(p);
  };
  return atom(parts[0]) / (parts[1] ? atom(parts[1]) : 1);
}
function inIntervals(answer: string, x: number): boolean {
  const intervals = [...answer.matchAll(/([[(])([^;]+);\s*([^\])]+)([\])])/g)];
  assert.ok(intervals.length, `Unparsed interval: ${answer}`);
  const eps = 1e-9;
  return intervals.some(([, left, l, r, right]) => {
    const lo = scalar(l),
      hi = scalar(r);
    return (
      (left === "[" ? x >= lo - eps : x > lo + eps) &&
      (right === "]" ? x <= hi + eps : x < hi - eps)
    );
  });
}

test("quadratic and rational inequality choices describe exactly the correct sets, including boundaries", () => {
  for (const q of trainerBank("A09-02")) {
    if (
      !["between-roots", "outside-roots", "fraction-boundary"].includes(
        q.skill!,
      )
    )
      continue;
    const [a, b] = numbers(q.prompt);
    const left = q.skill === "outside-roots" ? -a : a,
      right = b;
    const sample = Array.from(
      { length: 2 * (right - left + 4) + 1 },
      (_, i) => left - 2 + i / 2,
    );
    const satisfies = (x: number) =>
      q.skill === "fraction-boundary"
        ? Math.abs(x - right) > 1e-9 && (x - left) / (x - right) <= 0
        : q.skill === "between-roots"
          ? (x - left) * (x - right) < 0
          : (x - left) * (x - right) >= 0;
    const valid = q.choices.map((c) =>
      sample.every((x) => inIntervals(c, x) === satisfies(x)),
    );
    assert.deepEqual(valid, [true, false, false, false], q.id);
  }
});

test("inverse trigonometry uses principal values, and trigonometric inequality endpoints are correct", () => {
  for (const q of trainerBank("A10-03")) {
    const answer = scalar(q.choices[q.correct]);
    let expected: number;
    if (q.skill === "inverse-domain") {
      assert.equal(q.choices.filter((c) => Math.abs(scalar(c)) <= 1).length, 1);
      continue;
    }
    if (q.skill === "inverse-sine-value") {
      expected = Math.asin(scalar(q.prompt.match(/arcsin\(([^)]+)\)/)![1]));
    } else {
      const angle = (numbers(q.prompt)[0] * Math.PI) / 180;
      expected =
        ((q.skill === "inverse-cosine-range"
          ? Math.acos(Math.cos(angle))
          : q.skill === "inverse-tangent-range"
            ? Math.atan(Math.tan(angle))
            : Math.asin(Math.sin(angle))) *
          180) /
        Math.PI;
    }
    assert.ok(Math.abs(answer - expected) < 1e-8, q.id);
    assert.equal(
      q.choices.filter((c) => Math.abs(scalar(c) - expected) < 1e-8).length,
      1,
      q.id,
    );
  }
  for (const q of trainerBank("A10-04")) {
    if (!["sine-inequality", "cosine-inequality"].includes(q.skill!)) continue;
    const bounds = q.prompt.match(/\[([^;]+);\s*([^\]]+)\]/)!;
    const lo = scalar(bounds[1]),
      hi = scalar(bounds[2]);
    const samples = Array.from(
      { length: 17 },
      (_, i) => lo + ((hi - lo) * i) / 16,
    );
    const valid = q.choices.map((c) =>
      samples.every(
        (x) =>
          inIntervals(c, x) ===
          (q.skill === "sine-inequality"
            ? Math.sin(x) > 1e-9
            : Math.cos(x) <= 1e-9),
      ),
    );
    assert.deepEqual(valid, [true, false, false, false], q.id);
  }
});

test("higher-degree roots and powers satisfy the original equations with small exact parameters", () => {
  for (const q of trainerBank("A09-03"))
    if (q.skill === "biquadratic") {
      const [coefficient, constant] = numbers(q.prompt);
      const roots = q.choices[q.correct].split(";").map(value);
      assert.equal(new Set(roots).size, 4, q.id);
      for (const x of roots)
        assert.equal(x ** 4 - coefficient * x * x + constant, 0, q.id);
    }
  for (const q of trainerBank("A09-05")) {
    const ns = numbers(q.prompt),
      answer = scalar(q.choices[q.correct]);
    if (q.skill === "rational-power") {
      assert.equal(answer ** 3, ns[0] ** 2);
      assert.ok(ns[0] <= 125);
    }
    if (q.skill === "odd-root") assert.equal(answer ** 3, -ns[0]);
    if (q.skill === "negative-rational-power")
      assert.ok(Math.abs(answer ** 2 * ns[0] - 1) < 1e-9);
    if (q.skill === "root-of-even-power") {
      assert.ok(answer >= 0);
      assert.equal(answer ** 4, ns[0] ** 4);
    }
    if (q.skill === "even-root-domain")
      assert.equal(q.choices[q.correct], `x ≥ ${ns[0]}`);
  }
});

test("advanced geometry respects triangle relations, projections, area and volume dimensions", () => {
  for (const q of trainerBank("G09-02")) {
    const ns = numbers(q.prompt),
      answer = parseFloat(q.choices[q.correct]);
    if (q.skill === "cosine-theorem") {
      const c = Math.sqrt(answer);
      assert.ok(ns[0] + ns[1] > c && ns[0] + c > ns[1] && ns[1] + c > ns[0]);
      assert.ok(
        Math.abs(
          answer -
            (ns[0] ** 2 +
              ns[1] ** 2 -
              2 * ns[0] * ns[1] * Math.cos((ns[2] * Math.PI) / 180)),
        ) < 1e-9,
      );
    }
    if (q.skill === "sine-theorem")
      assert.ok(
        Math.abs(
          answer / ns[0] -
            Math.sin((ns[2] * Math.PI) / 180) /
              Math.sin((ns[1] * Math.PI) / 180),
        ) < 1e-9,
      );
    if (q.skill === "circumradius")
      assert.ok(
        Math.abs(2 * answer * Math.sin((ns[1] * Math.PI) / 180) - ns[0]) < 1e-9,
      );
  }
  for (const q of trainerBank("G10-02")) {
    const ns = numbers(q.prompt),
      answer = parseFloat(q.choices[q.correct]);
    if (q.skill === "inclined-projection") {
      assert.ok(ns[1] > ns[0]);
      assert.equal(answer ** 2 + ns[0] ** 2, ns[1] ** 2);
    }
    if (q.skill === "line-plane-angle")
      assert.ok(
        Math.abs(answer - ns[0] * Math.sin((ns[1] * Math.PI) / 180)) < 1e-9,
      );
  }
  for (const q of trainerBank("G11-02")) {
    const ns = numbers(q.prompt),
      answer = parseFloat(q.choices[q.correct]);
    if (q.skill === "prism-volume") assert.equal(answer, ns[0] * ns[1]);
    if (q.skill === "pyramid-volume") assert.equal(answer * 3, ns[0] * ns[1]);
    if (q.skill === "cylinder-volume") assert.equal(answer, ns[0] ** 2 * ns[1]);
    if (q.skill === "cube-surface") assert.equal(answer, 6 * ns[0] ** 2);
    if (q.skill === "cone-comparison") assert.equal(answer * 3, ns[0]);
    if (q.skill === "sphere-surface-scaling") assert.equal(answer, ns[0] ** 2);
  }
});

function inequalityChoice(answer: string, x: number): boolean {
  const pieces = answer.trim().split(/\s*(≤|≥|<|>)\s*/);
  const term = (s: string) => (s === "x" ? x : scalar(s));
  assert.ok(pieces.length >= 3, answer);
  for (let i = 1; i < pieces.length; i += 2) {
    const l = term(pieces[i - 1]),
      r = term(pieces[i + 1]);
    const satisfied =
      pieces[i] === "<"
        ? l < r
        : pieces[i] === ">"
          ? l > r
          : pieces[i] === "≤"
            ? l <= r
            : l >= r;
    if (!satisfied) return false;
  }
  return true;
}

test("logarithm and exponential solutions satisfy their original domains and inequality signs", () => {
  for (const q of trainerBank("A11-01")) {
    const ns = numbers(q.prompt),
      answer = value(q.choices[q.correct]);
    if (q.skill === "common-base")
      assert.equal(ns[0] ** answer, ns[1] ** ns[2]);
    if (q.skill === "shifted-exponent")
      assert.equal(2 ** (answer - ns[1]), ns[2]);
    if (q.skill === "decreasing-exponential") {
      const bound = ns.at(-1)!;
      const points = Array.from({ length: 61 }, (_, i) => -10 + i / 2);
      assert.deepEqual(
        q.choices.map((c) =>
          points.every(
            (x) => inequalityChoice(c, x) === 0.5 ** x < 0.5 ** bound,
          ),
        ),
        [true, false, false, false],
        q.id,
      );
    }
  }
  for (const q of trainerBank("A11-03")) {
    const ns = numbers(q.prompt),
      answer = value(q.choices[q.correct]);
    if (q.skill === "log-equation") {
      assert.ok(answer > ns[0]);
      assert.equal(Math.log2(answer - ns[0]), ns[1]);
    }
    if (q.skill === "two-logarithms") {
      assert.ok(answer > ns[0]);
      assert.equal(2 * Math.log2(answer - ns[0]), ns[2]);
    }
    if (
      q.skill === "increasing-log-inequality" ||
      q.skill === "decreasing-log-inequality"
    ) {
      const points = Array.from({ length: 81 }, (_, i) => -10 + i / 2);
      const valid = q.choices.map((c) =>
        points.every((x) => {
          const expected =
            q.skill === "increasing-log-inequality"
              ? x > ns[0] && Math.log2(x - ns[0]) > 1
              : x > 0 && -Math.log2(x) >= -1;
          return inequalityChoice(c, x) === expected;
        }),
      );
      assert.deepEqual(valid, [true, false, false, false], q.id);
    }
    if (q.skill === "extraneous-log-root") {
      const correct = Number(q.choices[q.correct].match(/x = (\d+)/)![1]);
      assert.ok(correct > 1);
      assert.equal(Math.log2(correct - 1) + Math.log2(correct + 1), 3);
      assert.ok(
        !(-correct > 1),
        "The negative algebraic root violates the original logarithm domain",
      );
    }
  }
});

test("derivatives and integral answers match independent numerical differentiation and quadrature", () => {
  for (const q of trainerBank("A10-06")) {
    const ns = numbers(q.prompt),
      answer = value(q.choices[q.correct]);
    let fn: ((x: number) => number) | undefined,
      at = 0;
    if (q.skill === "chain-rule") {
      fn = (x) => (ns[0] * x + ns[1]) ** 2;
      at = ns[2];
    }
    if (q.skill === "product-rule") {
      fn = (x) => x * x * (x + ns[0]);
      at = ns[1];
    }
    if (q.skill === "reciprocal-derivative") {
      fn = (x) => ns[0] / x;
      at = ns[1];
    }
    if (fn) {
      const h = 1e-5;
      assert.ok(
        Math.abs((fn(at + h) - fn(at - h)) / (2 * h) - answer) < 1e-5,
        q.id,
      );
    }
  }
  for (const q of trainerBank("A11-05")) {
    const ns = numbers(q.prompt),
      answer = value(q.choices[q.correct]);
    let lo: number, hi: number, fn: (x: number) => number;
    switch (q.skill) {
      case "newton-leibniz":
        lo = ns[1];
        hi = ns[2];
        fn = (x) => 2 * x;
        break;
      case "integral-constant":
        lo = ns[1];
        hi = ns[2];
        fn = () => ns[0];
        break;
      case "negative-area":
        lo = ns[1];
        hi = ns[2];
        fn = () => ns[0];
        break;
      case "crossing-axis-area":
        lo = -ns[0];
        hi = ns[1];
        fn = (x) => Math.abs(x);
        break;
      case "area-between-graphs":
        lo = ns[0];
        hi = ns[1];
        fn = (x) => x + ns[2] - x;
        break;
      default:
        assert.fail(q.skill);
    }
    const steps = 100,
      h = (hi - lo) / steps;
    let area = 0;
    for (let i = 0; i < steps; i++)
      area += ((fn(lo + i * h) + fn(lo + (i + 1) * h)) * h) / 2;
    assert.ok(Math.abs(area - answer) < 1e-8, q.id);
  }
});
