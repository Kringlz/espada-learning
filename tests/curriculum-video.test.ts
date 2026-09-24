import test from "node:test";
import assert from "node:assert/strict";
import { createSeed } from "../src/data/seed";
import { englishCurriculum } from "../src/data/legacyEnglish";
import { curriculum } from "../src/data/curriculum";
import { upgradeCurriculum } from "../src/data/upgrade";
import { sections } from "../src/data/outline";
import { applyCommand, estimate, recommendations } from "../src/core/engine";
import { fixedId as id } from "../src/core/ids";
import { VideoLesson, Activity } from "../src/core/types";
import { MAX_VIDEO_BYTES, validateVideoFile } from "../src/core/video";
import { LocalRepository, STORAGE_KEY } from "../src/services/repository";
const video: VideoLesson = {
  id: id(300),
  title: "Разряды чисел",
  fileName: "lesson.mp4",
  mimeType: "video/mp4",
  size: 1024,
  storage: "local",
  storageKey: `${id(3)}/place-value/${id(300)}.mp4`,
  uploadedBy: id(3),
  uploadedAt: "2026-09-24T00:00:00.000Z",
};
const activity: Activity = {
  id: id(301),
  studentId: id(1),
  topicId: "place-value",
  stage: "lesson",
  answers: {},
  questionIds: [],
  attemptId: id(302),
  videoSeconds: 0,
  updatedAt: "2026-09-24T00:00:00.000Z",
};
test("PDF outline contains all 108 topics in 22 ordered sections with stable original IDs", () => {
  assert.equal(sections.length, 22);
  const outlined = curriculum.filter((t) => t.sectionId);
  assert.equal(outlined.length, 108);
  assert.equal(new Set(curriculum.map((t) => t.id)).size, curriculum.length);
  assert.deepEqual(
    outlined.map((t) => t.order),
    Array.from({ length: 108 }, (_, i) => i + 1),
  );
  for (const s of sections) {
    const rows = outlined.filter((t) => t.sectionId === s.id);
    assert.deepEqual(
      rows.map((t) => t.title),
      s.titles,
    );
  }
  assert.equal(outlined.find((t) => t.order === 23)?.id, "equivalent");
  for (const t of curriculum)
    for (const p of t.prerequisites)
      assert.ok(curriculum.some((x) => x.id === p));
  assert.ok(
    recommendations(createSeed(), id(2)).every(
      (r) => curriculum.find((t) => t.id === r.topicId)!.checks.length >= 3,
    ),
  );
});
test("Russian upgrade preserves authored content, evidence, scores, choice indices and media", () => {
  const before = createSeed();
  delete before.curriculumVersion;
  before.topics = JSON.parse(JSON.stringify(englishCurriculum));
  before.topics[0].lesson = "Авторский урок";
  before.topics[0].videos = [video];
  before.activities = [activity];
  const next = upgradeCurriculum(before);
  assert.equal(next.topics.filter((t) => t.sectionId).length, 108);
  assert.equal(next.topics[0].lesson, "Авторский урок");
  assert.deepEqual(next.topics[0].videos, [video]);
  assert.deepEqual(next.assessments, before.assessments);
  assert.deepEqual(next.activities, before.activities);
  for (const old of before.topics)
    for (const q of old.checks)
      assert.equal(
        next.topics
          .find((t) => t.id === old.id)!
          .checks.find((x) => x.id === q.id)!.answer,
        q.answer,
      );
  assert.match(next.topics.find((t) => t.id === "equivalent")!.lesson, /Дробь/);
  assert.strictEqual(upgradeCurriculum(next), next);
  assert.equal(before.topics.length, 12);
});
test("only staff can attach valid videos, retries are idempotent, estimates unchanged", () => {
  const s = createSeed();
  const cmd = { type: "attachVideo" as const, topicId: "place-value", video };
  assert.throws(() => applyCommand(s, id(1), cmd));
  for (const patch of [
    { size: MAX_VIDEO_BYTES + 1 },
    { uploadedBy: id(4) },
    { storageKey: "other/file.mp4" },
    { title: "" },
    { mimeType: "text/html" },
  ])
    assert.throws(() =>
      applyCommand(s, id(3), {
        ...cmd,
        video: { ...video, ...patch } as VideoLesson,
      }),
    );
  const n = applyCommand(s, id(3), cmd);
  const retry = applyCommand(n, id(3), cmd);
  assert.equal(
    retry.topics.find((t) => t.id === "place-value")!.videos!.length,
    1,
  );
  assert.equal(retry.audit.length, 1);
  const comparisonTime = new Date();
  assert.deepEqual(
    estimate(retry, id(1), "place-value", comparisonTime),
    estimate(s, id(1), "place-value", comparisonTime),
  );
  assert.deepEqual(retry.assessments, s.assessments);
  assert.throws(() =>
    applyCommand(n, id(3), {
      ...cmd,
      video: { ...video, title: "Другой урок" },
    }),
  );
});
test("video resume updates only own playback position and cannot regress practice stage", () => {
  let s = applyCommand(createSeed(), id(3), {
    type: "attachVideo",
    topicId: "place-value",
    video,
  });
  s = applyCommand(s, id(1), { type: "saveActivity", activity });
  const position = {
    type: "saveVideoPosition" as const,
    studentId: id(1),
    topicId: "place-value",
    videoId: video.id,
    seconds: 12.5,
  };
  assert.throws(() => applyCommand(s, id(2), position));
  assert.throws(() => applyCommand(s, id(3), position));
  assert.throws(() => applyCommand(s, id(1), { ...position, seconds: -1 }));
  assert.throws(() =>
    applyCommand(s, id(1), { ...position, videoId: "unknown" }),
  );
  s = applyCommand(s, id(1), position);
  s = applyCommand(s, id(1), {
    type: "saveActivity",
    activity: { ...activity, stage: "practice" },
  });
  assert.equal(s.activities[0].videoPositions![video.id], 12.5);
  s = applyCommand(s, id(1), { ...position, seconds: 18 });
  assert.equal(s.activities[0].stage, "practice");
  assert.equal(s.attempts.length, 0);
});
test("curriculum migration, video attachment and playback survive repository restart", async () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: async (k: string) => data.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      data.set(k, v);
    },
  };
  const old = createSeed();
  delete old.curriculumVersion;
  old.topics = JSON.parse(JSON.stringify(englishCurriculum));
  data.set(STORAGE_KEY, JSON.stringify(old));
  const repo = new LocalRepository(storage);
  await repo.dispatch(id(3), {
    type: "attachVideo",
    topicId: "place-value",
    video,
  });
  await repo.dispatch(id(1), { type: "saveActivity", activity });
  await repo.dispatch(id(1), {
    type: "saveVideoPosition",
    studentId: id(1),
    topicId: "place-value",
    videoId: video.id,
    seconds: 11,
  });
  const read = await new LocalRepository(storage).read();
  assert.equal(read.curriculumVersion, 2);
  assert.equal(read.activities[0].videoPositions![video.id], 11);
  assert.equal(
    read.topics.find((t) => t.id === "place-value")!.videos![0].id,
    video.id,
  );
});
test("video file validation accepts MP4 within limit, rejects empty/oversize/wrong formats", () => {
  validateVideoFile("Урок.MP4", MAX_VIDEO_BYTES, "video/mp4");
  for (const [name, size, mime] of [
    ["x.mov", 100, "video/quicktime"],
    ["x.mp4", 0, "video/mp4"],
    ["x.mp4", MAX_VIDEO_BYTES + 1, "video/mp4"],
    ["x.mp4", 100, "text/html"],
  ] as const)
    assert.throws(() => validateVideoFile(name, size, mime));
});
