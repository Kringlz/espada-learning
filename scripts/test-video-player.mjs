import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const button = (n) => page.getByRole("button", { name: n, exact: true });
try {
  await page.goto(`${process.env.LESSON_URL || "http://127.0.0.1:8102/"}#/lesson/G08-02`);
  await page.getByRole("radio", { name: "На 20 м", exact: true }).click();
  await button("Ответить").click();
  await button("Смотреть видео").click();
  const frame = page.frameLocator('[data-testid="youtube-container"] iframe');
  const waitPlayer = () =>
    frame
      .getByRole("button", { name: /Воспроизвести|Play/ })
      .first()
      .waitFor({ timeout: 20000 });
  await waitPlayer();
  assert.equal(await page.getByRole("combobox").count(), 0);

  await frame
    .getByRole("button", { name: /Воспроизвести|Play/ })
    .first()
    .click();
  await page.waitForTimeout(6500);
  const read = () =>
    page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem(
            Object.keys(localStorage).find((k) =>
              k.startsWith("espada.video-lesson.v1:"),
            ),
          ),
        ).video,
    );
  let progress = await read();
  console.log("PLAY", progress);
  assert.ok(progress.position > 2, "real video plays and saves position");
  // Native controls only: YouTube supplies seeking, speed and fullscreen.
  await page.locator('[data-testid="youtube-container"] iframe').hover();
  await frame
    .getByRole("button", { name: /Показать панель управления/ })
    .click()
    .catch(() => {});
  await frame
    .getByRole("button", {
      name: /Перемотать ролик на 10 с вперед|Seek forward/,
    })
    .click();
  await page.waitForTimeout(2000);
  let after = await read();
  assert.ok(after.position > progress.position + 9);
  assert.ok(after.watch.seconds < after.position - 5, "seeking is not viewing");
  // Reveal YouTube's auto-hidden native controls before clicking.
  await page.locator('[data-testid="youtube-container"] iframe').hover();
  console.log(
    "PLAYING CONTROLS",
    await frame.locator("button").evaluateAll((es) =>
      es.map((e) => ({
        label: e.getAttribute("aria-label"),
        title: e.getAttribute("title"),
        cls: e.className,
      })),
    ),
  );
  // Pause in YouTube, reload and compare the restored start offset.
  await frame
    .getByRole("button", {
      name: /Приостановить видео|Пауза|Pause/,
      includeHidden: true,
    })
    .first()
    .click();
  await page.waitForTimeout(1300);
  progress = await read();
  await page.reload();
  await waitPlayer();
  const src = await page
    .locator('[data-testid="youtube-container"] iframe')
    .getAttribute("src");
  assert.equal(
    new URL(src).searchParams.get("start"),
    String(Math.floor(progress.position)),
  );
  assert.ok((await read()).watch.seconds >= progress.watch.seconds - 0.1);
  // A native YouTube fullscreen control, in a browser supporting the Fullscreen API.
  await frame
    .getByRole("button", { name: /Воспроизвести|Play/ })
    .first()
    .click();
  await page.waitForTimeout(1500);
  console.log(
    "FULLSCREEN BUTTONS",
    await frame
      .getByRole("button")
      .evaluateAll((es) => es.map((e) => e.getAttribute("aria-label"))),
  );
  const full = frame
    .getByRole("button", {
      name: /Полноэкранный|Full screen|Во весь экран/,
      includeHidden: true,
    })
    .first();
  await full.click();
  await page.waitForTimeout(700);
  assert.equal(await page.evaluate(() => !!document.fullscreenElement), true);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
  });
  await page.waitForTimeout(400);
  // Navigating to practice destroys the frame and no video remains underneath.
  await button("Далее").click();
  assert.equal(
    await page.locator('[data-testid="youtube-container"] iframe').count(),
    0,
  );
  const left = await read();
  await page.waitForTimeout(1800);
  assert.equal((await read()).position, left.position);
  await button("Видео").click();
  await waitPlayer();
  assert.equal(
    new URL(
      await page
        .locator('[data-testid="youtube-container"] iframe')
        .getAttribute("src"),
    ).searchParams.get("start"),
    String(Math.floor(left.position)),
  );
  // YouTube briefly reports zero while applying start; leaving immediately
  // after pressing play must not overwrite the previous saved offset.
  await frame
    .getByRole("button", { name: /Воспроизвести|Play/ })
    .first()
    .click();
  await button("К заданию").click();
  assert.ok((await read()).position >= left.position - 1);
  console.log(
    "PASS: real playback, native seek, saved position, coverage, fullscreen, landscape, pause on leaving and resume.",
  );
} finally {
  await browser.close();
}
