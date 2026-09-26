import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLessonPackage } from "../src/lessons/validation";
const text = readFileSync("content/demo-lessons.json", "utf8");
const data = parseLessonPackage(text);
test("demo package: three draft lessons, 20 distinct questions each, exact 8/8/4, no invented video", () => {
  assert.equal(data.lessons.length, 3);
  const ids = new Set<string>();
  for (const l of data.lessons) {
    assert.equal(l.status, "draft");
    assert.equal(l.videoUrl, null);
    assert.equal(l.demo, true);
    assert.equal(l.test.passScore, 7);
    assert(l.summary.some((b) => b.kind === "example"));
    assert.equal(l.questions.length, 20);
    assert.equal(new Set(l.questions.map((q) => q.prompt)).size, 20);
    for (const d of ["easy", "medium", "hard"])
      assert.equal(
        l.questions.filter((q) => q.difficulty === d).length,
        d === "hard" ? 4 : 8,
      );
    for (const q of l.questions) {
      assert(!ids.has(q.id));
      ids.add(q.id);
      assert(q.explanation.length > 20);
    }
  }
});
// Independently computed results or explicitly reviewed conceptual answer sets.
// Compare option text, not its position; editing/shuffling options must not break the key.
const expected: (string | number | string[])[][] = [
  [
    6 + 3 * 4,
    (6 + 3) * 4,
    20 - 12 / 3,
    (24 / 4) * 2,
    15 - 7 + 2,
    5 * (9 - 6),
    ["Умножение", "Деление"],
    36 / (3 * 2),
    48 / (2 + 4) + 3 * 5,
    60 - ((18 + 6) / 4) * 3,
    7 * (12 - 8) + 18 / 3,
    ["2 + 3 × 4", "20 − 12 : 2"],
    72 / 3 / 4 + 5,
    "(18 − 6) : 3",
    100 - (3 * 12 + 15),
    5 * (14 - 8) - (9 + 3) / 2,
    96 / (18 - 2 * 6) + 3 * (7 - 5),
    (4 * 6 * 2) / 8,
    ["40 : (2 × 2) + 3 − 3", "(40 : 2 + 2) : 2 − 1", "40 : (2 + 2 × 3) + 5"],
    3 * 5 - (2 * 18) / 4,
  ],
  [
    12 - 7,
    9 + 4,
    21 / 3,
    4 * 5,
    (11 - 3) / 2,
    (14 + 6) / 5,
    ["x + 2 = 5", "4x − 1 = 11"],
    10 - 6,
    21 / 3 - 2,
    (8 + 7) / (5 - 2),
    (10 + 2) / (6 - 4),
    5 * 4 + 3,
    (7 - 2) / 0.5,
    ["Разделить обе части на 2", "Прибавить к обеим частям 3"],
    `${30 / 2 - 9} см`,
    (7 + 8) / (3 + 2),
    11,
    `${(150 - 25 - 35) / 3} сомов`,
    ["2(x + 3) = 2x + 6", "4x − 2x = 2x"],
    2 * (6 + 6),
  ],
  [
    "2 : 3",
    "3 : 2",
    (4 * 3) / 2,
    45 / 3,
    ["4 : 10", "6 : 15"],
    "2 м",
    "1/4",
    (6 * 5) / 10,
    (40 * 3) / (3 + 5),
    `${(300 / 4) * 10} г`,
    "1,5 км",
    (4 * 6) / 8,
    (20 * 3) / 5,
    [
      "Количество тетрадей и стоимость при постоянной цене",
      "Время и путь при постоянной скорости",
    ],
    `${(450 * 2) / (2 + 7)} мл`,
    (6 * 5) / 3 - 2,
    (10 / (3 - 2)) * (2 + 3),
    (120 / (6 * 4)) * 9 * 6,
    [
      "Меди осталось 12 кг",
      "Цинка стало 13 кг",
      "Новое отношение меди к цинку 12 : 13",
    ],
    (2 / (2 / 40 + 3 / 60)) * 5,
  ],
];
for (let l = 0; l < 3; l++)
  test(`all 20 demo answer keys verified: ${data.lessons[l].title}`, () => {
    data.lessons[l].questions.forEach((q, i) => {
      const want = expected[l][i];
      assert.deepEqual(
        q.options
          .filter((o) => q.correctOptionIds.includes(o.id))
          .map((o) => o.text)
          .sort(),
        (Array.isArray(want) ? want : [String(want)]).sort(),
        q.id,
      );
    });
    // Extra independent substitution for the rational equation.
    if (l === 1) {
      const x = Number(expected[1][16]);
      assert.equal((2 * x - 1) / 3 - (x + 1) / 2, 1);
    }
  });
test("import validation rejects malformed JSON, duplicate IDs, nonexistent answers, and nontext prompts", () => {
  assert.throws(() => parseLessonPackage("{"), /JSON/);
  const bad = structuredClone(data);
  bad.lessons[0].questions[0].correctOptionIds = ["absent"];
  assert.throws(() => parseLessonPackage(JSON.stringify(bad)), /правильные/);
  const duplicate = structuredClone(data);
  duplicate.lessons.push(duplicate.lessons[0]);
  assert.throws(
    () => parseLessonPackage(JSON.stringify(duplicate)),
    /повторный/,
  );
  const malformed = JSON.parse(text);
  malformed.lessons[0].questions[0].prompt = 17;
  assert.throws(() => parseLessonPackage(JSON.stringify(malformed)), /текст/);
});
