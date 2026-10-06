import { State, Topic } from "../core/types";
import { curriculum, originalCurriculum } from "./curriculum";
import { englishCurriculum } from "./legacyEnglish";
import { translate } from "../i18n";
import { generateUniqueCode } from "../core/ids";
/** Backfills human-readable codes for records saved before self-service registration shipped. */
export function upgradeCodes(state: State): State {
  if (
    state.profiles.every((p) => p.code) &&
    state.classes.every((c) => c.joinCode)
  )
    return state;
  const next: State = JSON.parse(JSON.stringify(state));
  for (const p of next.profiles)
    if (!p.code) p.code = generateUniqueCode(next.profiles.map((x) => x.code));
  for (const c of next.classes) {
    if (!c.joinCode)
      c.joinCode = generateUniqueCode(next.classes.map((x) => x.joinCode));
    c.schedule ??= "";
  }
  return next;
}
/** Change seeded copy only; preserve authored text, evidence, IDs and videos. */
export function upgradeCurriculum(state: State): State {
  if ((state.curriculumVersion ?? 0) >= 2) return state;
  const next: State = JSON.parse(JSON.stringify(state));
  next.topics = next.topics.map((topic) => {
    const en = englishCurriculum.find((t) => t.id === topic.id);
    const ru = originalCurriculum.find((t) => t.id === topic.id);
    const outlined = curriculum.find((t) => t.id === topic.id);
    if (!en || !ru || !outlined) return topic;
    const result = {
      ...topic,
      sectionId: outlined.sectionId,
      order: outlined.order,
    };
    for (const key of ["title", "objective", "lesson", "example"] as const)
      if (topic[key] === en[key])
        result[key] = key === "title" ? outlined.title : ru[key];
    function localizeQuestion(q: NonNullable<Topic["practice"]>) {
      const old = [en!.practice, ...en!.checks].find((x) => x?.id === q.id);
      const translated = [ru!.practice, ...ru!.checks].find(
        (x) => x?.id === q.id,
      );
      if (!old || !translated) return q;
      const updated = { ...q };
      for (const key of ["prompt", "hint", "explanation"] as const)
        if (q[key] === old[key]) updated[key] = translated[key];
      if (JSON.stringify(q.choices) === JSON.stringify(old.choices))
        updated.choices = translated.choices;
      return updated;
    }
    result.checks = topic.checks.map(localizeQuestion);
    if (topic.practice) result.practice = localizeQuestion(topic.practice);
    return result;
  });
  for (const topic of curriculum)
    if (!next.topics.some((t) => t.id === topic.id))
      next.topics.push(JSON.parse(JSON.stringify(topic)));
  next.curriculumVersion = 2;
  // These are known demo names only. Real or user-edited names stay unchanged.
  for (const p of next.profiles) p.name = translate(p.name);
  for (const c of next.classes) c.name = translate(c.name);
  for (const t of next.templates) {
    t.name = translate(t.name);
    t.level = translate(t.level);
    for (const q of t.questions) q.rubric = translate(q.rubric);
  }
  for (const a of next.assignments) a.reason = translate(a.reason);
  return next;
}
