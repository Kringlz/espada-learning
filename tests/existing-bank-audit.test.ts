import test from "node:test";
import assert from "node:assert/strict";
import { counted } from "../src/course/trainer/qualityTypes";
import catalog from "../content/math-course/catalog.json";
import { trainerBank } from "../src/course/trainer/bank";

const ns = (s: string) =>
  (s.replaceAll("−", "-").match(/-?\d+(?:,\d+)?/g) ?? []).map((x) =>
    Number(x.replace(",", ".")),
  );
const scalar = (s: string): number => {
  s = s
    .replaceAll("−", "-")
    .replaceAll(",", ".")
    .replace(/ (?:см|м)(?:²|³)?$|°$/g, "");
  if (s.includes("/")) {
    const [a, b] = s.split("/");
    return scalar(a) / scalar(b);
  }
  if (s.includes("π"))
    return (
      Number(s.replace("π", "") === "-" ? -1 : s.replace("π", "") || 1) *
      Math.PI
    );
  if (s.startsWith("-√")) return -Math.sqrt(Number(s.slice(2)));
  if (s.startsWith("√")) return Math.sqrt(Number(s.slice(1)));
  return Number(s);
};
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const prime = (x: number) =>
  x > 1 &&
  Array.from(
    { length: Math.max(0, Math.floor(Math.sqrt(x)) - 1) },
    (_, i) => i + 2,
  ).every((d) => x % d !== 0);

