import test from "node:test";
import assert from "node:assert/strict";
import { course, emptyProgress, parseProgress } from "../src/course/model";
import {
  TRAINER_BANK_VERSION,
  trainerBank,
  trainerQuestion,
} from "../src/course/trainer/bank";
import { generatedQuestion } from "../src/course/trainer/legacyBankV2";
import {
  newTrainer,
  parseTrainer,
  reduceTrainer,
  qualifiesForCompletion,
  sessionQuestion,
} from "../src/course/trainer/model";
import { topicReferences, trainerTopics } from "../src/course/trainer/topics";
import { trainerPreview } from "../src/course/trainer/preview";
import { makeSpaceData } from "../src/cosmos/model";
import { didStudy } from "../src/engagement/streak";

test("all 55 topics have a large checked-choice bank, relevant references and a rendered formula", () => {
  assert.equal(course.length, 55);
  for (const topic of course) {
    const bank = trainerBank(topic.id);
    assert.ok(bank.length >= 20, `${topic.id}: ${bank.length}`);
    assert.equal(
      new Set(
        bank.map((q) => JSON.stringify([q.prompt, [...q.choices].sort()])),
      ).size,
      bank.length,
    );
    assert.equal(new Set(bank.map((q) => q.id)).size, bank.length);
    for (const q of bank) {
      assert.ok(q.solution.trim().length > 12, q.id);
      assert.equal(q.choices.length, 4, q.id);
      assert.ok(q.correct >= 0 && q.correct < q.choices.length, q.id);
      assert.equal(new Set(q.choices).size, q.choices.length, q.id);
      assert.ok(
        q.choices.every((c) => c.trim() && !/NaN|Infinity|undefined/.test(c)),
        q.id,
      );
    }
    assert.ok(trainerTopics[topic.id].hook.endsWith("?"));
    assert.ok(topicReferences(topic.id).length > 0);
    assert.ok(topicReferences(topic.id).every(Boolean), topic.id);
    assert.match(
      trainerPreview(topic.id).formulaImage,
      /^data:image\/svg\+xml/,
    );
  }
});

test("remainder tasks match their actual conditions across all parameter sets", () => {
  for (let i = 0; i < 144; i++) {
    const q = generatedQuestion("A05-01", i);
    const numbers = q.prompt.match(/\d+/g)!.map(Number);
    const value = Number(q.choices[q.correct]);
    if (i % 4 === 0) assert.equal(value, numbers[0] % numbers[1]);
    if (i % 4 === 1) assert.equal(value, numbers[0] * numbers[1] + numbers[2]);
    if (i % 4 === 2) assert.equal(value, Math.ceil(numbers[1] / numbers[0]));
    if (i % 4 === 3) assert.equal(value, numbers[0] % numbers[1]);
    assert.doesNotMatch(q.prompt, /карандаш|умножь|Сколько.*всего/);
  }
});

test("geometry, percentages, integrals and equation families satisfy independent constraints", () => {
  for (let i = 0; i < 144; i++) {
    const n = i + 2,
      a = 2 + (i % 11);
    const value = (id: string) =>
      Number(generatedQuestion(id, i).choices[0].replace(",", "."));
    const numbers = (id: string) =>
      generatedQuestion(id, i).prompt.match(/\d+/g)!.map(Number);
    if (i % 3 === 0) {
      assert.equal(value("A06-04"), (n * 20 * a * 5) / 100);
      assert.equal(
        value("G08-02"),
        i % 2
          ? Math.sqrt((5 * n) ** 2 - (3 * n) ** 2)
          : Math.hypot(3 * n, 4 * n),
      );
      assert.equal(value("G07-01") * 2 + n, 180);
      assert.equal(value("A11-05"), n * n);
    } else {
      const p = numbers("G08-02"),
        ans = value("G08-02");
      if (i % 3 === 1) assert.equal(ans * ans + p[1] * p[1], p[0] * p[0]);
      else assert.equal((ans / p[1]) ** 2 + p[1] ** 2, p[0] ** 2);
      const percent = numbers("A06-04");
      if (i % 3 === 1)
        assert.equal((value("A06-04") * percent[0]) / 100, percent[1]);
      else
        assert.equal(
          value("A06-04") / percent[0],
          percent[2] / (percent[0] + percent[1]),
        );
      const equation = numbers("A07-06"),
        x = value("A07-06");
      if (i % 3 === 1)
        assert.equal(
          equation[0] * (x - equation[1]),
          equation[2] * x + equation[3],
        );
      else assert.equal((x + equation[0]) / equation[1], equation[2]);
      const roots = numbers("A08-04");
      if (i % 3 === 1)
        assert.equal(roots[2] ** 2 - roots[0] * roots[2] + value("A08-04"), 0);
      else assert.equal(value("A08-04") ** 2 + roots[0] * value("A08-04"), 0);
    }
  }
});

