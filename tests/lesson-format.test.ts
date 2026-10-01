import test from "node:test";
import assert from "node:assert/strict";
import { formatLessonText } from "../src/lessons/formatText";

test("lesson formatting preserves mathematical signs, formulas and line breaks", () => {
  const source = "−5 + 3 = −2\nx² + y² = z²\n1.5 × 2 = 3\n-3 < 0\n\nОтвет: ⅔";
  const result = formatLessonText(source);
  assert.equal(result.map((b) => b.text).join("\n\n"), source);
  assert.ok(result.every((b) => b.kind === "paragraph"));
});
test("authored headings and lists are displayed without swallowing lesson content", () => {
  const result = formatLessonText(
    "## Порядок действий\r\n\r\nСначала **скобки**.\r\n• 2 + 3 = 5\r\n1) Умножь на 4\r\n\r\n<script>example</script>",
  );
  assert.equal(result[0].kind, "heading");
  assert.equal(result[1].text, "Сначала **скобки**.");
  assert.equal(result[2].text, "2 + 3 = 5");
  assert.equal(result[3].marker, "1)");
  assert.equal(result[4].text, "<script>example</script>");
});