// Each calculation below is based on displayed quantities, not on the family's
// generator parameters or stored solution. Check all four options for uniqueness.
test("existing numeric questions across all grades have independently recomputed, unique answers", () => {
  const failures: string[] = [];
  let checked = 0;
  const topics = new Set<string>();
  const skills = new Set<string>();
  for (const t of catalog)
    for (const q of trainerBank(t.id)) {
      const n = ns(q.prompt),
        [a, b, c, d] = n;
      let expected: number | undefined;
      switch (q.skill) {
        case "division-remainder":
          expected = a % b;
          break;
        case "recover-dividend":
          expected = a * b + c;
          break;
        case "round-up-groups":
          expected = Math.ceil(b / a);
          break;
        case "whole-groups":
          expected = Math.floor(a / b);
          break;
        case "inverse-operation":
          expected = a + b;
          break;
        case "order":
          expected = a + b * c;
          break;
        case "brackets":
          expected = (a + b) * c;
          break;
        case "distribute":
          expected = t.id === "A05-02" ? a * b - c * d : a * b;
          break;
        case "reverse-order":
          expected = c / b - a;
          break;
        case "distance":
          expected = a * b;
          break;
        case "time":
          expected = b / a;
          break;
        case "speed":
          expected = b / a;
          break;
        case "productivity":
          expected = (a + b) * c;
          break;
        case "meeting":
          expected = c / (a + b);
          break;
        case "absolute-value":
          expected = Math.abs(a);
          break;
        case "number-line":
        case "signed-sum":
          expected = a + b;
          break;
        case "distance-across-zero":
          expected = Math.abs(b - a);
          break;
        case "segment-parts":
          expected = a + b;
          break;
        case "segment-missing":
          expected = a - b;
          break;
        case "right-angle":
          expected = 90 - a;
          break;
        case "straight-angle":
          expected = 180 - a;
          break;
        case "rectangle-perimeter":
          expected = 2 * (a + b);
          break;
        case "rectangle-area":
          expected = a * b;
          break;
        case "cube-volume":
          expected = a ** 3;
          break;
        case "rectangle-side":
          expected = a / 2 - b;
          break;
        case "area-to-side":
          expected = a / b;
          break;
        case "cube-layers":
          expected = a * b * (a - 1);
          break;
        case "gcd":
        case "equal-sets":
          expected = gcd(a, b);
          break;
        case "lcm":
          expected = (a * b) / gcd(a, b);
          break;
        case "divisibility":
          expected = Array.from({ length: 10 }, (_, i) => i).find(
            (x) => (a + x + b) % 3 === 0,
          );
          break;
        case "prime-composite":
          expected = q.choices.map(scalar).find(prime);
          assert.equal(q.choices.map(scalar).filter(prime).length, 1, q.id);
          break;
        case "reduce-fraction":
          expected = a / b;
          break;
        case "fraction-add":
          expected = a / b + c / d;
          break;
        case "fraction-of-number":
          expected = (a / b) * c;
          break;
        case "whole-from-part":
          expected = c / (a / b);
          break;
        case "fraction-divide":
          expected = a / b / (c / d);
          break;
        case "fraction-compare":
          expected = Math.max(...q.choices.map(scalar));
          break;
        case "decimal-add":
          expected = a + b;
          break;
        case "decimal-multiply":
          expected = a * b;
          break;
        case "decimal-divide":
          expected = a / b;
          break;
        case "round-tenths":
          expected = Math.round(a * 10) / 10;
          break;
        case "fraction-to-decimal":
          expected = a / b;
          break;
        case "percent-part":
          expected = (a / 100) * b;
          break;
        case "percent-whole":
          expected = a / (b / 100);
          break;
        case "ratio-parts":
          expected = (a * 2) / 3;
          break;
        case "proportion":
          expected = (a * b) / c;
          break;
        case "direct-table":
          expected = (b / a) * c;
          break;
        case "inverse-workers":
          expected = (a * b) / c;
          break;
        case "direct-coefficient":
          expected = (b / a) * c;
          break;
        case "inverse-table":
          expected = (a * b) / c;
          break;
        case "discount":
          expected = a * (1 - b / 100);
          break;
        case "increase":
          expected = a * 1.1;
          break;
        case "mixture-salt":
          expected = (a * b) / 100;
          break;
        case "dilution":
          expected = (a * b) / (a + c);
          break;
        case "successive-discounts":
          expected = a * (1 - b / 100) * (1 - c / 100);
          break;
        case "read-coordinate":
          expected = a;
          break;
        case "horizontal-move":
          expected = a + c;
          break;
        case "reflect-axis":
          expected = -b;
          break;
        case "vertical-distance":
          expected = Math.abs(d - b);
          break;
        case "like-terms":
          expected = a + b;
          break;
        case "minus-brackets":
          expected = a - b + c;
          break;
        case "negative-substitution":
          expected = a * c + b;
          break;
        case "power-product":
          expected = a + b;
          break;
        case "power-quotient":
          expected = b - c;
          break; // n[0] is the domain exclusion x != 0
        case "power-of-power":
          expected = a * b;
          break;
        case "power-sign":
          expected = a * a;
          break;
        case "monomial-product":
          expected = a * b;
          break;
        case "polynomial-sum":
          expected = a + 1;
          break;
        case "polynomial-product":
          expected = a + b;
          break;
        case "polynomial-value":
          expected = (d - a) * (d + b) + c * d;
          break;
        case "zero-product":
          expected = b;
          break;
        case "square-sum-middle":
          expected = 2 * a;
          break;
        case "complete-square":
          expected = t.id === "A07-05" ? (a / 2) ** 2 : b - (a / 2) ** 2;
          break;
        case "difference-squares-number":
          expected = a * a - b * b;
          break;
        case "linear-basic":
          expected = (c - b) / a;
          break;
        case "linear-brackets":
          expected = b + c / a;
          break;
        case "linear-two-sides":
          expected = (b + d) / (a - c);
          break;
        case "linear-fraction":
          expected = a * b;
          break;
        case "function-value":
          expected = a * c - b;
          break;
        case "intercept":
          expected = -b;
          break;
        case "slope-change":
          expected = a * c;
          break;
        case "line-through-point":
          expected = c - a * b;
          break;
        case "system-addition":
          expected = (a + b) / 2;
          break;
        case "system-substitution":
          expected = b / (a + 1);
          break;
        case "system-price":
          expected = a - b;
          break;
        case "system-second-variable":
          expected = a - (c - a) / (b - 1);
          break;
        case "isosceles-angles":
          expected = (180 - a) / 2;
          break;
        case "isosceles-perimeter":
          expected = (b - a) / 2;
          break;
        case "corresponding-sides":
          expected = b;
          assert.ok(a + b > c && a + c > b && b + c > a, q.id);
          break;
        case "corresponding-angles":
        case "alternate-angles":
          expected = a;
          break;
        case "same-side-angles":
          expected = 180 - a;
          break;
        case "parallel-angle-equation":
          expected = (180 - a) / 2;
          break;
        case "rational-domain":
          expected = c;
          break;
        case "rational-difference-squares":
          expected = (d * d - b) / (d - c);
          break;
        case "negative-power":
          expected = 1 / (a * a);
          break;
        case "integer-power-product":
          expected = b + c;
          break;
        case "scientific-notation":
          expected = Math.floor(Math.log10(a));
          break;
        case "scientific-product":
          expected = Math.floor(Math.log10(a * 1e3 * c * 1e2));
          break; // numbers include the bases 10
        case "root-value":
          expected = Math.sqrt(a);
          break;
        case "root-absolute":
          expected = Math.abs(a);
          break;
        case "root-estimate":
          expected = Math.floor(Math.sqrt(a));
          break;
        case "discriminant":
          expected = a * a - 4 * b;
          break;
        case "vieta-sum":
          expected = a;
          break;
        case "quadratic-zero":
          expected = -a;
          break;
        case "vieta-recover":
          expected = a * c - c * c;
          break;
        case "strict-integer":
          expected = Math.ceil((c - b) / a) - 1;
          break;
        case "system-integer-count":
          expected = Math.floor(b) - Math.floor(a);
          break;
        case "parallelogram-area":
          expected = a * b;
          break;
        case "trapezoid-area":
          expected = ((a + b) * c) / 2;
          break;
        case "rhombus-diagonals":
          expected = (a * b) / 2;
          break;
        case "parallelogram-angle":
          expected = 180 - a;
          break;
        case "square-perimeter":
          expected = 4 * a;
          break;
        case "pythagoras-hypotenuse":
          expected = Math.hypot(a, b);
          break;
        case "pythagoras-leg":
        case "ladder":
          expected = Math.sqrt(a * a - b * b);
          break;
        case "diagonal-area":
          expected = Math.sqrt(a * a - b * b) * b;
          break;
        case "vector-coordinate":
          expected = c - a;
          break;
        case "vector-sum":
          expected = b + d;
          break;
        case "dot-product":
          expected = a * c + b * d;
          break;
        case "perpendicular-vectors":
          expected = (-a * c) / b;
          break;
        case "maximum":
          expected = b;
          break;
        case "symmetry":
          expected = 2 * a - b;
          break;
        case "integer-solutions":
          expected = b - a - 1;
          break;
        case "substitution-domain":
          expected = 2;
          break;
        case "system-identity":
          expected = a * a - 2 * b;
          break;
        case "arithmetic-term":
          expected = a + 4 * b;
          break;
        case "arithmetic-sum":
          expected = ((a + b) * 6) / 2;
          break;
        case "geometric-term":
          expected = a * 8;
          break;
        case "geometric-sum":
          expected = a * (1 + b + b * b);
          break;
        case "decreasing-progression":
          expected = b - a;
          break;
        case "rational-power":
          expected = Math.cbrt(a) ** 2;
          break;
        case "odd-root":
          expected = Math.cbrt(a);
          break;
        case "negative-rational-power":
          expected = 1 / Math.sqrt(a);
          break;
        case "root-of-even-power":
          expected = Math.abs(a);
          break;
        case "radians":
          expected = (a * Math.PI) / 180;
          break;
        case "pythagorean-identity":
          expected = 1 - a / b;
          break;
        case "right-triangle-sine":
          expected = Math.min(a, b) / c;
          break;
        case "tangent-ratio":
          expected = a / b / (c / d);
          break;
        case "similar-perimeter":
          expected = a * b;
          break;
        case "similar-area":
          expected = c * (b / a) ** 2;
          break;
        case "regular-polygon":
          expected = 360 / a;
          break;
        case "compound-area":
          expected = a * b - c * d;
          break;
        case "triangle-area":
          expected = (a * b) / 2;
          break;
        case "cosine-theorem":
          expected = a * a + b * b - 2 * a * b * Math.cos((c * Math.PI) / 180);
          break;
        case "sine-theorem":
          expected =
            (a * Math.sin((c * Math.PI) / 180)) / Math.sin((b * Math.PI) / 180);
          break;
        case "circumradius":
          expected = a / (2 * Math.sin((b * Math.PI) / 180));
          break;
        case "domain-fraction":
          expected = -b;
          break;
        case "period-sine":
          expected = (2 * Math.PI) / a;
          break;
        case "amplitude-range":
          expected = a + b;
          break;
        case "odd-sine":
          expected = -a / b;
          break;
        case "inverse-sine-value": {
          const input = q.prompt.match(/arcsin\(([^)]+)\)/)![1];
          expected = Math.asin(scalar(input));
          break;
        }
        case "inverse-cosine-range":
          expected = (Math.acos(Math.cos((a * Math.PI) / 180)) * 180) / Math.PI;
          break;
        case "inverse-tangent-range":
          expected = (Math.atan(Math.tan((a * Math.PI) / 180)) * 180) / Math.PI;
          break;
        case "inverse-sine-composition":
          expected = (Math.asin(Math.sin((a * Math.PI) / 180)) * 180) / Math.PI;
          break;
        case "sine-roots":
          expected = c - b + 1;
          break;
        case "removable-limit":
          expected = 2 * b;
          break;
        case "continuity-value":
          expected = 2 * a;
          break;
        case "polynomial-limit":
          expected = b * b + a;
          break;
        case "infinity-limit":
          expected = a;
          break;
        case "chain-rule":
          expected = 2 * a * (a * c + b);
          break;
        case "product-rule":
          expected = 3 * b * b + 2 * a * b;
          break;
        case "reciprocal-derivative":
          expected = -a / (b * b);
          break;
        case "maximum-sign":
          expected = a;
          break;
        case "closed-interval":
          expected = Math.max((b - a) ** 2, (c - a) ** 2);
          break;
        case "inclined-projection":
          expected = Math.sqrt(b * b - a * a);
          break;
        case "line-plane-angle":
          expected = a * Math.sin((b * Math.PI) / 180);
          break;
        case "common-base":
          expected = (c * Math.log(b)) / Math.log(a);
          break;
        case "shifted-exponent":
          expected = b + Math.log(c) / Math.log(a);
          break;
        case "log-definition":
          expected = Math.log2(a);
          break; // Unicode subscript base is not parsed as a digit
        case "log-product":
          expected = a + b;
          break;
        case "fractional-base":
          expected = Math.log(c) / Math.log(a / b);
          break;
        case "log-quotient":
          expected = Math.log2(a / b);
          break;
        case "log-equation":
          expected = a + 2 ** b;
          break;
        case "two-logarithms":
          expected = a + 2 ** (c / 2);
          break;
        case "integration-constant":
          expected = c - (a * b * b) / 2;
          break;
        case "recover-function":
          expected = 3 * a * d * d + b;
          break;
        case "newton-leibniz":
          expected = (a / 2) * (c * c - b * b);
          break;
        case "integral-constant":
          expected = a * (c - b);
          break;
        case "negative-area":
          expected = Math.abs(a) * (c - b);
          break;
        case "crossing-axis-area":
          expected = (a * a + b * b) / 2;
          break;
        case "area-between-graphs":
          expected = (b - a) * c;
          break;
        case "prism-elements":
          expected = 2 * a;
          break;
        case "pyramid-faces":
          expected = a + 1;
          break;
        case "cylinder-section":
          expected = a / 2;
          break;
        case "sphere-section":
          expected = Math.sqrt(a * a - b * b);
          break;
        case "prism-volume":
          expected = a * b;
          break;
        case "pyramid-volume":
          expected = (a * b) / 3;
          break;
        case "cylinder-volume":
          expected = Math.PI * a * a * b;
          break;
        case "cube-surface":
          expected = 6 * a * a;
          break;
        case "cone-comparison":
          expected = a / 3;
          break;
        case "sphere-surface-scaling":
          expected = a * a;
          break;
      }
      if (expected === undefined) continue;
      const options = q.choices.map(scalar);
      const correct = options.map(
        (x) =>
          Number.isFinite(x) &&
          Math.abs(x - expected!) <= 1e-7 * Math.max(1, Math.abs(expected!)),
      );
      if (correct.filter(Boolean).length !== 1)
        failures.push(
          `${q.id}: recomputed ${expected}, options ${q.choices}, input ${n}`,
        );
      if (!correct[q.correct])
        failures.push(
          `${q.id}: recomputed ${expected}, stored ${q.choices[q.correct]}; input ${n}`,
        );
      checked++;
      topics.add(t.id);
      skills.add(t.id + ":" + q.skill);
    }
  assert.deepEqual(failures, []);
  assert.equal(checked, 3122);
  assert.equal(topics.size, 54);
  assert.equal(skills.size, 196);
  console.log(
    `Independent displayed-question recomputation: ${checked} questions, ${skills.size} numeric families, ${topics.size} topics`,
  );
});