test("cycles never repeat within a bank or at their boundary; reloading preserves question and option order", () => {
  for (const id of ["A05-01", "G08-02", "A11-03"]) {
    const size = trainerBank(id).length;
    for (const seed of [0, 42, 0xffffffff]) {
      const ids = Array.from(
        { length: size * 2 + 1 },
        (_, i) => trainerQuestion(id, seed, i).id,
      );
      assert.equal(new Set(ids.slice(0, size)).size, size);
      assert.equal(new Set(ids.slice(size, size * 2)).size, size);
      for (let i = 1; i < ids.length; i++) assert.notEqual(ids[i], ids[i - 1]);
      const q = trainerQuestion(id, seed, 7);
      assert.deepEqual(q, trainerQuestion(id, seed, 7));
      const original = trainerBank(id).find((x) => x.id === q.id)!;
      assert.equal(q.choices[q.correct], original.choices[original.correct]);
    }
  }
});

test("one checked answer increments one counter, survives reload, and cannot be submitted twice", () => {
  const id = "G08-02";
  let s = newTrainer(128);
  const q = trainerQuestion(id, s.seed, s.cursor);
  assert.deepEqual(reduceTrainer(s, id, { type: "submit" }), s);
  assert.deepEqual(reduceTrainer(s, id, { type: "next" }), s);
  s = reduceTrainer(s, id, { type: "select", choice: q.correct });
  s = reduceTrainer(s, id, { type: "submit" });
  assert.equal(s.correct, 1);
  assert.equal(s.incorrect, 0);
  assert.deepEqual(reduceTrainer(s, id, { type: "submit" }), s);
  assert.deepEqual(reduceTrainer(s, id, { type: "select", choice: 1 }), s);
  assert.deepEqual(parseTrainer(JSON.parse(JSON.stringify(s)), id), s);
  s = reduceTrainer(s, id, { type: "next" }, 0);
  assert.deepEqual(reduceTrainer(s, id, { type: "next" }, 0), s);
  const q2 = trainerQuestion(id, s.seed, s.cursor);
  s = reduceTrainer(s, id, {
    type: "select",
    choice: (q2.correct + 1) % q2.choices.length,
  });
  s = reduceTrainer(s, id, { type: "submit" });
  assert.equal(s.correct, 1);
  assert.equal(s.incorrect, 1);
  assert.equal(s.totalAnswered, 2);
  const finished = reduceTrainer(s, id, { type: "finish" });
  assert.equal(finished.finished, true);
  assert.deepEqual(reduceTrainer(finished, id, { type: "next" }), finished);
  assert.equal(reduceTrainer(finished, id, { type: "continue" }).correct, 1);
  const continued = reduceTrainer(finished, id, { type: "continue" });
  assert.equal(
    reduceTrainer(continued, id, { type: "finish" }).completedSessions,
    1,
  );
  const fresh = newTrainer(129, finished);
  assert.equal(fresh.totalAnswered, 2);
  assert.equal(fresh.correct, 0);
  assert.equal(fresh.completedSessions, 1);
});

test("early finish does not count an unchecked answer or mark an untouched topic complete", () => {
  let s = newTrainer(1);
  s = reduceTrainer(s, "A05-01", { type: "select", choice: 0 });
  s = reduceTrainer(s, "A05-01", { type: "finish" });
  assert.equal(s.correct + s.incorrect, 0);
  assert.equal(s.completedSessions, 0);
  assert.equal(
    makeSpaceData({
      "A05-01": { ...emptyProgress(), trainer: s },
    }).lessons.find((x) => x.id === "A05-01")!.complete,
    false,
  );
});

