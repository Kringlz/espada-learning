import { backend } from "../services/supabase";
import { ArenaTopic, Leader, Room } from "./model";
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  if (!backend)
    throw Error(
      "Для игры на разных телефонах войди в учебный аккаунт вашей школы.",
    );
  // React Native's AbortSignal polyfill does not implement AbortSignal.timeout.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let response;
  try {
    response = await backend.rpc(name, args).abortSignal(controller.signal);
  } finally {
    clearTimeout(timer);
  }
  const { data, error } = response;
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883")
      throw Error(
        "Арена ещё не настроена. Попроси администратора подключить игровой режим.",
      );
    throw Error(
      error.message || "Не удалось связаться с ареной. Повтори попытку.",
    );
  }
  return data as T;
}
export const arenaService = {
  create: (group: string, topic: ArenaTopic) =>
    rpc<Room>("arena_create", { p_class: group, p_topic: topic }),
  join: (code: string) => rpc<Room>("arena_join", { p_code: code }),
  read: (id: string) => rpc<Room>("arena_snapshot", { p_room: id }),
  start: (id: string) => rpc<Room>("arena_start", { p_room: id }),
  cancel: (id: string) => rpc<Room>("arena_cancel", { p_room: id }),
  answer: (id: string, round: number, choice: number) =>
    rpc<Room>("arena_answer", { p_room: id, p_round: round, p_choice: choice }),
  leaders: (group: string) =>
    rpc<Leader[]>("arena_leaderboard", { p_class: group }),
};
