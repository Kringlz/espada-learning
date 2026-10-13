import test from "node:test";
import assert from "node:assert/strict";
import originalCatalog from "../content/math-course/catalog.json";
import originalQuiz from "../content/math-course/quiz.json";
import originalContent from "../content/math-course/structured.json";
import { supplemental } from "../src/course/supplemental";
import { course, emptyProgress, parseProgress } from "../src/course/model";
import { courseContent, type TopicContent } from "../src/course/content";
import { quizQuestion } from "../src/course/quiz";
import { splitPractice } from "../src/course/practice";

test("117 supplementary exercises map to 39 existing lessons and all seven supplied collections", () => {
  assert.equal(Object.keys(supplemental).length, 39);
  assert.equal(Object.values(supplemental).flat().length, 117);
  const files = new Set<string>();
  const questions = new Set<string>();
  for (const [id, exercises] of Object.entries(supplemental)) {
    const topic = course.find((t) => t.id === id)!;
    assert.ok(topic && topic.grade >= 5 && topic.grade <= 9);
    assert.equal(exercises.length, 3);
    for (const exercise of exercises) {
      files.add(exercise.source.file);
      assert.ok(exercise.source.page >= 3 && exercise.source.page <= 22);
      assert.match(exercise.source.section, /^§ /);
      assert.ok(exercise.answer.length > 25);
      assert.ok(exercise.question.length >= 10);
      assert.ok(!questions.has(exercise.question), exercise.question);
      questions.add(exercise.question);
    }
  }
  assert.equal(files.size, 7);
});

test("all original questions, choices, answers, hint steps and saved attempt IDs stay unchanged", () => {
  for (const topic of originalCatalog) {
    const original = (
      originalContent as unknown as Record<string, TopicContent>
    )[topic.id];
    const combined = courseContent[topic.id];
    for (const kind of ["questions", "answers"] as const) {
      assert.deepEqual(
        combined.practice[kind].slice(0, original.practice[kind].length),
        original.practice[kind],
      );
      assert.deepEqual(
        splitPractice(combined.practice[kind]).items.slice(
          0,
          topic.practice.count,
        ),
        splitPractice(original.practice[kind]).items,
      );
    }
    const authored = (
      originalQuiz as Record<string, { choices: string[]; hints: string[] }[]>
    )[topic.id];
    for (let i = 0; i < topic.practice.count; i++) {
      const question = quizQuestion(topic.id, String(i + 1));
      assert.deepEqual(
        [...question.choices].sort((a, b) => a.id - b.id).map((c) => c.text),
        authored[i].choices,
      );
      assert.deepEqual(question.hints, authored[i].hints);
    }
    const attempt = { selected: 0, submitted: true, hintsShown: 1 };
    const old = {
      ...emptyProgress(),
      quiz: { [topic.practice.count]: attempt },
    };
    assert.deepEqual(
      parseProgress(JSON.stringify({ [topic.id]: old }))[topic.id].quiz[
        String(topic.practice.count)
      ],
      attempt,
    );
  }
});

// Independently worked answer keys. These catch number, sign, unit, interval and
// distractor regressions in the authored data (not just JSON shape changes).
test("new answer keys match independently checked arithmetic and geometry", () => {
  const keys: Record<string, string[]> = {
    "A05-01": ["106", "123", "140"],
    "A05-02": ["24", "32", "40"],
    "A05-03": ["36", "52", "70"],
    "A05-04": ["11", "13", "15"],
    "G05-01": ["35°", "45°", "55°"],
    "G05-02": ["36 м²", "50 м²", "66 м²"],
    "A06-01": ["36", "54", "72"],
    "A06-02": ["3/4", "1/2", "3/8"],
    "A06-03": ["3,6", "5,1", "6,6"],
    "A06-04": ["40", "60", "80"],
    "A06-05": ["6", "6", "6"],
    "A06-06": ["1360", "2040", "2720"],
    "G06-01": ["(2; 5)", "(3; 6)", "(4; 7)"],
    "A07-01": ["6", "x + 9", "2x + 12"],
    "A07-02": ["x^5", "x^6", "x^7"],
    "A07-03": ["2x² + 6x", "3x² + 12x", "4x² + 20x"],
    "A07-04": ["2x(3x + 5)", "3x(3x + 5)", "4x(3x + 5)"],
    "A07-05": ["x² − 6x + 9", "x² − 8x + 16", "x² − 10x + 25"],
    "A07-06": ["5", "6", "7"],
    "A07-07": ["−7", "−10", "−13"],
    "A07-08": ["(6; 2)", "(8; 3)", "(10; 4)"],
    "G07-01": ["70°", "60°", "50°"],
    "G07-02": ["110°", "95°", "80°"],
    "A08-01": ["x + 2, x ≠ 2", "x + 3, x ≠ 3", "x + 4, x ≠ 4"],
    "A08-02": ["1/4", "1/9", "1/16"],
    "A08-03": ["2√5", "3√5", "4√5"],
    "A08-04": ["2; 5", "3; 6", "4; 7"],
    "A08-05": ["x < −3", "x < −3", "x < −3"],
    "G08-01": ["10 см", "13 см", "16 см"],
    "G08-02": ["10 см", "15 см", "20 см"],
    "G08-03": ["(5; 4)", "(7; 5)", "(9; 6)"],
    "A09-01": ["(2; −3)", "(3; −4)", "(4; −5)"],
    "A09-02": ["(2; 6)", "(3; 7)", "(4; 8)"],
    "A09-03": ["−2; −1; 1; 2", "−3; −1; 1; 3", "−4; −1; 1; 4"],
    "A09-04": ["17", "25", "33"],
    "A09-05": ["−2", "−3", "−4"],
    "A09-06": ["3/5", "3/5", "3/5"],
    "G09-01": ["28 см²", "63 см²", "112 см²"],
    "G09-02": ["12 см²", "27 см²", "48 см²"],
  };
  assert.deepEqual(Object.keys(keys).sort(), Object.keys(supplemental).sort());
  for (const [id, answers] of Object.entries(keys))
    assert.deepEqual(
      supplemental[id].map((q) => q.choices[0]),
      answers,
      id,
    );
});

test("quadratic roots and inequality endpoints satisfy the original mathematical conditions", () => {
  for (const [index, k] of [2, 3, 4].entries()) {
    const roots = supplemental["A09-03"][index].choices[0]
      .replaceAll("−", "-")
      .split("; ")
      .map(Number);
    assert.equal(new Set(roots).size, 4);
    for (const x of roots)
      assert.equal(x ** 4 - (k * k + 1) * x * x + k * k, 0);
    const answer = supplemental["A09-02"][index].choices[0];
    assert.match(answer, /^\(\d+; \d+\)$/);
    const [left, right] = answer.slice(1, -1).split("; ").map(Number);
    const value = (x: number) => (x - k) * (x - k - 4);
    assert.ok(value(left) === 0);
    assert.ok(value(right) === 0);
    assert.ok(value((left + right) / 2) < 0);
    assert.ok(value(left - 1) > 0 && value(right + 1) > 0);
  }
});