test("course storage preserves legacy work and new training independently; invalid saves are ignored", () => {
  const id = "A05-01",
    before = {
      ...emptyProgress(),
      notes: "Старые записи",
      quiz: { "1": { selected: 0, submitted: true, hintsShown: 0 } },
    };
  let trainer = newTrainer(4);
  trainer = reduceTrainer(trainer, id, { type: "select", choice: 0 });
  trainer = reduceTrainer(trainer, id, { type: "submit" });
  const after = { ...before, trainer };
  const parsed = parseProgress(JSON.stringify({ [id]: after }))[id];
  assert.deepEqual(parsed, after);
  assert.equal(didStudy(before, after), true);
  assert.equal(didStudy(after, after), false);
  for (const bad of [
    { ...trainer, cursor: -1 },
    { ...trainer, correct: 999 },
    { ...trainer, choice: 99 },
    { ...trainer, version: 99 },
  ])
    assert.equal(parseTrainer(bad, id), undefined);
  assert.deepEqual(
    parseProgress(
      JSON.stringify({ [id]: { ...before, trainer: { corrupt: true } } }),
    )[id],
    before,
  );
});

test("review history stays bounded and restores choices without recounting answers", () => {
  const topic = "G08-02";
  let state = newTrainer(123);
  for (let index = 0; index < 85; index++) {
    const q = trainerQuestion(topic, state.seed, state.cursor);
    state = reduceTrainer(state, topic, {
      type: "select",
      choice: index % 2 ? q.correct : (q.correct + 1) % q.choices.length,
    });
    state = reduceTrainer(state, topic, { type: "submit" });
    if (!state.submitted) {
      state = reduceTrainer(state, topic, {
        type: "select",
        choice: q.correct,
      });
      state = reduceTrainer(state, topic, { type: "submit" });
    }
    state = reduceTrainer(state, topic, { type: "next" });
  }
  assert.equal(Object.keys(state.answers).length, 60);
  assert.equal(state.answers[24], undefined);
  assert.ok(state.answers[25]);
  assert.deepEqual(
    parseTrainer(JSON.parse(JSON.stringify(state)), topic),
    state,
  );
  const legacy = { ...state, answers: undefined };
  const restored = parseTrainer(legacy, topic)!;
  assert.deepEqual(restored.answers, {});
  assert.equal(restored.correct + restored.incorrect, 85);
  const bad = {
    ...state,
    answers: {
      ...state.answers,
      "-1": { choice: 0, hints: 0 },
      "86": { choice: 0, hints: 0 },
      "25": { choice: 1000, hints: -1 },
    },
  };
  const clean = parseTrainer(bad, topic)!;
  assert.equal(clean.answers[-1], undefined);
  assert.equal(clean.answers[86], undefined);
  assert.equal(clean.answers[25], undefined);
  assert.equal(clean.correct + clean.incorrect, 85);
});

function answerMany(topic: string, correct: number, wrong: number) {
  let s = newTrainer(454);
  for (let i = 0; i < correct + wrong; i++) {
    const q = sessionQuestion(topic, s);
    s = reduceTrainer(s, topic, {
      type: "select",
      choice: i < correct ? q.correct : (q.correct + 1) % q.choices.length,
    });
    s = reduceTrainer(s, topic, { type: "submit" });
    if (!s.submitted) {
      s = reduceTrainer(s, topic, { type: "select", choice: q.correct });
      s = reduceTrainer(s, topic, { type: "submit" });
    }
    s = reduceTrainer(s, topic, { type: "next" });
  }
  return s;
}

test("completion requires at least 15 checked answers and an unrounded 80 percent", () => {
  for (const [right, wrong, pass] of [
    [14, 0, false],
    [11, 4, false],
    [12, 3, true],
    [15, 0, true],
    [15, 4, false],
    [16, 4, true],
    [79, 20, false],
  ] as const) {
    const s = answerMany("A05-01", right, wrong);
    assert.equal(qualifiesForCompletion(s), pass, `${right}/${right + wrong}`);
    const finished = reduceTrainer(s, "A05-01", { type: "finish" });
    assert.equal(finished.mastered, pass);
    const star = makeSpaceData({
      "A05-01": { ...emptyProgress(), trainer: finished },
    }).lessons.find((l) => l.id === "A05-01")!;
    assert.equal(star.complete, pass);
    assert.equal(star.practicing, !pass);
    assert.equal(newTrainer(5, finished).mastered, pass);
  }
});

