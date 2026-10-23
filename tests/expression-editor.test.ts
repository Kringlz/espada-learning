import test from "node:test";
import assert from "node:assert/strict";
import { editExpression, expressionLatex } from "../src/tools/expressionEditor";
import { calculate } from "../src/tools/arithmetic";
import { renderMath } from "../src/math/render";

test("fraction templates, root slots and selection edits produce calculable expressions", () => {
  let state = { text: "1+2", selection: { start: 3, end: 3 } };
  for (const key of ["a/b", "√", "9"])
    state = editExpression(state.text, state.selection, key);
  assert.equal(state.text, "(1+2)/(√(9))");
  assert.equal(calculate(state.text), 1);
  const rendered = renderMath(expressionLatex(state.text))!;
  assert.match(rendered.svg, /data-mml-node="mfrac"/);
  assert.match(rendered.svg, /data-mml-node="msqrt"/);
  state = editExpression("12+34", { start: 3, end: 5 }, "5");
  assert.equal(state.text, "12+5");
  state = editExpression(state.text, state.selection, "⌫");
  assert.equal(state.text, "12+");
});
test("empty slots and grouped powers render without changing evaluation rules", () => {
  for (const source of [
    "(□)/(□)",
    "√(□)",
    "√(1/",
    "2^(3+2)",
    "1/2/3",
    "2^3^2",
    "2^-2",
    "1e-7",
    "sqrt(9+16)",
  ])
    assert.ok(renderMath(expressionLatex(source)), source);
  assert.match(expressionLatex("2^(3+2)"), /\^\{3\+2\}/);
  assert.equal(calculate("√((1+3)/4)"), 1);
  assert.equal(expressionLatex("2^-2"), "2^{-2}");
  assert.equal(expressionLatex("1/-2"), "\\frac{1}{-2}");
  assert.throws(() => calculate("(□)/(□)"));
  assert.throws(() => calculate("√(-1)"));
  assert.throws(() => calculate("1/(2-2)"));
});
test("next slot wraps; insertion limits never discard existing input", () => {
  const first = editExpression("(□)/(□)", { start: 1, end: 2 }, "⇥");
  assert.deepEqual(first.selection, { start: 5, end: 6 });
  const second = editExpression(first.text, first.selection, "⇥");
  assert.deepEqual(second.selection, { start: 1, end: 2 });
  const long = "1".repeat(240);
  assert.equal(editExpression(long, { start: 240, end: 240 }, "2").text, long);
});
