import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { course, emptyProgress, parseProgress } from "../src/course/model";
import { courseVideos } from "../src/course/videos";
import { trainerModules, modulePages } from "../src/course/trainer/modules";
import {
  moduleBank,
  trainerBank,
  questionById,
} from "../src/course/trainer/bank";
import {
  newTrainer,
  parseTrainer,
  reduceTrainer,
  sessionQuestion,
  TrainerState,
} from "../src/course/trainer/model";
import {
  moduleSetComplete,
  topicPractice,
  modulesCovered,
} from "../src/course/trainer/moduleProgress";
import { practiceSnapshots } from "../src/course/trainer/sharing";
function answer(topic: string, s: TrainerState, wrong = false) {
  const q = sessionQuestion(topic, s);
  const choice = wrong ? (q.correct + 1) % 4 : q.correct;
  return reduceTrainer(
    reduceTrainer(s, topic, { type: "select", choice }),
    topic,
    { type: "submit" },
  );
}
function complete(topic: string, s: TrainerState, count: number) {
  for (let i = 0; i < count; i++) {
    s = answer(topic, s);
    s = reduceTrainer(s, topic, { type: "next" });
  }
  return reduceTrainer(s, topic, { type: "finish" });
}
test("every existing video has a module with its own notes, relevant skills and four distinct choices", () => {
  for (const topic of course) {
    const modules = trainerModules(topic.id);
    assert.deepEqual(
      modules.filter((m) => m.videoId).map((m) => m.videoId),
      courseVideos[topic.id].items.map((v) => v.id),
    );
    assert.equal(new Set(modules.map((m) => m.id)).size, modules.length);
    const covered = new Set(modules.flatMap((m) => m.skills));
    for (const skill of trainerBank(topic.id).map((q) => q.skill!))
      assert.ok(covered.has(skill), `${topic.id}: missing original ${skill}`);
    for (const module of modules) {
      assert.ok(module.skills.length);
      assert.ok(
        module.videoId
          ? module.notes.length >= 2
          : modulePages(topic.id, module).length > 0,
        topic.id + module.title,
      );
      const bank = moduleBank(topic.id, module.skills);
      for (const skill of module.skills)
        assert.ok(
          bank.some((q) => q.skill === skill),
          `${topic.id} ${module.title}: ${skill}`,
        );
      for (const q of bank) {
        assert.equal(new Set(q.choices).size, 4, q.id);
        assert.ok(q.solution && q.hints.length);
        assert.ok(module.skills.includes(q.skill!));
      }
      let s = newTrainer(51, undefined, module.id);
      let count = 0;
      while (!moduleSetComplete(topic.id, s) && count++ < 120) {
        s = answer(topic.id, s);
        s = reduceTrainer(s, topic.id, { type: "next" });
      }
      assert.ok(
        count <= module.skills.length + 1,
        `${topic.id}: finite family set ${module.title}`,
      );
      assert.ok(!s.mastered);
    }
  }
});
test("module switch and reload preserve exact pending wrong choices and legacy history", () => {
  const topic = "G08-02",
    modules = trainerModules(topic);
  const legacy = answer(topic, newTrainer(31), true);
  const first = answer(topic, newTrainer(21, undefined, modules[0].id), true);
  const second = complete(topic, newTrainer(22, undefined, modules[1].id), 2);
  const p = {
    ...emptyProgress(),
    trainer: legacy,
    selectedModule: modules[1].id,
    trainerStage: "practice",
    modulePractice: { [modules[0].id]: first, [modules[1].id]: second },
  };
  const restored = parseProgress(JSON.stringify({ [topic]: p }))[topic];
  assert.deepEqual(restored.trainer, legacy);
  assert.deepEqual(restored.modulePractice?.[modules[0].id], first);
  assert.deepEqual(restored.modulePractice?.[modules[1].id], second);
  assert.equal(restored.selectedModule, modules[1].id);
  assert.equal(restored.trainerStage, "practice");
  assert.equal(
    sessionQuestion(topic, restored.modulePractice![modules[0].id]).id,
    sessionQuestion(topic, first).id,
  );
  assert.equal(
    parseTrainer({ ...first, moduleId: "unknown" }, topic),
    undefined,
  );
});
test("15 perfect answers in one narrow module cannot pass or sync topic as passed", () => {
  const topic = "G08-02",
    module = trainerModules(topic)[0];
  const session = complete(topic, newTrainer(9, undefined, module.id), 20);
  const p = {
    ...emptyProgress(),
    updatedAt: new Date().toISOString(),
    modulePractice: { [module.id]: session },
  };
  assert.ok(moduleSetComplete(topic, session));
  assert.ok(!session.mastered);
  assert.ok(!modulesCovered(topic, p));
  assert.ok(!topicPractice(topic, p)?.mastered);
  assert.equal(practiceSnapshots({ [topic]: p })[0].finished, false);
});
test("topic keeps 15 completed / 80% criterion and coverage; earned old mastery remains", () => {
  const topic = "G08-02",
    modules = trainerModules(topic),
    p = {
      ...emptyProgress(),
      modulePractice: {} as Record<string, TrainerState>,
    };
  for (const module of modules)
    p.modulePractice[module.id] = complete(
      topic,
      newTrainer(19, undefined, module.id),
      5,
    );
  assert.ok(modulesCovered(topic, p));
  assert.ok(topicPractice(topic, p)?.mastered);
  p.modulePractice[modules[0].id] = newTrainer(20, undefined, modules[0].id);
  assert.ok(!topicPractice(topic, p)?.mastered);
  assert.ok(
    topicPractice(topic, {
      ...p,
      trainer: { ...newTrainer(3), mastered: true },
    })?.mastered,
  );
  const s = newTrainer(55, undefined, modules[0].id);
  assert.equal(
    moduleSetComplete(topic, s),
    false,
    "watching a video is not practice",
  );
});

test("server module coverage catalog agrees with every lesson", () => {
  const migration = readFileSync(
    "supabase/migrations/20261030134428_trainer_module_snapshots.sql",
    "utf8",
  );
  const expected = JSON.parse(migration.match(/expected jsonb:='([^']+)'/)![1]);
  assert.deepEqual(
    expected,
    Object.fromEntries(course.map((t) => [t.id, trainerModules(t.id).length])),
  );
  for (const t of course)
    for (const m of trainerModules(t.id))
      for (const note of m.notes)
        assert.ok(note.endsWith("."), `${t.id}: broken statement ${note}`);
});

test("unknown saved question identifiers do not crash progress recommendations", () => {
  assert.equal(questionById("G05-01", "G99-99-generated-v3-line-0"), undefined);
  assert.equal(questionById("G05-01", "G05-01-module-v1-unknown-0"), undefined);
  assert.ok(questionById("G05-01", "G05-01-module-v1-line-0"));
});