test("ending or repeating a short session cannot accumulate a false completion", () => {
  let s = answerMany("A05-01", 5, 0);
  s = reduceTrainer(s, "A05-01", { type: "finish" });
  s = newTrainer(4, s);
  assert.equal(s.mastered, false);
  const star = makeSpaceData({ "A05-01": { ...emptyProgress(), trainer: s } }, {
    "A05-01": { complete: true, started: true, updatedAt: "2026-10-25" },
  } as any).lessons.find((l) => l.id === "A05-01")!;
  assert.equal(star.complete, false);
});

test("v1 migration keeps the original reviewed questions and scores, but changes upcoming tasks", () => {
  const oldQ = trainerQuestion("A05-01", 71, 0, 1);
  const legacy = {
    ...newTrainer(71),
    version: 1,
    legacyThrough: undefined,
    mastered: undefined,
    cursor: 1,
    correct: 1,
    incorrect: 0,
    totalAnswered: 1,
    answers: { 0: { choice: oldQ.correct, hints: 0 } },
    recent: [
      { questionId: oldQ.id, correct: true, at: "2026-10-25T00:00:00Z" },
    ],
  };
  const migrated = parseTrainer(legacy, "A05-01")!;
  const oldMistake = parseTrainer(
    {
      ...legacy,
      correct: 0,
      incorrect: 1,
      answers: {
        0: { choice: (oldQ.correct + 1) % oldQ.choices.length, hints: 0 },
      },
      recent: [
        { questionId: oldQ.id, correct: false, at: new Date().toISOString() },
      ],
    },
    "A05-01",
  )!;
  const review = makeSpaceData({
    "A05-01": { ...emptyProgress(), trainer: oldMistake },
  }).progress.recommendations[0].review;
  assert.deepEqual(review, { prompt: oldQ.prompt, solution: oldQ.solution });
  assert.equal(migrated.version, TRAINER_BANK_VERSION);
  assert.equal(migrated.totalAnswered, 1);
  assert.equal(migrated.correct, 1);
  assert.deepEqual(sessionQuestion("A05-01", migrated, 0), oldQ);
  assert.deepEqual(
    sessionQuestion("A05-01", migrated, 1),
    trainerQuestion("A05-01", 71, 0),
  );
  assert.deepEqual(parseTrainer(migrated, "A05-01"), migrated);
  const submitted = parseTrainer(
    { ...legacy, cursor: 0, submitted: true, choice: oldQ.correct },
    "A05-01",
  )!;
  assert.deepEqual(sessionQuestion("A05-01", submitted), oldQ);
  assert.equal(
    reduceTrainer(submitted, "A05-01", { type: "submit" }).correct,
    1,
  );
  const next = reduceTrainer(submitted, "A05-01", { type: "next" });
  assert.deepEqual(
    sessionQuestion("A05-01", next),
    trainerQuestion("A05-01", 71, 0),
  );
});

test("wrong options are rejected until correct or all three wrong choices, without inflating accuracy", () => {
  for (const recover of [false, true]) {
    const topic = "A05-01";
    let s = newTrainer(23);
    const q = sessionQuestion(topic, s);
    const wrong = q.choices.map((_, i) => i).filter((i) => i !== q.correct);
    assert.equal(wrong.length, 3);
    for (const [attempt, choice] of wrong.entries()) {
      s = reduceTrainer(s, topic, { type: "select", choice });
      s = reduceTrainer(s, topic, { type: "submit" });
      assert.equal(s.incorrect, 1);
      assert.equal(s.correct, 0);
      assert.equal(s.totalAnswered, 1);
      assert.equal(s.recent.length, 1);
      assert.deepEqual(s.rejected, wrong.slice(0, attempt + 1));
      assert.equal(s.submitted, attempt === 2);
      assert.deepEqual(parseTrainer(JSON.parse(JSON.stringify(s)), topic), s);
      assert.deepEqual(reduceTrainer(s, topic, { type: "submit" }), s);
      assert.deepEqual(reduceTrainer(s, topic, { type: "select", choice }), s);
      if (attempt < 2)
        assert.deepEqual(reduceTrainer(s, topic, { type: "next" }), s);
      if (recover) {
        s = reduceTrainer(s, topic, { type: "select", choice: q.correct });
        s = reduceTrainer(s, topic, { type: "submit" });
        assert.equal(s.submitted, true);
        assert.equal(s.incorrect, 1);
        assert.equal(s.correct, 0);
        assert.equal(s.answers[0].choice, q.correct);
        assert.deepEqual(s.answers[0].rejected, [wrong[0]]);
        break;
      }
    }
    const next = reduceTrainer(s, topic, { type: "next" });
    assert.equal(next.cursor, 1);
    assert.deepEqual(next.rejected, []);
  }
});

