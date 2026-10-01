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
    ["\\frac{2}{4}", "\\sqrt{x}", "\\frac{a}{b}"],
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