// A small independent arithmetic parser for checking the actual displayed
// symbolic options. It accepts math tokens only and never executes source text.
function expression(source: string, vars: Record<string, number>): number {
  const s = source
    .replaceAll("−", "-")
    .replaceAll("·", "*")
    .replace(/[²³⁴]/g, (x) => "^" + { "²": "2", "³": "3", "⁴": "4" }[x])
    .replace(/\s/g, "");
  const tokens = s.match(/sin|cos|\d+(?:\.\d+)?|[xyanCπ()+*/^\-]/g) ?? [];
  assert.equal(tokens.join(""), s, `Unsupported symbolic expression ${source}`);
  let i = 0;
  function atom(): number {
    const t = tokens[i++];
    if (t === "(") {
      const v = sum();
      assert.equal(tokens[i++], ")");
      return v;
    }
    if (t === "sin" || t === "cos") return Math[t](atom());
    if (t === "π") return Math.PI;
    if (t === "C") return 0;
    if (t in vars) return vars[t];
    const v = Number(t);
    assert.ok(Number.isFinite(v), source);
    return v;
  }
  function power(): number {
    let v = atom();
    if (tokens[i] === "^") {
      i++;
      v = v ** unary();
    }
    return v;
  }
  function unary(): number {
    if (tokens[i] === "-") {
      i++;
      return -unary();
    }
    if (tokens[i] === "+") {
      i++;
      return unary();
    }
    return power();
  }
  function product(): number {
    let v = unary();
    while (i < tokens.length) {
      const t = tokens[i];
      if (t === "*" || t === "/") {
        i++;
        const b = unary();
        v = t === "*" ? v * b : v / b;
      } else if (
        t === "(" ||
        t === "sin" ||
        t === "cos" ||
        t === "π" ||
        /^[xyanC\d]/.test(t)
      ) {
        v *= unary();
      } else break;
    }
    return v;
  }
  function sum(): number {
    let v = product();
    while (tokens[i] === "+" || tokens[i] === "-") {
      const t = tokens[i++],
        b = product();
      v = t === "+" ? v + b : v - b;
    }
    return v;
  }
  const out = sum();
  assert.equal(i, tokens.length, source);
  return out;
}
const close = (a: number, b: number) =>
  Math.abs(a - b) < 1e-7 * Math.max(1, Math.abs(a), Math.abs(b));