test("a partially retried fifteenth task cannot earn completion and resumes after finish", () => {
  const topic = "A05-01";
  let s = answerMany(topic, 14, 0);
  const q = sessionQuestion(topic, s);
  s = reduceTrainer(s, topic, {
    type: "select",
    choice: (q.correct + 1) % q.choices.length,
  });
  s = reduceTrainer(s, topic, { type: "submit" });
  assert.equal(qualifiesForCompletion(s), false);
  s = reduceTrainer(s, topic, { type: "finish" });
  assert.equal(s.mastered, false);
  s = reduceTrainer(s, topic, { type: "continue" });
  s = reduceTrainer(s, topic, { type: "select", choice: q.correct });
  s = reduceTrainer(s, topic, { type: "submit" });
  assert.equal(qualifiesForCompletion(s), true);
  assert.equal(s.correct, 14);
  assert.equal(s.incorrect, 1);
});

test("v2 migration preserves mixed v1/v2 history and an ongoing retry, then starts the reviewed bank", () => {
  const topic = "G05-02",
    seed = 185;
  const first = trainerQuestion(topic, seed, 0, 1);
  const second = trainerQuestion(topic, seed, 0, 2);
  const pending = trainerQuestion(topic, seed, 1, 2);
  const wrong = (pending.correct + 1) % pending.choices.length;
  const old = {
    ...newTrainer(seed),
    version: 2,
    previousBanks: undefined,
    legacyThrough: 1,
    cursor: 2,
    correct: 2,
    incorrect: 1,
    totalAnswered: 3,
    rejected: [wrong],
    choice: wrong,
    answers: {
      0: { choice: first.correct, hints: 0 },
      1: { choice: second.correct, hints: 0 },
    },
  };
  let migrated = parseTrainer(old, topic)!;
  assert.ok(migrated);
  assert.deepEqual(sessionQuestion(topic, migrated, 0), first);
  assert.deepEqual(sessionQuestion(topic, migrated, 1), second);
  assert.deepEqual(sessionQuestion(topic, migrated), pending);
  assert.deepEqual(parseTrainer(migrated, topic), migrated);
  migrated = reduceTrainer(migrated, topic, {
    type: "select",
    choice: pending.correct,
  });
  migrated = reduceTrainer(migrated, topic, { type: "submit" });
  assert.equal(migrated.correct, 2);
  assert.equal(migrated.incorrect, 1);
  migrated = reduceTrainer(migrated, topic, { type: "next" });
  assert.deepEqual(
    sessionQuestion(topic, migrated),
    trainerQuestion(topic, seed, 0),
  );
  assert.deepEqual(parseTrainer(migrated, topic), migrated);
  assert.equal(
    parseTrainer(
      { ...migrated, previousBanks: [{ from: 1, until: 3, version: 2 }] },
      topic,
    ),
    undefined,
  );
});

test("v2 unanswered choices are replaced without losing scores or counting an attempt", () => {
  const topic = "G05-02",
    seed = 17;
  const migrated = parseTrainer(
    { ...newTrainer(seed), version: 2, previousBanks: undefined, choice: 2 },
    topic,
  )!;
  assert.ok(migrated);
  assert.equal(migrated.choice, null);
  assert.equal(migrated.totalAnswered, 0);
  assert.deepEqual(
    sessionQuestion(topic, migrated),
    trainerQuestion(topic, seed, 0),
  );
});

test("opening questions also have four distinct choices and retain their authored correct answer", async () => {
  const { trainerOpening } = await import("../src/course/trainer/opening");
  const { getLessonContent, getLessonMeta } =
    await import("../src/course/videoLesson/content");
  for (const topic of course) {
    const original = getLessonContent({
      lessonId: topic.id,
      contentVersion: getLessonMeta(topic.id).version,
    }).opening;
    const q = trainerOpening(topic.id, original);
    assert.equal(q.choices.length, 4, topic.id);
    assert.equal(new Set(q.choices).size, 4, topic.id);
    assert.equal(q.choices[q.correct], original.choices[original.correct]);
  }
});
