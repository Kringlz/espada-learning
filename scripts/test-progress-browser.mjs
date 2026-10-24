import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { check, practice, opening } from "../src/course/videoLesson/content.ts";
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_PATH ||
    "/Users/skebobr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const workTitle = `ТЕСТ · Школьная контрольная ${Date.now()}`;
const base = "http://127.0.0.1:8104/",
  out = new URL("../АРХИВ/проверки/progress/", import.meta.url).pathname;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" }),
  errors = [];
const actor = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function session(n, width = 390) {
  const c = await browser.newContext({ viewport: { width, height: 900 } });
  await c.addInitScript((id) => {
    if (location.origin === "http://127.0.0.1:8104")
      localStorage.setItem("espada.actor", id);
  }, actor(n));
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  return { c, p };
}
const button = (p, name) => p.getByRole("button", { name, exact: true });
async function read(p, n = 1, as = 1) {
  return p.evaluate(
    async ({ id, who }) => {
      const r = await fetch("http://127.0.0.1:55434/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Preview-Actor": who },
        body: JSON.stringify({
          name: "progress_read",
          args: { p_student: id },
        }),
      });
      return { status: r.status, ...(await r.json()) };
    },
    { id: actor(n), who: actor(as) },
  );
}
async function noOverflow(p, testId) {
  const bad = await p.getByTestId(testId).evaluate((el) =>
    [...el.querySelectorAll("*")]
      .filter((n) => {
        if (n.closest('[aria-hidden="true"]')) return false;
        const b = n.getBoundingClientRect();
        return b.width && b.height && (b.left < -1 || b.right > innerWidth + 1);
      })
      .map((n) => n.textContent.slice(0, 70))
      .slice(0, 5),
  );
  assert.deepEqual(bad, []);
}
async function saved(p) {
  await p.getByText("Сохранено на сервере", { exact: true }).waitFor();
}
try {
  const s = await session(1);
  await s.p.goto(base + "#/lesson/G08-02");
  await s.p.getByTestId("video-lesson").waitFor();
  await saved(s.p);
  if (await button(s.p, "Пройти ещё раз").count())
    await button(s.p, "Пройти ещё раз").click();
  await s.p
    .getByRole("radio", { name: opening.choices[0], exact: true })
    .click();
  await button(s.p, "Ответить").click();
  await button(s.p, "Смотреть видео").click();
  await button(s.p, "Далее").click();
  let offline = false;
  await s.p.route("**/rpc", async (route) => {
    if (offline) await route.abort("internetdisconnected");
    else await route.continue();
  });
  for (let i = 0; i < practice.length; i++) {
    const q = practice[i];
    await s.p.getByRole("heading", { name: q.prompt, exact: true }).waitFor();
    if (i === 0) {
      offline = true;
      await button(s.p, "Подсказка").click();
    }
    await s.p
      .getByRole("radio", { name: q.choices[q.correct], exact: true })
      .click();
    await button(s.p, "Проверить").click();
    if (i === 0) {
      await s.p.getByText(/Синхронизация не подтверждена/).waitFor();
      await s.p.reload();
      await s.p.getByText(q.solution, { exact: true }).waitFor();
      offline = false;
      await button(s.p, "Повторить сохранение").click();
      await saved(s.p);
    }
    await button(
      s.p,
      i === practice.length - 1 ? "Завершить" : "Далее",
    ).click();
  }
  await s.p
    .getByRole("radio", { name: opening.choices[opening.correct], exact: true })
    .click();
  await button(s.p, "Ответить").click();
  await button(s.p, "К проверке").click();
  for (let i = 0; i < check.length; i++) {
    const q = check[i];
    await s.p.getByRole("heading", { name: q.prompt, exact: true }).waitFor();
    assert.equal(await button(s.p, "Подсказка").count(), 0);
    await s.p
      .getByRole("radio", {
        name: q.choices[i < 7 ? q.correct : (q.correct + 1) % q.choices.length],
        exact: true,
      })
      .click();
    if (i < check.length - 1) await button(s.p, "Далее").click();
  }
  await button(s.p, "Завершить").click();
  await saved(s.p);
  await s.p.getByText("7 из 10 · Проверка пройдена", { exact: true }).waitFor();
  const studentData = (await read(s.p)).data;
  const last = studentData.runs.sort((a, b) =>
    b.run.startedAt.localeCompare(a.run.startedAt),
  )[0];
  assert.equal(last.correct, 7);
  assert.equal(last.run.hints[practice[0].id], 1);
  assert.ok(last.run.initial && last.run.revisited);
  console.log(
    "✓ student completed lesson, hint and offline reload retained; server score 7/10",
  );
  const second = await session(1);
  await second.p.goto(base + "#/lesson/G08-02");
  await second.p
    .getByText("7 из 10 · Проверка пройдена", { exact: true })
    .waitFor();
  await saved(second.p);
  console.log("✓ fresh student browser restores completed result");
  const parent = await session(450);
  await parent.p.goto(base);
  await parent.p.getByTestId("student-progress").waitFor();
  assert.ok(
    (await read(parent.p, 1, 450)).data.runs.some(
      (r) => r.id === last.id && r.correct === 7,
    ),
  );
  const teacher = await session(3, 1440);
  await teacher.p.goto(base);
  await teacher.p.getByTestId("group-progress").waitFor();
  await teacher.p
    .getByText("Теорема Пифагора · 7/10", { exact: true })
    .waitFor();
  console.log(
    "✓ parent and teacher independent browsers see same server attempt",
  );
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSWQAAAAASUVORK5CYII=",
    "base64",
  );
  let uploadFail = true;
  await parent.p.route("**/file?*", async (route) => {
    if (route.request().method() === "POST" && uploadFail)
      await route.abort("failed");
    else await route.continue();
  });
  for (const [date, score] of [
    ["2026-10-14", "12"],
    ["2026-10-22", "16"],
  ]) {
    await button(parent.p, "Добавить результат").click();
    const f = parent.p.getByTestId("school-work-form");
    await f
      .getByRole("textbox", { name: "Дата · ГГГГ-ММ-ДД", exact: true })
      .fill(date);
    await f
      .getByRole("textbox", { name: "Название работы", exact: true })
      .fill(workTitle);
    await f
      .getByRole("textbox", { name: "Темы через запятую", exact: true })
      .fill("Теорема Пифагора");
    await f
      .getByRole("textbox", { name: "Набрано баллов", exact: true })
      .fill(score);
    await f
      .getByRole("textbox", { name: "Максимум баллов", exact: true })
      .fill("20");
    if (score === "16") {
      const chooserPromise = parent.p.waitForEvent("filechooser");
      await button(parent.p, "Прикрепить фото или PDF").click();
      const chooser = await chooserPromise;
      await chooser.setFiles({
        name: "test-checked-work.png",
        mimeType: "image/png",
        buffer: png,
      });
      await button(parent.p, "Сохранить результат").click();
      await parent.p.getByText(/Сохранение не подтверждено/).waitFor();
      assert.equal(
        (await read(parent.p, 1, 450)).data.works.filter(
          (w) => w.title === workTitle,
        ).length,
        1,
      );
      uploadFail = false;
      await parent.p.screenshot({ path: out + "attachment-error.png" });
      await button(parent.p, "Повторить сохранение").click();
    } else await button(parent.p, "Сохранить результат").click();
    await f.waitFor({ state: "detached" });
    await parent.p.getByTestId("student-progress").waitFor();
  }
  const works = (await read(parent.p, 1, 450)).data.works;
  const attached = works.find((w) => w.attachment && w.title === workTitle);
  assert.ok(attached);
  assert.equal(attached.source, "Внесено родителем");
  const fileStatus = await parent.p.evaluate(
    async ({ path, good, bad }) => {
      const url =
        "http://127.0.0.1:55434/file?path=" + encodeURIComponent(path);
      return Promise.all(
        [good, bad].map(
          async (a) =>
            (await fetch(url, { headers: { "X-Preview-Actor": a } })).status,
        ),
      );
    },
    { path: attached.attachment, good: actor(450), bad: actor(5) },
  );
  assert.deepEqual(fileStatus, [200, 403]);
  assert.equal((await read(parent.p, 1, 5)).status, 400);
  console.log(
    "✓ external work upload retry, parent source, private file and unauthorized HTTP denial",
  );
  await parent.p
    .getByTestId(`school-work-${attached.id}`)
    .getByRole("button", { name: "Исправить", exact: true })
    .click();
  await parent.p
    .getByRole("textbox", { name: "Набрано баллов", exact: true })
    .fill("17");
  await button(parent.p, "Сохранить результат").click();
  await parent.p.getByTestId("school-work-form").waitFor({ state: "detached" });
  await parent.p.getByTestId("student-progress").waitFor();
  assert.ok(
    (await read(parent.p, 1, 450)).data.audit.some(
      (a) => a.before?.score === 16 && a.after?.score === 17,
    ),
  );
  for (const width of [320, 390, 1440]) {
    await parent.p.setViewportSize({ width, height: 1000 });
    await parent.p.getByTestId("student-progress").waitFor();
    await noOverflow(parent.p, "student-progress");
    await parent.p.screenshot({ path: out + `parent-${width}.png` });
    await teacher.p.setViewportSize({ width, height: 1000 });
    await teacher.p
      .getByText("Теорема Пифагора · 7/10", { exact: true })
      .waitFor();
    await noOverflow(teacher.p, "group-progress");
    await teacher.p.screenshot({ path: out + `teacher-${width}.png` });
    await button(parent.p, "Добавить результат").click();
    await noOverflow(parent.p, "school-work-form");
    await parent.p.getByTestId("school-work-form").scrollIntoViewIfNeeded();
    await parent.p.screenshot({ path: out + `form-${width}.png` });
    await button(parent.p, "Отмена").click();
  }
  await parent.p.setViewportSize({ width: 390, height: 1000 });
  await parent.p.getByText("Работы", { exact: true }).scrollIntoViewIfNeeded();
  await parent.p.screenshot({ path: out + "works-390.png" });
  await writeFile(
    out + "result.json",
    JSON.stringify(
      {
        attempt: last.id,
        score: last.correct,
        attachment: attached.id,
        viewports: [320, 390, 1440],
        errors,
      },
      null,
      2,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "✓ 320/390/1440 layouts without horizontal overflow; correction audit preserved",
  );
} catch (e) {
  console.error(e);
  throw e;
} finally {
  await browser.close();
}
