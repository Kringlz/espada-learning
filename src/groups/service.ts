import AsyncStorage from "@react-native-async-storage/async-storage";
import { backend, mode } from "../services/supabase";
import { LocalRepository } from "../services/repository";
import {
  applyStudyAnswer,
  applyStudyRead,
  groupSummary,
  GroupSummary,
  StudyLedger,
} from "./model";
export const groupLeagueEnabled =
  process.env.EXPO_PUBLIC_GROUP_LEAGUE_ENABLED === "true";
const demoKey = "espada.demo.study.v1";
let queue: Promise<unknown> = Promise.resolve();
const repository = new LocalRepository(AsyncStorage);
async function demo<T>(
  action: (ledger: StudyLedger) => Promise<{ ledger: StudyLedger; result: T }>,
) {
  const task = queue
    .catch(() => {})
    .then(async () => {
      const ledger = JSON.parse(
        (await AsyncStorage.getItem(demoKey)) ?? "{}",
      ) as StudyLedger;
      const next = await action(ledger);
      await AsyncStorage.setItem(demoKey, JSON.stringify(next.ledger));
      return next.result;
    });
  queue = task;
  return task;
}
async function requireDemoStudent(actorId: string) {
  const s = await repository.read();
  if (
    !s.profiles.some(
      (p) => p.id === actorId && p.active && p.role === "student",
    )
  )
    throw Error("Нет доступа ученика.");
}
async function rpc(name: string, args: Record<string, unknown>) {
  if (!backend) throw Error("Нет подключения к серверу.");
  const { data, error } = await backend.rpc(name, args);
  if (error)
    throw Error("Не удалось подтвердить данные группы. Попробуйте ещё раз.");
  return data;
}
export async function submitStudyAnswer(
  actorId: string,
  topicId: string,
  question: number,
  choice: number,
  requestId: string,
  readPages: number[] = [],
) {
  if (!groupLeagueEnabled) return null;
  if (mode === "supabase")
    return rpc("record_course_answer", {
      p_topic_id: topicId,
      p_question_no: question,
      p_choice: choice,
      p_request_id: requestId,
      p_read_pages: readPages,
    });
  await requireDemoStudent(actorId);
  return demo(async (ledger) =>
    applyStudyAnswer(
      readPages.reduce(
        (data, page) => applyStudyRead(data, actorId, topicId, page),
        ledger,
      ),
      actorId,
      topicId,
      question,
      choice,
      requestId,
      new Date().toISOString(),
    ),
  );
}
export async function submitStudyRead(
  actorId: string,
  topicId: string,
  page: number,
) {
  if (!groupLeagueEnabled) return;
  if (mode === "supabase") {
    await rpc("record_course_read", { p_topic_id: topicId, p_page_no: page });
    return;
  }
  await requireDemoStudent(actorId);
  await demo(async (ledger) => ({
    ledger: applyStudyRead(ledger, actorId, topicId, page),
    result: null,
  }));
}
export async function loadGroupSummary(
  actorId: string,
  groupId: string,
): Promise<GroupSummary> {
  if (mode === "supabase")
    return rpc("group_learning_summary", { p_class_id: groupId });
  return groupSummary(
    await repository.read(),
    actorId,
    groupId,
    JSON.parse((await AsyncStorage.getItem(demoKey)) ?? "{}"),
  );
}
