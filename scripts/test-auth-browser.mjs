// Uses the real bundled Supabase SDK with intercepted HTTP responses and synthetic accounts.
// Never sends credentials to production. Requires a local build in Supabase mode.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, mkdir } from "node:fs/promises";
import { createSeed, demoStudentId } from "../src/data/seed.ts";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const base = process.env.AUTH_URL || "http://127.0.0.1:8105/";
const env = await readFile(new URL("../.env.local", import.meta.url), "utf8");
const api = env.match(/^EXPO_PUBLIC_SUPABASE_URL=["']?([^\s"']+)/m)[1];
const authKey = `sb-${new URL(api).hostname.split(".")[0]}-auth-token`;
const state = createSeed();
const first = state.profiles.find((p) => p.id === demoStudentId);
first.name = "Анна Тестовая";
const second = {
  ...first,
  id: "00000000-0000-4000-8000-000000000090",
  role: "parent",
};
state.profiles.push(second);
second.name = "Борис Тестовый";
const users = new Map();
const makeUser = (email, id) => ({
  id,
  email,
  aud: "authenticated",
  role: "authenticated",
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: "email" },
  user_metadata: {},
  identities: [],
  created_at: new Date().toISOString(),
});
users.set("anna@example.test", {
  user: makeUser("anna@example.test", first.id),
  password: " pass word ",
  confirmed: true,
});
users.set("boris@example.test", {
  user: makeUser("boris@example.test", second.id),
  password: "pass word2",
  confirmed: true,
});
const sessions = new Map();
let counter = 0,
  signupCalls = 0,
  refreshCalls = 0,
  failSignup = false,
  failUpdate = false,
  failLogout = false,
  failRead = false,
  failCommand = false;
let profileReady = false;
let recoveryEmail = "",
  recoveryUsed = false;
const bodies = [];
function token(user) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const jwt = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, exp, iat: exp - 3600, aud: "authenticated", role: "authenticated", email: user.email })).toString("base64url")}.testsignature`;
  const session = {
    access_token: jwt,
    refresh_token: `fixture-${++counter}`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: exp,
    user,
  };
  sessions.set(session.refresh_token, session);
  return session;
}
const errors = [];
const browser = await chromium.launch({ headless: true, channel: "chrome" });
await mkdir(new URL("../АРХИВ/проверки/auth/", import.meta.url), { recursive: true });
async function setup(context) {
  // All nonlocal requests are intercepted; unknown hosts cannot receive test data.
  await context.route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (url.origin === new URL(base).origin) return route.continue();
    if (url.origin !== new URL(api).origin) return route.abort();
    const body = req.postDataJSON() ?? {};
    const ok = (value, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(value),
      });
    const error = (code, status = 400) =>
      ok({ code, error_code: code, msg: code, message: code }, status);
    if (url.pathname.endsWith("/signup")) {
      signupCalls++;
      bodies.push(body);
      await new Promise((r) => setTimeout(r, 250));
      if (failSignup) return error("unexpected_failure", 503);
      users.set(body.email, {
        user: makeUser(body.email, first.id),
        password: body.password,
        confirmed: false,
      });
      return ok({
        user: { ...users.get(body.email).user, identities: [{ id: "email" }] },
        session: null,
      });
    }
    if (url.pathname.endsWith("/token")) {
      if (url.searchParams.get("grant_type") === "refresh_token") {
        refreshCalls++;
        const session = sessions.get(body.refresh_token);
        return session
          ? ok(token(session.user))
          : error("refresh_token_not_found");
      }
      const account = users.get(body.email);
      if (!account || account.password !== body.password)
        return error("invalid_credentials");
      if (!account.confirmed) return error("email_not_confirmed");
      return ok(token(account.user));
    }
    if (url.pathname.endsWith("/verify")) {
      const account = users.get(body.email);
      if (
        !account ||
        body.token !== "123456" ||
        (body.type === "recovery" &&
          (recoveryUsed || recoveryEmail !== body.email))
      )
        return error("otp_expired", 403);
      if (body.type === "recovery") recoveryUsed = true;
      else account.confirmed = true;
      return ok(token(account.user));
    }
    if (url.pathname.endsWith("/recover")) {
      recoveryEmail = body.email;
      recoveryUsed = false;
      return ok({});
    }
    if (url.pathname.endsWith("/resend")) return ok({});
    if (url.pathname.endsWith("/logout")) {
      return failLogout ? error("unexpected_failure", 503) : ok({});
    }
    const bearer = req.headers().authorization?.replace("Bearer ", "");
    const session = [...sessions.values()].find(
      (s) => s.access_token === bearer,
    );
    if (url.pathname.endsWith("/user")) {
      if (!session) return error("session_not_found", 401);
      if (req.method() === "PUT") {
        if (failUpdate) return error("unexpected_failure", 503);
        users.get(session.user.email).password = body.password;
      }
      return ok(session.user);
    }
    if (url.pathname.endsWith("/rpc/load_learning_state")) {
      if (session?.user.email === "new@example.test" && !profileReady)
        return ok(
          {
            message: "Your session has expired or your account is disabled.",
            code: "P0001",
          },
          400,
        );
      if (failRead) return error("temporary_failure", 503);
      return ok(state);
    }
    if (url.pathname.endsWith("/profiles")) return ok([]);
    if (url.pathname.endsWith("/rpc/register_profile")) {
      profileReady = true;
      return ok(null);
    }
    if (url.pathname.endsWith("/rpc/learning_command"))
      return failCommand ? error("temporary_failure", 503) : ok(null);
    return error("unexpected_fixture_request", 404);
  });
  context.on("page", (page) =>
    page.on("pageerror", (e) => errors.push(e.message)),
  );
}
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await setup(ctx);
const page = await ctx.newPage();
const field = (name) => page.getByRole("textbox", { name, exact: true });
const input = (name) => page.getByLabel(name, { exact: true });
const button = (name) => page.getByRole("button", { name, exact: true });
const waitLogin = () => button("Войти").waitFor();
async function login(email, password, remember = false) {
  await waitLogin();
  await input("Почта").fill(email);
  await input("Пароль").fill(password);
  if (
    (await page.getByRole("checkbox").getAttribute("aria-checked")) !==
    String(remember)
  )
    await page.getByRole("checkbox").click();
  await input("Пароль").press("Enter");
}
async function profile() {
  if (await button("Профиль").isVisible()) {
    await button("Профиль").click();
    await button("Выйти").waitFor();
    return;
  }
  await page
    .frameLocator('iframe[title^="Вселенная"]')
    .getByRole("button", { name: "Открыть профиль", exact: true })
    .click();
  await button("Выйти").waitFor();
}
async function logout() {
  await profile();
  await button("Выйти").click();
  await waitLogin();
}
try {
  await page.goto(base);
  await waitLogin();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: new URL(`../АРХИВ/проверки/auth/auth-login-${width}.png`, import.meta.url)
        .pathname,
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await input("Пароль").getAttribute("autocomplete"),
    "current-password",
  );
  assert.equal(await input("Почта").getAttribute("type"), "email");
  await input("Почта").fill(" anna@example.test ");
  await input("Почта").press("Enter");
  assert.equal(
    await input("Пароль").evaluate((el) => el === document.activeElement),
    true,
  );
  await input("Пароль").fill("wrong");
  await input("Пароль").press("Enter");
  await page.getByText("Неверная почта или пароль.", { exact: true }).waitFor();
  await button("Создать аккаунт").click();
  await input("Имя").fill("Новая Анна");
  await input("Почта").fill("new@example.test");
  assert.equal(
    await input("Пароль").getAttribute("autocomplete"),
    "new-password",
  );
  assert.equal(
    await input("Повтор пароля").getAttribute("autocomplete"),
    "new-password",
  );
  await input("Пароль").fill(" valid pass ");
  await input("Повтор пароля").fill(" v");
  assert.equal(
    await page.getByText("Пароли не совпадают", { exact: true }).count(),
    0,
  );
  assert.equal(await input("Код группы").count(), 0);
  await input("Имя").click();
  await page.getByText("Пароли не совпадают", { exact: true }).waitFor();
  await button("Создать аккаунт").click();
  assert.equal(signupCalls, 0);
  await input("Повтор пароля").fill(" valid pass ");
  assert.equal(
    await page.getByText("Пароли не совпадают", { exact: true }).count(),
    0,
  );
  await button("Показать: пароль").click();
  assert.equal(await input("Пароль").evaluate((el) => el.type), "text");
  await button("Скрыть: пароль").click();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: new URL(`../АРХИВ/проверки/auth/auth-register-${width}.png`, import.meta.url)
        .pathname,
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
  }
  await input("Пароль").fill("short");
  await input("Повтор пароля").fill("short");
  await button("Создать аккаунт").click();
  assert.equal(signupCalls, 0);
  assert.equal(await input("Пароль").getAttribute("aria-invalid"), "true");
  await input("Пароль").fill(" valid pass ");
  await input("Повтор пароля").fill(" valid pass ");
  failSignup = true;
  await button("Создать аккаунт").click();
  await page.getByRole("alert").waitFor();
  assert.equal(await input("Пароль").inputValue(), " valid pass ");
  assert.equal(await input("Повтор пароля").inputValue(), " valid pass ");
  failSignup = false;
  const before = signupCalls;
  await button("Создать аккаунт").dblclick();
  await input("Код из письма").waitFor();
  assert.equal(signupCalls, before + 1);
  assert.equal(bodies.at(-1).password, " valid pass ");
  assert.ok(!JSON.stringify(bodies.at(-1)).includes("repeat"));
  const stores = await page.evaluate(() =>
    JSON.stringify({ ...localStorage, ...sessionStorage }),
  );
  assert.ok(!stores.includes(" valid pass "));
  await page.reload();
  await input("Код из письма").waitFor();
  await input("Код из письма").fill("000000");
  await button("Подтвердить").click();
  await page
    .getByText("Код неверный или устарел. Запросите новый.", { exact: true })
    .waitFor();
  await input("Код из письма").fill("123456");
  await input("Код из письма").press("Enter");
  await page.locator('iframe[title^="Вселенная"]').waitFor();
  console.log(
    "PASS registration, confirmation, no password storage, repeat click, keyboard, 320/390/1440",
  );
  await logout();
  failRead = true;
  await login("anna@example.test", " pass word ", false);
  await button("Повторить").waitFor();
  assert.equal(await button("Ученик").count(), 0);
  failRead = false;
  await button("Повторить").click();
  await page.locator('iframe[title^="Вселенная"]').waitFor();
  assert.equal(
    await page.evaluate((k) => localStorage.getItem(k), authKey),
    null,
  );
  assert.ok(await page.evaluate((k) => sessionStorage.getItem(k), authKey));
  await page.reload();
  await page.locator('iframe[title^="Вселенная"]').waitFor();
  const separate = await ctx.newPage();
  await separate.goto(base);
  await separate.getByRole("button", { name: "Войти", exact: true }).waitFor();
  await separate.close();
  console.log("PASS temporary session reload and fresh tab");
  // Unsent study work is retained and blocks a destructive account transition.
  await page.evaluate(
    ({ id }) =>
      sessionStorage.setItem(
        `espada.pending.${id}`,
        JSON.stringify([
          { type: "saveVideoPosition", videoId: "fixture", position: 12 },
        ]),
      ),
    { id: first.id },
  );
  await page.reload();
  await button("Профиль").waitFor();
  await profile();
  failCommand = true;
  await button("Выйти").click();
  await page
    .getByText(
      "Не удалось отправить учебные данные. Проверьте соединение и повторите выход.",
      { exact: true },
    )
    .waitFor();
  assert.ok(
    await page.evaluate(
      (id) => sessionStorage.getItem(`espada.pending.${id}`),
      first.id,
    ),
  );
  failCommand = false;
  await button("Выйти").click();
  await waitLogin();
  assert.equal(
    await page.evaluate(
      (id) => sessionStorage.getItem(`espada.pending.${id}`),
      first.id,
    ),
    null,
  );
  console.log("PASS pending work survives failed logout and flushes on retry");
  await login("anna@example.test", " pass word ", true);
  await page.locator('iframe[title^="Вселенная"]').waitFor();
  assert.ok(await page.evaluate((k) => localStorage.getItem(k), authKey));
  assert.equal(
    await page.evaluate((k) => sessionStorage.getItem(k), authKey),
    null,
  );
  const reopened = await ctx.newPage();
  await reopened.goto(base);
  await reopened.locator('iframe[title^="Вселенная"]').waitFor();
  await reopened.close();
  // Expire only the synthetic token to force SDK refresh on reload.
  await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k));
    s.expires_at = 1;
    localStorage.setItem(k, JSON.stringify(s));
  }, authKey);
  await page.reload();
  await page.locator('iframe[title^="Вселенная"]').waitFor();
  assert.ok(refreshCalls > 0);
  console.log("PASS remembered reopen and expired access-token refresh");
  const restart = await browser.newContext({
    storageState: await ctx.storageState(),
  });
  await setup(restart);
  const restored = await restart.newPage();
  await restored.goto(base);
  await restored.locator('iframe[title^="Вселенная"]').waitFor();
  await restart.close();
  console.log(
    "PASS remembered login in a fresh browser context with restored durable storage",
  );
  await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k));
    s.expires_at = 1;
    s.refresh_token = "revoked";
    localStorage.setItem(k, JSON.stringify(s));
  }, authKey);
  await page.reload();
  await waitLogin();
  assert.equal(
    await page.evaluate((k) => localStorage.getItem(k), authKey),
    null,
  );
  await login("anna@example.test", " pass word ", true);
  await page.locator('iframe[title^="Вселенная"]').waitFor();
  console.log("PASS revoked refresh token clears signed-in view");
  await logout();
  assert.equal(
    await page.evaluate((k) => localStorage.getItem(k), authKey),
    null,
  );
  await login("boris@example.test", "pass word2", false);
  await button("Открыть профиль").click();
  await page.getByText("Борис Тестовый", { exact: true }).first().waitFor();
  assert.equal(
    await page.getByText("Анна Тестовая", { exact: true }).count(),
    0,
  );
  console.log("PASS account role routing and previous data isolation");
  // Parent profile entry differs; reload blank storage to begin recovery in clean isolated context.
  await ctx.close();
  const c2 = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await setup(c2);
  const p2 = await c2.newPage();
  await p2.goto(base);
  const b2 = (name) => p2.getByRole("button", { name, exact: true }),
    i2 = (name) => p2.getByLabel(name, { exact: true });
  await b2("Забыли пароль?").click();
  await i2("Почта").fill("anna@example.test");
  await i2("Почта").press("Enter");
  await i2("Код из письма").fill("123456");
  await b2("Подтвердить").click();
  await i2("Новый пароль").waitFor();
  await p2.reload();
  await i2("Новый пароль").waitFor();
  await i2("Новый пароль").fill(" new pass ");
  await i2("Повтор пароля").fill("bad");
  await b2("Сохранить пароль").click();
  await p2.getByText("Пароли не совпадают", { exact: true }).waitFor();
  await i2("Повтор пароля").fill(" new pass ");
  failUpdate = true;
  await b2("Сохранить пароль").click();
  await p2.getByRole("alert").waitFor();
  assert.equal(await i2("Новый пароль").inputValue(), " new pass ");
  failUpdate = false;
  await b2("Сохранить пароль").click();
  await b2("Войти").waitFor();
  await i2("Почта").fill("anna@example.test");
  await i2("Пароль").fill(" new pass ");
  await b2("Войти").click();
  await p2.locator('iframe[title^="Вселенная"]').waitFor();
  console.log(
    "PASS recovery OTP, reload, mismatch, network retry, new-password login",
  );
  // Server logout failure must still remove this device's saved login.
  await p2
    .frameLocator('iframe[title^="Вселенная"]')
    .getByRole("button", { name: "Открыть профиль", exact: true })
    .click();
  failLogout = true;
  await b2("Выйти").click();
  await b2("Войти").waitFor();
  failLogout = false;
  assert.equal(
    await p2.evaluate(
      (k) => localStorage.getItem(k) || sessionStorage.getItem(k),
      authKey,
    ),
    null,
  );
  console.log("PASS local logout even when server is unavailable");
  await c2.close();
  const c3 = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await setup(c3);
  const p3 = await c3.newPage();
  const linkSession = token(users.get("anna@example.test").user);
  const callback = new URLSearchParams({
    access_token: linkSession.access_token,
    refresh_token: linkSession.refresh_token,
    type: "recovery",
    token_type: "bearer",
    expires_in: "3600",
    expires_at: String(linkSession.expires_at),
  });
  await p3.goto(`${base}#${callback}`);
  await p3.getByLabel("Новый пароль", { exact: true }).waitFor();
  assert.ok(!p3.url().includes("access_token"));
  await p3.reload();
  await p3.getByLabel("Новый пароль", { exact: true }).waitFor();
  for (const width of [320, 390, 1440]) {
    await p3.setViewportSize({ width, height: 900 });
    await p3.screenshot({
      path: new URL(`../АРХИВ/проверки/auth/auth-reset-${width}.png`, import.meta.url)
        .pathname,
      fullPage: true,
    });
    assert.equal(
      await p3.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
  }
  console.log(
    "PASS SDK recovery link, URL cleanup, reload and reset form layouts",
  );
  await c3.close();
  const c4 = await browser.newContext();
  await setup(c4);
  const p4 = await c4.newPage();
  await p4.goto(
    `${base}#error=access_denied&error_code=otp_expired&error_description=Expired`,
  );
  await p4
    .getByText(
      "Не удалось открыть ссылку. Запросите новое письмо и попробуйте снова.",
      { exact: true },
    )
    .waitFor();
  await p4.getByRole("button", { name: "Войти", exact: true }).waitFor();
  console.log(
    "PASS expired/reused link response remains signed out with a concise error",
  );
  await c4.close();
  const c5 = await browser.newContext();
  await setup(c5);
  const p5 = await c5.newPage();
  await p5.goto(base);
  await p5.getByLabel("Почта", { exact: true }).fill("anna@example.test");
  await p5.getByLabel("Пароль", { exact: true }).fill(" new pass ");
  await p5.getByRole("button", { name: "Войти", exact: true }).click();
  await p5.locator('iframe[title^="Вселенная"]').waitFor();
  const tempSession = await p5.evaluate(
    (k) => sessionStorage.getItem(k),
    authKey,
  );
  const otherTab = await c5.newPage();
  await otherTab.goto(base);
  await otherTab.getByRole("button", { name: "Войти", exact: true }).waitFor();
  // Models a duplicated/restored browser tab, which may inherit sessionStorage.
  await otherTab.evaluate(
    ({ key, value }) => sessionStorage.setItem(key, value),
    { key: authKey, value: tempSession },
  );
  await otherTab.reload();
  await otherTab.locator('iframe[title^="Вселенная"]').waitFor();
  await p5
    .frameLocator('iframe[title^="Вселенная"]')
    .getByRole("button", { name: "Открыть профиль", exact: true })
    .click();
  await p5.getByRole("button", { name: "Выйти", exact: true }).click();
  await otherTab.getByRole("button", { name: "Войти", exact: true }).waitFor();
  assert.equal(
    await otherTab.evaluate((k) => sessionStorage.getItem(k), authKey),
    null,
  );
  await otherTab.reload();
  await otherTab.getByRole("button", { name: "Войти", exact: true }).waitFor();
  await c5.close();
  console.log(
    "PASS cross-tab logout clears duplicated temporary storage and survives reload",
  );
  assert.deepEqual(errors, []);
  console.log("PASS no uncaught browser errors");
} catch (e) {
  await page
    .screenshot({
      path: new URL("../АРХИВ/проверки/auth/auth-failure.png", import.meta.url).pathname,
      fullPage: true,
    })
    .catch(() => {});
  throw e;
} finally {
  await browser.close();
}