function member(text: string, x: number): boolean {
  if (/Все действительные|При всех x|На всей числовой/.test(text)) return true;
  if (text === "Решений нет") return false;
  if (text.startsWith("Только x =")) return x === ns(text)[0];
  if (text.includes(";")) {
    return [...text.matchAll(/([[(])([^;]+);\s*([^\])]+)([\])])/g)].some(
      ([, l, a, b, r]) => {
        const v = (t: string) =>
          t.includes("∞")
            ? t.includes("−")
              ? -Infinity
              : Infinity
            : scalar(t.trim());
        return (
          (l === "[" ? x >= v(a) : x > v(a)) &&
          (r === "]" ? x <= v(b) : x < v(b))
        );
      },
    );
  }
  const parts = text
    .replaceAll("−", "-")
    .split(/(≤|≥|<|>|=)/)
    .map((s) => s.trim());
  const val = (t: string) => (t === "x" ? x : Number(t));
  for (let i = 1; i < parts.length; i += 2) {
    const a = val(parts[i - 1]),
      b = val(parts[i + 1]);
    const valid =
      parts[i] === "<"
        ? a < b
        : parts[i] === ">"
          ? a > b
          : parts[i] === "≤"
            ? a <= b
            : parts[i] === "≥"
              ? a >= b
              : a === b;
    if (!valid) return false;
  }
  return true;
}

