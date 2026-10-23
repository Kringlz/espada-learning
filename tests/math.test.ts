import test from "node:test";
import assert from "node:assert/strict";
import { mathRuns, mathSegments, toLatex } from "../src/math/notation";
import { renderMath } from "../src/math/render";
import { courseContent, TextRun } from "../src/course/content";

test("textbook fractions, roots and scripts retain mathematical grouping", () => {
  assert.equal(toLatex("2/4"), "\\frac{2}{4}");
  assert.equal(toLatex("3 2/5"), "3\\, \\frac{2}{5}");
  assert.equal(toLatex("x²/3"), "\\frac{x^{2}}{3}");
  assert.equal(toLatex("(a+b)/(c+d)"), "\\frac{a+b}{c+d}");
  assert.equal(toLatex("(a)(b)/2"), "\\frac{(a)(b)}{2}");
  assert.equal(
    toLatex("(√6 − √2)/4"),
    "\\frac{\\sqrt{6}\\, -\\, \\sqrt{2}}{4}",
  );
  assert.equal(toLatex("3π/4"), "\\frac{3\\pi }{4}");
  const runs: TextRun[] = [
    { text: "x" },
    { text: "3/2", script: "sup" },
    { text: "/3" },
  ];
  assert.equal(mathRuns(runs)[0].latex, "\\frac{x^{\\frac{3}{2}}}{3}");
  assert.equal(runs[0].text, "x");
});

test("explicit LaTeX and legacy text coexist without swallowing text, dates or units", () => {
  const text = String.raw`Возьми 2/4. Корень \(\sqrt{x}\). Формула: $$\frac{a}{b}$$; скорость 12 км/ч; дата 2026/10/01. https://example.org/a/b`;
  const segments = mathSegments(text);
  assert.equal(segments.map((s) => s.text).join(""), text);
  assert.deepEqual(
    segments.filter((s) => s.latex).map((s) => s.latex),
    ["\\frac{2}{4}", "\\sqrt{x}", "\\frac{a}{b}", "12"],
  );
  assert.equal(segments.filter((s) => s.display).length, 1);
  assert.equal(
    mathSegments("<script>alert(1)</script>")
      .map((s) => s.text)
      .join(""),
    "<script>alert(1)</script>",
  );
});

test("LaTeX output is self-contained SVG; malformed or unsupported commands do not crash", () => {
  const math = renderMath(String.raw`\frac{2}{4} + \sqrt{x^{2}}`)!;
  assert.ok(math.width > 0 && math.height > 0);
  assert.ok(math.svg.includes('data-mml-node="mfrac"'));
  assert.ok(math.svg.includes('data-mml-node="msqrt"'));
  assert.doesNotMatch(math.svg, /<script|<image|<use|foreignObject|xlink:href/);
  assert.equal(renderMath(String.raw`\frac{`), null);
  assert.equal(renderMath(String.raw`\href{https://example.com}{x}`), null);
  assert.equal(renderMath(String.raw`\require{html}`), null);
});

test("every detected mathematical span in the complete textbook renders successfully", () => {
  let count = 0;
  function visit(value: unknown) {
    if (Array.isArray(value)) {
      if (
        value.length &&
        value.every((r) => r?.text !== undefined && !r.kind)
      ) {
        for (const segment of mathRuns(value))
          if (segment.latex) {
            assert.ok(
              renderMath(segment.latex),
              `Failed to render: ${segment.text} → ${segment.latex}`,
            );
            count++;
          }
      } else value.forEach(visit);
    } else if (value && typeof value === "object")
      Object.values(value).forEach(visit);
  }
  visit(courseContent);
  assert.ok(count > 2000);
});

test("all current video notes, questions, choices and reference prose retain text and render", async () => {
  const { course } = await import("../src/course/model");
  const { getLessonMeta, getLessonContent } =
    await import("../src/course/videoLesson/content");
  const { referenceItems } = await import("../src/tools/reference/data");
  const strings: string[] = referenceItems.flatMap((item) =>
    [item.rule, item.notation, item.conditions].filter(
      (text): text is string => !!text,
    ),
  );
  for (const topic of course) {
    const meta = getLessonMeta(topic.id);
    const content = getLessonContent({
      lessonId: topic.id,
      contentVersion: meta.version,
    });
    strings.push(...meta.notes);
    for (const q of [content.opening, ...content.practice, ...content.check])
      strings.push(q.prompt, ...q.choices, ...q.hints, q.solution);
  }
  let formulas = 0;
  for (const text of strings) {
    const segments = mathSegments(text);
    assert.equal(segments.map((s) => s.text).join(""), text);
    for (const segment of segments)
      if (segment.latex) {
        assert.ok(renderMath(segment.latex), `${text}: ${segment.latex}`);
        formulas++;
      }
  }
  assert.ok(formulas > 1000);
  for (const text of ["a", "2x", "3 + 4", "42", "c² = a² + b²", "(a+b)/(c+d)"])
    assert.ok(
      mathSegments(text).some((s) => s.latex),
      text,
    );
});
