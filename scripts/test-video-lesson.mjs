// Local browser acceptance tests. Run with node --import tsx.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { check, practice } from "../src/course/videoLesson/content.ts";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const base = process.env.LESSON_URL || "http://127.0.0.1:8102/";
const output = process.env.LESSON_ARTIFACTS || "../browser-checks";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const errors = [];
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const button = (name) => page.getByRole("button", { name, exact: true });
const radio = (name) => page.getByRole("radio", { name, exact: true });
const lesson = () => page.getByTestId("video-lesson");
async function saved() {
  await page.waitForFunction(() =>
    Object.keys(localStorage).some((k) =>
      k.startsWith("espada.video-lesson.v1:"),
    ),
  );
}
async function read() {
  return page.evaluate(() => {
    const k = Object.keys(localStorage).find((k) =>
      k.startsWith("espada.video-lesson.v1:"),
    );
    return k ? JSON.parse(localStorage.getItem(k)) : null;
  });
}
async function snap(name) {
  await page.screenshot({ path: `${output}/${name}.png` });
}
async function noOverflow() {
  const overflow = await lesson().evaluate((el) =>
    [...el.querySelectorAll("*")]
      .filter((n) => {
        if (n.closest('[aria-hidden="true"]')) return false;
        const b = n.getBoundingClientRect();
        return b.width && b.height && (b.left < -1 || b.right > innerWidth + 1);
      })
      .map((n) => ({ tag: n.tagName, text: n.textContent.slice(0, 45) }))
      .slice(0, 10),
  );
  assert.deepEqual(overflow, []);
}
try {
  await page.goto(`${base}#/lesson/G08-02`);
  await button("Ответить").waitFor();
  const legacy = await page.evaluate(() => {
    const lessonKey = Object.keys(localStorage).find((k) =>
      k.startsWith("espada.video-lesson.v1:"),
    );
    const actor = lessonKey.slice(
      "espada.video-lesson.v1:".length,
      -":G08-02".length,
    );
    const key = "espada.math-course.v1:" + actor;
    const value = JSON.stringify({
      "G08-02": {
        page: 2,
        readPages: [0, 1],
        notes: "Мои прежние заметки",
        reviewed: { 1: "understood" },
        quiz: {},
        updatedAt: "2026-10-01T00:00:00.000Z",
      },
    });
    localStorage.setItem(key, value);
    return { key, value };
  });
  await page.reload();
  await button("Ответить").waitFor();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await page.waitForTimeout(250);
    await noOverflow();
    await snap(`intro-${width}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await radio("На 10 м").click();
  await button("Ответить").click();
  assert.equal((await read()).runs[0].initial.choice, 0);
  assert.equal(await page.getByText("До и после", { exact: true }).count(), 0);
  await button("Смотреть видео").dblclick();
  await page.getByTestId("youtube-container").waitFor();
  // Real YouTube smoke test; this may legitimately expose regional/network restrictions.
  await page.waitForTimeout(16000);
  console.log("REAL VIDEO", (await lesson().innerText()).slice(0, 1600));
  for (const width of [320, 390, 1440, 844]) {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 900 });
    await page.waitForTimeout(250);
    await noOverflow();
    await snap(`video-${width}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId("video-notes").waitFor();
  await page.getByText("c² = a² + b²", { exact: true }).waitFor();
  assert.equal(await page.getByRole("combobox").count(), 0);
  assert.equal(await button("Справочник").count(), 0);
  await page.reload();
  await page.getByTestId("youtube-container").waitFor();
  await button("Далее").click();
  for (let i = 0; i < practice.length; i++) {
    const q = practice[i];
    await page.getByRole("heading", { name: q.prompt, exact: true }).waitFor();
    await button("Подсказка").click();
    await button("Ещё подсказка").click();
    await radio(q.choices[i === 0 ? 0 : q.correct]).click();
    await button("Проверить").click();
    await page.getByText(q.solution, { exact: true }).waitFor();
    if (i === 0) {
      await page.reload();
      await page.getByText(q.solution, { exact: true }).waitFor();
      await snap("practice-390");
    }
    await button(i === practice.length - 1 ? "Завершить" : "Далее").click();
  }
  await radio("На 20 м").click();
  await button("Ответить").click();
  await page.getByText("До", { exact: true }).waitFor();
  await page.getByText("После", { exact: true }).waitFor();
  await snap("comparison-390");
  await button("К проверке").click();
  for (let i = 0; i < check.length; i++) {
    const q = check[i];
    await page.getByRole("heading", { name: q.prompt, exact: true }).waitFor();
    assert.equal(await button("Подсказка").count(), 0);
    assert.equal(await page.getByText(q.solution, { exact: true }).count(), 0);
    await radio(
      q.choices[i < 7 ? q.correct : (q.correct + 1) % q.choices.length],
    ).click();
    if (i === 3) {
      await saved();
      await page.reload();
      await radio(q.choices[q.correct]).waitFor();
      assert.equal(
        await radio(q.choices[q.correct]).getAttribute("aria-checked"),
        "true",
      );
    }
    if (i < 9) await button("Далее").click();
  }
  await button("Предыдущая задача").click();
  await page
    .getByRole("heading", { name: check[8].prompt, exact: true })
    .waitFor();
  await button("Следующая задача").click();
  await snap("check-390");
  await button("Завершить").dblclick();
  await page.getByText("70%", { exact: true }).waitFor();
  await page
    .getByText("7 из 10 · Проверка пройдена", { exact: true })
    .waitFor();
  await saved();
  const first = (await read()).runs[0];
  assert.equal(first.initial.choice, 0);
  assert.equal(first.revisited.choice, 1);
  assert.equal(first.stage, "result");
  await snap("result-70-390");
  await button("Ответы и решения").click();
  await page.getByText(check[0].solution, { exact: true }).waitFor();
  await page.reload();
  await page.getByText("70%", { exact: true }).waitFor();
  await button("Пройти ещё раз").dblclick();
  await button("Ответить").waitFor();
  const history = await read();
  assert.equal(history.runs.length, 2);
  assert.deepEqual(history.runs[0], first);
  await radio("На 50 м").click();
  await saved();
  await button("К урокам").click();
  await page.goBack();
  await button("Ответить").waitFor();
  assert.equal(await radio("На 50 м").getAttribute("aria-checked"), "true");
  await context.setOffline(true);
  await button("Ответить").click();
  await saved();
  await button("Смотреть видео").click();
  await button("Повторить загрузку").waitFor({ timeout: 20000 });
  await snap("offline-390");
  await context.setOffline(false);
  await button("Повторить загрузку").click();
  await page.getByTestId("youtube-container").locator("iframe").waitFor();
  await page
    .frameLocator('[data-testid="youtube-container"] iframe')
    .getByRole("button", { name: /Воспроизвести|Play/ })
    .first()
    .waitFor({ timeout: 20000 });
  assert.equal(
    await page.evaluate((key) => localStorage.getItem(key), legacy.key),
    legacy.value,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: entire journey, 320/390/1440/landscape, 70%, drafts, reload, back, double taps, history, offline/retry.",
  );
} finally {
  await browser.close();
}
