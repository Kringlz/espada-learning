import test from "node:test";
import assert from "node:assert/strict";
import { course, emptyProgress, parseProgress } from "../src/course/model";
import { courseContent } from "../src/course/content";
import { splitPractice } from "../src/course/practice";
import {
  applyQuizAction,
  emptyAttempt,
  quizQuestion,
  quizStats,
} from "../src/course/quiz";

test("all 458 source questions have three distinct choices and two authored hints", () => {
  const correctPositions = new Set<number>();
  let count = 0;
  for (const topic of course) {
    const questions = splitPractice(
      courseContent[topic.id].practice.questions,
    ).items;
    assert.equal(questions.length, topic.practice.count);
    for (const q of questions) {
      const quiz = quizQuestion(topic.id, q.number);
      assert.equal(quiz.choices.length, 3);
      assert.equal(
        new Set(quiz.choices.map((a) => a.text.trim())).size,
        3,
        `${topic.id}/${q.number}`,
      );
      assert.equal(quiz.hints.length, 2);
      assert.ok(quiz.hints.every((hint) => hint.trim().length > 20));
      correctPositions.add(quiz.choices.findIndex((a) => a.id === 0));
      assert.deepEqual(quiz, quizQuestion(topic.id, q.number));
      count++;
    }
  }
  assert.equal(count, 458);
  assert.equal(correctPositions.size, 3);
});

test("authored answers retain signs, excluded roots, units and multiple solutions", () => {
  const cases = [
    ["A05-02", "2", "24"],
    ["A09-03", "4", "Корней нет"],
    ["A09-05", "4", "−3; 3"],
    ["A09-06", "7", "−12/13"],
    ["A11-03", "6", "0 < x ≤ 1/4"],
    ["G11-02", "8", "16π"],
  ];
  for (const [topic, question, answer] of cases)
    assert.equal(
      quizQuestion(topic, question).choices.find((c) => c.id === 0)?.text,
      answer,
    );
});

test("hints advance one step, remain bounded, and checked answers cannot be changed", () => {
  let a = emptyAttempt();
  assert.equal(applyQuizAction(a, { type: "submit" }, 2), a);
  a = applyQuizAction(a, { type: "hint" }, 2);
  assert.equal(a.hintsShown, 1);
  a = applyQuizAction(a, { type: "select", choice: 0 }, 2);
  a = applyQuizAction(a, { type: "hint" }, 2);
  a = applyQuizAction(a, { type: "hint" }, 2);
  assert.equal(a.hintsShown, 2);
  a = applyQuizAction(a, { type: "submit" }, 2);
  assert.equal(applyQuizAction(a, { type: "select", choice: 1 }, 2), a);
  assert.equal(applyQuizAction(a, { type: "hint" }, 2), a);
  assert.deepEqual(quizStats({ "1": a }), {
    answered: 1,
    independent: 0,
    assisted: 1,
    incorrect: 0,
  });
});

test("reload preserves hint use, unchecked selection and old reading/notes without mixing questions", () => {
  const old = {
    ...emptyProgress(),
    notes: "Сохранённые записи",
    readPages: [0],
    reviewed: { "3": "repeat" },
    quiz: {
      "1": { selected: 0, hintsShown: 0, submitted: true },
      "2": { selected: 0, hintsShown: 1, submitted: true },
      "3": { selected: 2, hintsShown: 0, submitted: true },
      "4": { selected: 1, hintsShown: 2, submitted: false },
    },
  };
  const resumed = parseProgress(JSON.stringify({ "A05-01": old }))["A05-01"];
  assert.deepEqual(resumed.quiz, old.quiz);
  assert.equal(resumed.notes, old.notes);
  assert.deepEqual(resumed.readPages, [0]);
  assert.deepEqual(resumed.reviewed, old.reviewed);
  assert.deepEqual(quizStats(resumed.quiz), {
    answered: 3,
    independent: 1,
    assisted: 1,
    incorrect: 1,
  });
  assert.deepEqual(
    parseProgress(JSON.stringify({ "A05-01": { notes: "old" } }))["A05-01"]
      .quiz,
    {},
  );
});

test("corrupt saved answers cannot create results outside the test", () => {
  const p = parseProgress(
    JSON.stringify({
      "A05-01": {
        quiz: {
          "1": { selected: 99, submitted: true, hintsShown: 99 },
          "2": { selected: "0", submitted: true, hintsShown: -5 },
          "3": { selected: 1, submitted: "true", hintsShown: 0.5 },
          "999": { selected: 0, submitted: true, hintsShown: 0 },
        },
      },
    }),
  )["A05-01"];
  assert.deepEqual(p.quiz["1"], {
    selected: null,
    submitted: false,
    hintsShown: 2,
  });
  assert.equal(p.quiz["2"].submitted, false);
  assert.equal(p.quiz["3"].submitted, false);
  assert.equal(p.quiz["999"], undefined);
  assert.equal(quizStats(p.quiz).answered, 0);
});

test("mathematics in every quiz choice and hint renders without falling back to raw notation", async () => {
  const { mathSegments } = await import("../src/math/notation");
  const { renderMath } = await import("../src/math/render");
  let formulas = 0;
  for (const topic of course)
    for (let n = 1; n <= topic.practice.count; n++) {
      const q = quizQuestion(topic.id, String(n));
      for (const text of [...q.choices.map((c) => c.text), ...q.hints])
        for (const segment of mathSegments(text)) {
          if (segment.latex) {
            assert.ok(
              renderMath(segment.latex),
              `${topic.id}/${n}: ${segment.text}`,
            );
            formulas++;
          }
        }
    }
  assert.ok(formulas > 300);
});
