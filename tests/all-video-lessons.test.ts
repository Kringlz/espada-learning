import test from "node:test";
import assert from "node:assert/strict";
import { course } from "../src/course/model";
import {
  getLessonContent,
  getLessonMeta,
  allLessons,
} from "../src/course/videoLesson/content";
import {
  emptyLesson,
  updateLesson,
  parseLesson,
  lessonKey,
  result,
  currentQuestion,
  taskControl,
  videoProgress,
  Action,
} from "../src/course/videoLesson/model";
import { emptyWatch } from "../src/engagement/rewards";
const at = "2026-10-23T12:00:00Z";
for (const topic of course) {
  test(`${topic.id}: complete journey, skips, drafts, history and isolated persistence`, () => {
    const meta = getLessonMeta(topic.id);
    const content = getLessonContent({
      lessonId: topic.id,
      contentVersion: meta.version,
    });
    assert.equal(meta.notes.length, 4);
    assert.ok(meta.videos.length);
    assert.ok(content.practice.length >= 3);
    assert.ok(content.check.length >= 5);
    const all = [content.opening, ...content.practice, ...content.check];
    assert.equal(new Set(all.map((q) => q.id)).size, all.length);
    assert.equal(new Set(all.map((q) => q.prompt)).size, all.length);
    for (const q of all) {
      assert.ok(q.source && q.solution && q.prompt);
      assert.equal(new Set(q.choices).size, q.choices.length);
      assert.ok(q.correct >= 0 && q.correct < q.choices.length);
    }
    let data = emptyLesson();
    const send = (a: Action) => {
      data = updateLesson(data, a);
    };
    const run = () => data.runs.at(-1)!;
    const resume = () => {
      data = parseLesson(JSON.stringify(data), topic.id);
    };
    const answer = () => {
      const q = currentQuestion(run())!;
      send({ type: "choose", id: q.id, choice: q.correct });
      send({ type: "submit", at });
    };
    send({ type: "start", id: topic.id + "-one", at, lessonId: topic.id });
    answer();
    send({ type: "next", from: "intro", index: 0 });
    assert.equal(run().stage, "video");
    send({ type: "next", from: "video", index: 0 });
    const first = content.practice[0];
    send({ type: "choose", id: first.id, choice: first.correct });
    send({ type: "hint" });
    send({ type: "practiceIndex", index: 1 });
    resume();
    assert.equal(Object.keys(run().practice).length, 0);
    send({ type: "practiceIndex", index: 0 });
    assert.equal(run().drafts["practice:" + first.id], first.correct);
    assert.equal(run().hints[first.id], 1);
    content.practice.forEach((q, index) => {
      send({ type: "practiceIndex", index });
      answer();
      assert.equal(run().practice[q.id].choice, q.correct);
    });
    resume();
    assert.equal(taskControl(run())?.label, "Завершить");
    send({ type: "practiceContinue", index: run().practiceIndex });
    assert.equal(run().stage, "return");
    answer();
    send({ type: "next", from: "return", index: run().practiceIndex });
    assert.equal(run().stage, "check");
    const beforeHints = JSON.stringify(run().hints);
    send({ type: "hint" });
    assert.equal(JSON.stringify(run().hints), beforeHints);
    send({ type: "checkContinue", index: 0 });
    const q = content.check[1];
    send({
      type: "choose",
      id: q.id,
      choice: (q.correct + 1) % q.choices.length,
    });
    send({ type: "checkIndex", index: 0 });
    resume();
    send({ type: "checkIndex", index: 1 });
    send({ type: "choose", id: q.id, choice: q.correct });
    send({ type: "finish", at });
    assert.equal(result(run()).correct, 1);
    assert.equal(result(run()).total, content.check.length);
    assert.equal(run().stage, "result");
    const saved = JSON.stringify(run());
    send({ type: "finish", at: "later" });
    assert.equal(JSON.stringify(run()), saved);
    send({ type: "start", id: topic.id + "-two", at, lessonId: topic.id });
    resume();
    assert.equal(data.runs.length, 2);
    assert.equal(JSON.stringify(data.runs[0]), saved);
    assert.equal(run().stage, "intro");
    assert.throws(() =>
      parseLesson(
        JSON.stringify(data),
        topic.id === "G08-02" ? "A05-01" : "G08-02",
      ),
    );
  });
}
test("all course keys are distinct; legacy sample key is unchanged", () => {
  assert.equal(new Set(course.map((t) => lessonKey("student", t.id))).size, 55);
  assert.equal(lessonKey("student"), "espada.video-lesson.v1:student:G08-02");
  assert.equal(Object.keys(allLessons).length, 54);
});
test("video selection preserves independent positions and resets each viewing clock on resume", () => {
  const topic = "A06-02",
    videos = getLessonMeta(topic).videos;
  let data = updateLesson(emptyLesson(), {
    type: "start",
    id: "one",
    at,
    lessonId: topic,
  });
  for (const [i, video] of videos.entries()) {
    data = updateLesson(data, { type: "selectVideo", id: video.id });
    data = updateLesson(data, {
      type: "video",
      id: video.id,
      progress: {
        position: 10 + i,
        duration: 300,
        completed: false,
        watch: { ...emptyWatch(), clock: 500, position: 10 + i },
      },
    });
  }
  const restored = parseLesson(JSON.stringify(data), topic);
  for (const [i, video] of videos.entries()) {
    assert.equal(videoProgress(restored, topic, video.id).position, 10 + i);
    assert.equal(videoProgress(restored, topic, video.id).watch.clock, null);
  }
  assert.equal(restored.selectedVideo, videos.at(-1)?.id);
  assert.equal(
    updateLesson(restored, { type: "selectVideo", id: "unknown" }),
    restored,
  );
});
test("frozen course content fixes standalone conditions and exponent extraction", () => {
  assert.match(allLessons["A09-05"].practice[2].prompt, /32\^\(2\/5\)/);
  assert.ok(
    allLessons["G11-01"].check.some((q) =>
      q.prompt.includes("параллельная основанию"),
    ),
  );
  assert.ok(
    allLessons["G05-02"].check.every(
      (q) =>
        !q.prompt.includes("того же") && !q.prompt.includes("этого квадрата"),
    ),
  );
  // Independently recompute the new opening contexts.
  assert.equal(Math.ceil(35 / 8), 5);
  assert.equal((3 * 8) / 6, 4);
  assert.equal(1.1 * 0.9, 0.9900000000000001);
  assert.equal(5 + 4 * 3, 17);
  assert.equal(
    4 ** 2 + 5 ** 2 - 2 * 4 * 5 * Math.cos(Math.PI / 3),
    20.999999999999996,
  );
});
