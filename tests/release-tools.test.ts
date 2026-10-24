import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function fixture() {
  const root = mkdtempSync(join(realpathSync(tmpdir()), "espada-release-test-"));
  const repo = join(root, "repo");
  mkdirSync(repo);
  const git = (...args: string[]) => execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-q", "-b", "main");
  git("config", "user.name", "Release verification");
  git("config", "user.email", "release@example.invalid");
  const commit = (name: string) => {
    writeFileSync(join(repo, "App.tsx"), name);
    writeFileSync(join(repo, "package.json"), "{}");
    git("add", "App.tsx", "package.json");
    git("commit", "-qm", name);
    return git("rev-parse", "HEAD");
  };
  return { root, repo, git, commit, clean: () => rmSync(root, { recursive: true, force: true }) };
}

test("release pointers advance atomically, preserve previous on reruns, and reject competing updates", () => {
  const f = fixture();
  try {
    const a = f.commit("first");
    const b = f.commit("second");
    f.git("tag", "release/previous", a);
    f.git("tag", "release/current", b);
    const c = f.commit("third");
    const remote = join(f.root, "remote.git");
    execFileSync("git", ["init", "--bare", "-q", remote]);
    f.git("remote", "add", "origin", remote);
    f.git("push", "origin", "main", "--tags");
    const script = new URL("../scripts/promote-release.mjs", import.meta.url);
    const promote = (sha: string, ref = "refs/heads/main") => spawnSync(process.execPath, [script.pathname], {
      cwd: f.repo, encoding: "utf8", env: { ...process.env, GITHUB_SHA: sha, GITHUB_REF: ref },
    });
    assert.notEqual(promote(c, "refs/heads/old-draft").status, 0);
    assert.equal(promote(c).status, 0);
    assert.equal(f.git("rev-parse", "release/current"), c);
    assert.equal(f.git("rev-parse", "release/previous"), b);
    assert.equal(promote(c).status, 0);
    assert.equal(f.git("rev-parse", "release/previous"), b);
    const d = f.commit("fourth");
    // An external update must cause the whole push to fail, including the new immutable tag.
    f.git("push", "--force", "origin", `${b}:refs/tags/release/current`);
    assert.notEqual(promote(d).status, 0);
    assert.equal(f.git("ls-remote", "origin", "refs/tags/release/current").split(/\s/)[0], b);
    assert.equal(f.git("ls-remote", "origin", "refs/tags/release/previous").split(/\s/)[0], b);
    assert.equal(f.git("ls-remote", "origin", `refs/tags/release/build-${d.slice(0, 12)}`), "");
  } finally { f.clean(); }
});

test("reset resolves release tags and preserves drafts, configuration and Git history", () => {
  const f = fixture();
  try {
    const previous = f.commit("previous");
    const current = f.commit("current");
    f.git("tag", "release/current", current);
    f.git("tag", "release/previous", previous);
    mkdirSync(join(f.repo, "РЕСЕТЫ"));
    cpSync(new URL("../РЕСЕТЫ/reset.mjs", import.meta.url), join(f.repo, "РЕСЕТЫ/reset.mjs"));
    writeFileSync(join(f.repo, "РЕСЕТЫ/versions.json"), JSON.stringify({
      current: { ref: "refs/tags/release/current", label: "current" },
      previous: { ref: "refs/tags/release/previous", label: "previous" },
    }));
    writeFileSync(join(f.repo, "App.tsx"), "unsaved");
    mkdirSync(join(f.repo, "src"));
    writeFileSync(join(f.repo, "src/draft.ts"), "untracked draft");
    writeFileSync(join(f.repo, ".env.local"), "local config");
    const index = f.git("ls-files", "--stage");
    const reset = (...args: string[]) => spawnSync(process.execPath, ["РЕСЕТЫ/reset.mjs", ...args], { cwd: f.repo, encoding: "utf8" });
    assert.equal(reset("previous").status, 0);
    assert.equal(readFileSync(join(f.repo, "App.tsx"), "utf8"), "unsaved");
    assert.notEqual(reset("missing", "--apply").status, 0);
    assert.equal(existsSync(join(f.repo, "АРХИВ")), false);
    assert.equal(reset("previous", "--apply").status, 0);
    assert.equal(readFileSync(join(f.repo, "App.tsx"), "utf8"), "previous");
    const backups = join(f.repo, "АРХИВ/ресеты");
    const backup = join(backups, readdirSync(backups)[0], "до-ресета");
    assert.equal(readFileSync(join(backup, "App.tsx"), "utf8"), "unsaved");
    assert.equal(readFileSync(join(backup, "src/draft.ts"), "utf8"), "untracked draft");
    assert.equal(reset("current", "--apply").status, 0);
    assert.equal(readFileSync(join(f.repo, "App.tsx"), "utf8"), "current");
    assert.equal(readFileSync(join(f.repo, ".env.local"), "utf8"), "local config");
    assert.equal(f.git("rev-parse", "HEAD"), current);
    assert.equal(f.git("ls-files", "--stage"), index);
  } finally { f.clean(); }
});

test("Pages preparation records the exact build and rejects archived output", () => {
  const root = mkdtempSync(join(realpathSync(tmpdir()), "espada-pages-test-"));
  try {
    mkdirSync(join(root, "dist"));
    writeFileSync(join(root, "dist/index.html"), '<script src="/espada-learning/app.js"></script>');
    writeFileSync(join(root, "dist/app.js"), "app");
    const script = new URL("../scripts/prepare-pages.mjs", import.meta.url);
    const env = { ...process.env, GITHUB_SHA: "a".repeat(40), GITHUB_REF_NAME: "main", GITHUB_PAGES_BASE_PATH: "/espada-learning" };
    const prepare = () => spawnSync(process.execPath, [script.pathname], { cwd: root, env, encoding: "utf8" });
    assert.equal(prepare().status, 0);
    assert.equal(JSON.parse(readFileSync(join(root, "dist/release.json"), "utf8")).commit, env.GITHUB_SHA);
    mkdirSync(join(root, "dist/design-lab"));
    assert.notEqual(prepare().status, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
