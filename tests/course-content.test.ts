import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { course } from "../src/course/model";
import { ContentBlock, courseContent, TextRun } from "../src/course/content";
import audit from "../content/math-course/extraction-audit.json";
function walk(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.flatMap((b) => [b, ...("blocks" in b ? walk(b.blocks) : [])]);
}
function textRuns(blocks: ContentBlock[]): TextRun[] {
  return walk(blocks).flatMap((b) =>
    "runs" in b
      ? b.runs
      : b.kind === "table"
        ? b.rows.flat(2)
        : b.kind === "equation"
          ? b.parts.flatMap((p) =>
              p.kind === "fraction"
                ? [...p.numerator, ...p.denominator]
                : p.runs,
            )
          : [],
  );
}
test("every original topic has selectable theory, exercises, hints and separate answers", () => {
  assert.equal(Object.keys(courseContent).length, 55);
  let figures = 0;
  for (const t of course) {
    const content = courseContent[t.id];
    assert.equal(content.pages.length, t.pages.length, t.id);
    const groups = [
      ...content.pages.map((p) => p.blocks),
      ...Object.values(content.practice),
    ];
    for (const blocks of groups) {
      assert.ok(
        textRuns(blocks)
          .map((r) => r.text)
          .join("").length > 15,
        t.id,
      );
      for (const b of walk(blocks)) {
        if (b.kind === "figure") {
          figures++;
          assert.ok(b.asset.includes("-figure-"));
          assert.ok(
            existsSync(`content/math-course/figures/${b.asset}.png`),
            b.asset,
          );
          assert.ok(b.height > 0 && b.width > 0);
        }
        if (b.kind === "table") {
          assert.ok(b.rows.length >= 2);
          assert.ok(b.rows.every((row) => row.length === b.rows[0].length));
        }
      }
    }
    assert.doesNotMatch(
      textRuns(content.practice.questions)
        .map((r) => r.text)
        .join(""),
      /Ответы и проверка|Ответы и пояснения/,
    );
    assert.ok(textRuns(content.practice.answers).length > 0);
  }
  assert.equal(figures, 34);
  assert.ok(audit.every((p) => p.unassigned === 0));
  assert.equal(new Set(audit.map((p) => `${p.topic}:${p.page}`)).size, 317);
});

test("superscripts preserve the meaning of exponential formulas and never swallow prose", () => {
  const runs = textRuns(courseContent["A11-01"].pages[1].blocks);
  assert.ok(runs.some((r) => r.script === "sup" && r.text === "2x−1"));
  assert.ok(runs.some((r) => r.script === "sup" && r.text === "f(x)"));
  assert.ok(runs.some((r) => r.script === "sup" && r.text === "g(x)"));
  for (const content of Object.values(courseContent)) {
    for (const blocks of [
      ...content.pages.map((p) => p.blocks),
      ...Object.values(content.practice),
    ]) {
      for (const run of textRuns(blocks)) {
        if (run.script) assert.doesNotMatch(run.text, /[А-Яа-яёЁ]/, run.text);
      }
    }
  }
});

test("stacked fractions remain structured mathematics; column arithmetic stays aligned", () => {
  const fractions = walk(courseContent["A06-02"].pages[1].blocks).filter(
    (b) => b.kind === "equation",
  );
  const equation = fractions[0];
  assert.equal(equation.kind, "equation");
  if (equation.kind !== "equation") return;
  assert.deepEqual(
    equation.parts
      .filter((p) => p.kind === "fraction")
      .map((p) => [
        p.numerator.map((r) => r.text).join(""),
        p.denominator.map((r) => r.text).join(""),
      ]),
    [
      ["3", "4"],
      ["3 · 2", "4 · 2"],
      ["6", "8"],
    ],
  );
  const arithmetic = walk(courseContent["A05-01"].pages[1].blocks).find(
    (b) => b.kind === "calculation",
  );
  assert.ok(arithmetic && arithmetic.kind === "calculation");
  assert.equal(arithmetic.text, "  468\n+ 257\n─────\n  725");
  const table = walk(courseContent["A10-06"].pages[1].blocks).find(
    (b) => b.kind === "table",
  );
  assert.ok(table && table.kind === "table");
  assert.deepEqual(
    table.rows[3].map((cell) => cell.map((r) => r.text).join("")),
    ["1/x", "−1/x²", "x ≠ 0"],
  );
});
