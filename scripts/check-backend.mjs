// Read-only checks: no users, rooms or messages are created.
import { existsSync } from "node:fs";
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error(
    "Укажите EXPO_PUBLIC_SUPABASE_URL и EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
  process.exit(1);
}
async function request(path, body) {
  const response = await fetch(new URL(path, url), {
    method: body ? "POST" : "GET",
    headers: { apikey: key, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  return { response, data };
}
try {
  const { response, data } = await request("/auth/v1/settings");
  if (!response.ok)
    throw Error(`Сервис входа недоступен: HTTP ${response.status}.`);
  console.log("Supabase: сервис входа доступен.");
  console.log(
    `Вход по почте: ${data.external?.email ? "включён" : "выключен"}.`,
  );
  const probe = await request("/rest/v1/rpc/arena_leaderboard", {
    p_class: "00000000-0000-0000-0000-000000000000",
  });
  if (probe.data?.code === "PGRST202") {
    throw Error(
      "Арена не установлена: примените supabase/migrations/010_math_arena.sql в существующем проекте.",
    );
  }
  // The RPC denies anonymous users; this is the expected response, not a login test.
  if (
    [401, 403].includes(probe.response.status) &&
    probe.data?.code === "42501"
  ) {
    console.log("Арена: функция доступна и защищена от анонимного доступа.");
    console.log("Далее проверьте матч с двумя аккаунтами одной группы.");
  } else {
    throw Error(
      `Неожиданный ответ арены: HTTP ${probe.response.status}, код ${probe.data?.code ?? "не указан"}. Проверьте права и миграции.`,
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
