import test from "node:test";
import assert from "node:assert/strict";
import { calculate, formatNumber } from "../src/tools/arithmetic";
test("calculator respects arithmetic precedence, parentheses and right associative powers", () => {
  for (const [expression, expected] of [
    ["2+3×4", 14],
    ["(24+6)÷5", 6],
    ["2^3^2", 512],
    ["-2^2", -4],
    ["(-2)^2", 4],
    ["2^-2", 0.25],
    ["3--2", 5],
    ["sqrt(9+16)", 5],
    ["200×15%", 30],
    ["1,5+2,25", 3.75],
    ["ans×2", 14],
    ["1e-7 * 10", 1e-6],
  ] as const)
    assert.equal(calculate(expression, 7), expected, expression);
  assert.equal(formatNumber(calculate("0.1+0.2")), "0,3");
  assert.equal(calculate("π"), Math.PI);
});
test("calculator rejects malformed input, unsafe code and non-finite operations", () => {
  for (const expression of [
    "",
    "1/0",
    "sqrt(-1)",
    "(2+3",
    "2(3)",
    "2+",
    "2..3",
    "globalThis",
    "alert(1)",
    "1;2",
    "1e999",
    "9^9999",
    "2**3",
    "()",
    "sqrt9",
    "(".repeat(241),
  ])
    assert.throws(() => calculate(expression), expression);
});