test("existing symbolic, interval and calculus options satisfy their displayed conditions", () => {
  let checked = 0;
  const skills = new Set<string>();
  const samples = [-3.5, -2, -0.5, 0.5, 2, 3.5, 7];
  for (const t of catalog)
    for (const q of trainerBank(t.id)) {
      const n = ns(q.prompt),
        [a, b, c, d, e] = n;
      let accepts: ((choice: string) => boolean) | undefined;
      const identity =
        (target: (x: number, y: number, z: number) => number) =>
        (choice: string) =>
          samples.every((x) =>
            close(
              expression(choice.replace(/^[yF]\(x\)\s*=\s*|^y\s*=\s*/, ""), {
                x,
                y: 1.3,
                a: 2.7,
              }),
              target(x, 1.3, 2.7),
            ),
          );
      const set = (roots: number[]) => (choice: string) => {
        const xs = ns(choice).sort((a, b) => a - b);
        return (
          xs.length === roots.length &&
          xs.every((x, i) => close(x, [...roots].sort((a, b) => a - b)[i]))
        );
      };
      const interval =
        (fn: (x: number) => boolean, boundaries: number[] = []) =>
        (choice: string) =>
          [
            ...Array.from({ length: 161 }, (_, i) => (i - 80) / 4),
            ...boundaries.flatMap((x) => [x - 0.1, x, x + 0.1]),
          ].every((x) => member(choice, x) === fn(x));
      switch (q.skill) {
        case "common-factor":
          accepts = identity((x) => b * x + c);
          break;
        case "difference-squares":
          accepts = identity((x) => x * x - a);
          break;
        case "grouping":
          accepts = identity((x, y, z) => z * x + z * y + a * x + a * y);
          break;
        case "square-difference-sign":
          accepts = identity((x) => (x - a) ** 2);
          break;
        case "rational-cancel":
          accepts = identity((x) => (b * x * x) / (c * x));
          break;
        case "rational-add":
          accepts = identity((x) => (b + c) / x);
          break;
        case "irrational-number":
          accepts = (choice) =>
            choice.startsWith("√") &&
            !Number.isInteger(Math.sqrt(Number(choice.slice(1))));
          break;
        case "negative-inequality":
          accepts = interval((x) => a * x < b, [b / a]);
          break;
        case "intersection":
          accepts = interval((x) => x >= a && x > b, [a, b]);
          break;
        case "right-triangle-check":
          accepts = (choice) => {
            const [a, b, c] = ns(choice).sort((a, b) => a - b);
            return a > 0 && a + b > c && a * a + b * b === c * c;
          };
          break;
        case "vertex":
          accepts = (choice) => {
            const [x, y] = ns(choice);
            return x === a && y === (x - a) ** 2 + b;
          };
          break;
        case "roots":
          accepts = set([-Math.sqrt(a), Math.sqrt(a)]);
          break;
        case "between-roots":
          accepts = interval((x) => (x - a) * (x - b) < 0, [a, b]);
          break;
        case "outside-roots":
          accepts = interval((x) => (x + a) * (x - b) >= 0, [-a, b]);
          break;
        case "fraction-boundary":
          accepts = interval((x) => x !== b && (x - a) / (x - b) <= 0, [a, b]);
          break;
        case "double-root":
          accepts = interval((x) => (x - a) ** 2 <= 0, [a]);
          break;
        case "biquadratic": {
          const disc = a * a - 4 * b;
          const ts = [(a - Math.sqrt(disc)) / 2, (a + Math.sqrt(disc)) / 2];
          accepts = set(ts.flatMap((v) => [-Math.sqrt(v), Math.sqrt(v)]));
          break;
        }
        case "system-pair":
          accepts = (choice) => {
            const [x, y] = ns(choice);
            return x + y === a && x * y === b;
          };
          break;
        case "excluded-root":
          accepts = set([-Math.sqrt(a)]);
          break;
        case "even-root-domain":
          accepts = interval((x) => x - a >= 0, [a]);
          break;
        case "domain-root":
          accepts = interval((x) => x - a >= 0, [a]);
          break;
        case "graph-translation":
          accepts = identity((x) => (x - a) ** 2 + b);
          break;
        case "even-function":
          accepts = (choice) =>
            samples.every((x) =>
              close(
                expression(choice.replace(/^y = /, ""), { x }),
                expression(choice.replace(/^y = /, ""), { x: -x }),
              ),
            );
          break;
        case "range":
          accepts = interval((y) => y >= -b, [-b]);
          break;
        case "tangent-domain":
          accepts = (choice) => Math.abs(Math.cos(scalar(choice))) < 1e-10;
          break;
        case "inverse-domain":
          accepts = (choice) => scalar(choice) >= -1 && scalar(choice) <= 1;
          break;
        case "cosine-roots":
        case "tangent-roots": {
          const target = (n: number) =>
            q.skill === "cosine-roots"
              ? (Math.PI / 2 + Math.PI * n) / a
              : (Math.PI / 4 + Math.PI * n) / a;
          accepts = (choice) => {
            const formula = choice.split(",")[0].replace(/^x = /, "");
            return [-2, -1, 0, 1, 2].every((n) =>
              close(expression(formula, { n }), target(n)),
            );
          };
          break;
        }
        case "sine-inequality":
          accepts = interval(
            (x) => x > b * Math.PI && x < (b + 1) * Math.PI,
            [b * Math.PI, (b + 1) * Math.PI, c * Math.PI],
          );
          break;
        case "cosine-inequality":
          accepts = interval(
            (x) => x >= (b + 0.5) * Math.PI && x <= (b + 1.5) * Math.PI,
            [(b + 0.5) * Math.PI, (b + 1.5) * Math.PI],
          );
          break;
        case "power-derivative":
          accepts = identity((x) => 3 * a * x * x);
          break;
        case "trig-derivative":
          accepts = identity((x) => -a * Math.sin(x));
          break;
        case "increasing-interval":
          accepts = interval((x) => a * x - b > 0, [b / a]);
          break;
        case "tangent":
          accepts = (choice) => {
            const formula = choice.replace(/^y = /, "");
            return (
              close(expression(formula, { x: a }), c) &&
              close(
                expression(formula, { x: a + 1 }) -
                  expression(formula, { x: a }),
                e,
              )
            );
          };
          break;
        case "decreasing-exponential":
          accepts = interval((x) => (a / b) ** x < (c / d) ** e, [e]);
          break;
        case "exponential-substitution":
          accepts = set([0, 1]);
          assert.equal(2 ** (2 * 0) - 3 * 2 ** 0 + 2, 0);
          assert.equal(2 ** (2 * 1) - 3 * 2 ** 1 + 2, 0);
          break;
        case "logarithm-domain":
          accepts = interval((x) => x > a, [a]);
          break;
        case "increasing-log-inequality":
          accepts = interval(
            (x) => x > a && Math.log2(x - a) > b,
            [a, a + 2 ** b],
          );
          break;
        case "decreasing-log-inequality":
          accepts = interval(
            (x) => x > 0 && Math.log(x) / Math.log(a / b) >= c,
            [0, (a / b) ** c],
          );
          break;
        case "extraneous-log-root":
          accepts = set([3]);
          assert.equal(Math.log2(3 - 1) + Math.log2(3 + 1), 3);
          break;
        case "antiderivative-power":
        case "antiderivative-sine":
        case "antiderivative-linear": {
          const target = (x: number) =>
            q.skill === "antiderivative-power"
              ? a * x * x
              : q.skill === "antiderivative-sine"
                ? a * Math.cos(x)
                : a * x + b;
          accepts = (choice) =>
            choice.includes("+ C") &&
            samples.every((x) => {
              const formula = choice.replace(/^F\(x\) = /, "");
              const h = 1e-5;
              return close(
                (expression(formula, { x: x + h }) -
                  expression(formula, { x: x - h })) /
                  (2 * h),
                target(x),
              );
            });
          break;
        }
      }
      if (!accepts) continue;
      const valid = q.choices.map(accepts);
      assert.equal(
        valid.filter(Boolean).length,
        1,
        `${q.id}: ${q.prompt}: ${q.choices}`,
      );
      assert.ok(valid[q.correct], q.id);
      checked++;
      skills.add(t.id + ":" + q.skill);
    }
  assert.equal(checked, 471);
  assert.equal(skills.size, 43);
  console.log(
    `Independent symbolic/interval checks: ${checked} questions in ${skills.size} families`,
  );
});

test("counted quantities retain natural Russian forms and clean currency values", () => {
  const forms = ["сом", "сома", "сомов"] as const;
  for (const [n, expected] of [
    [1, "1 сом"],
    [2, "2 сома"],
    [5, "5 сомов"],
    [11, "11 сомов"],
    [14, "14 сомов"],
    [21, "21 сом"],
    [22, "22 сома"],
    [25, "25 сомов"],
  ] as const) {
    assert.equal(counted(n, forms), expected);
  }
  assert.equal(counted(300 * 0.81, forms), "243 сома");
  let checked = 0;
  for (const t of catalog)
    for (const q of trainerBank(t.id)) {
      assert.doesNotMatch(
        q.prompt + q.solution,
        /\d[.,]\d{9}|undefined|NaN|Infinity/,
        q.id,
      );
      if (q.skill === "meeting") assert.match(q.prompt, /одновременно/);
      if (q.skill === "inverse-workers")
        assert.match(q.prompt, /каждого рабочего одинакова/);
      if (q.skill === "ladder") assert.match(q.prompt, /горизонтальной земле/);
      checked++;
    }
  assert.equal(checked, 3651);
});
