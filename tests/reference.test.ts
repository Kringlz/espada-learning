import test from "node:test";
import assert from "node:assert/strict";
import { referenceItems, referenceTopics } from "../src/tools/reference/data";
import { searchReference } from "../src/tools/reference/search";
import { renderMath } from "../src/math/render";

test("reference records are unique, assigned to a topic, and have explicit conditions", () => {
  assert.equal(
    new Set(referenceItems.map((e) => e.id)).size,
    referenceItems.length,
  );
  assert.equal(
    new Set(referenceItems.map((e) => e.title)).size,
    referenceItems.length,
  );
  for (const entry of referenceItems) {
    assert.ok(
      referenceTopics.some((t) => t.id === entry.topic),
      entry.id,
    );
    assert.ok(entry.conditions.trim(), entry.id);
    assert.ok(entry.formulas.length || entry.rule?.trim(), entry.id);
  }
  for (const topic of referenceTopics)
    assert.ok(referenceItems.some((e) => e.topic === topic.id));
});
test("all published formula lines render as accessible self-contained SVG", () => {
  for (const entry of referenceItems)
    for (const formula of entry.formulas) {
      assert.ok(formula.spoken.trim(), entry.id);
      const rendered = renderMath(formula.latex);
      assert.ok(rendered, `${entry.id}: ${formula.latex}`);
      assert.ok(rendered.width > 0 && rendered.height > 0);
      assert.doesNotMatch(rendered.svg, /<script|<image|foreignObject/);
    }
});
const cases: [string, string][] = [
  ["площадь треугольника", "triangle-area"],
  ["  ПРОЦЕНТЫ  ", "percent"],
  ["квадратное уравнение", "quadratic"],
  ["квадратного уравнения", "quadratic"],
  ["как найти гипотенузу", "pythagoras"],
  ["сложить дроби", "fraction-add"],
  ["скидка", "percent-change"],
  ["объем шара", "sphere"],
  ["объём шара", "sphere"],
  ["сумма геометрической прогрессии", "geometric-sum"],
  ["корни", "root-square"],
  ["%", "percent"],
  ["√", "root-square"],
  ["производная частного", "derivative-rules"],
];
for (const [query, id] of cases)
  test(`student search: ${query}`, () => {
    assert.ok(
      searchReference(query).some((e) => e.id === id),
      id,
    );
  });
test("exact title is the top result", () => {
  for (const id of ["quadratic", "triangle-area", "pythagoras"]) {
    const entry = referenceItems.find((e) => e.id === id)!;
    assert.equal(searchReference(entry.title)[0].id, id);
  }
});
test("topic switching and empty searches do not leak unrelated results", () => {
  assert.deepEqual(searchReference("несуществующаяформула"), []);
  assert.deepEqual(searchReference("    "), referenceItems);
  for (const topic of referenceTopics) {
    assert.deepEqual(
      searchReference("", topic.id),
      referenceItems.filter((e) => e.topic === topic.id),
    );
  }
  assert.equal(searchReference("площадь треугольника", "fractions").length, 0);
});

test("reading layouts render every formula at textbook size on a 320px screen", async () => {
  const { referenceMathLayout } = await import("../src/tools/reference/layout");
  for (const entry of referenceItems)
    for (const formula of entry.formulas) {
      const math = renderMath(referenceMathLayout(formula.latex));
      assert.ok(math, entry.id);
      assert.ok(
        math.width * 24 <= 284,
        `${entry.id}: formula exceeds mobile reading column`,
      );
    }
});
