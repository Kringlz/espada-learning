import {
  cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync,
  rmSync, writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const versions = JSON.parse(readFileSync(join(root, "РЕСЕТЫ/versions.json"), "utf8"));
const [name = "list", ...flags] = process.argv.slice(2);
const git = (...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
const present = (path) => {
  try { lstatSync(path); return true; } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
};
const scope = [
  "App.tsx", "index.ts", "src", "assets", "content", "tests", "supabase",
  "package.json", "package-lock.json", "app.config.ts", "eas.json",
];

if (flags.some((flag) => flag !== "--apply") || flags.length > 1) {
  throw new Error("Использование: node РЕСЕТЫ/reset.mjs <имя|list> [--apply]");
}
if (name === "list") {
  if (flags.length) throw new Error("list не принимает --apply.");
  for (const [key, version] of Object.entries(versions)) {
    console.log(`${key.padEnd(20)} ${version.commit.slice(0, 7)}  ${version.label}`);
  }
} else {
  if (!Object.hasOwn(versions, name)) throw new Error(`Неизвестная точка: ${name}`);
  const version = versions[name];
  if (!/^[a-f0-9]{40}$/.test(version.commit)) throw new Error("Некорректный коммит в каталоге.");
  if (git("rev-parse", "--show-toplevel") !== root) throw new Error("Ожидался корень репозитория Espada.");
  if (git("rev-parse", `${version.commit}^{commit}`) !== version.commit) throw new Error("Коммит не найден.");
  console.log(`${version.label}: ${version.commit}`);
  console.log(`Пути восстановления: ${scope.join(", ")}`);
  console.log("Сайт, база, .env.local, история Git, инструменты и архив не сбрасываются.");
  if (!flags.includes("--apply")) {
    console.log("Предпросмотр. Для применения добавьте --apply.");
  } else {
    const archive = join(root, "АРХИВ");
    if (present(archive) && lstatSync(archive).isSymbolicLink()) throw new Error("АРХИВ не должен быть ссылкой.");
    mkdirSync(archive, { recursive: true });
    const lock = join(archive, ".reset-lock");
    // An atomic directory lock prevents two resets from replacing each other's backup.
    mkdirSync(lock);
    let staging;
    try {
      staging = mkdtempSync(join(tmpdir(), "espada-reset-"));
      const tree = new Set(git("ls-tree", "--name-only", version.commit).split("\n"));
      const targetPaths = scope.filter((path) => tree.has(path));
      const tar = join(staging, "snapshot.tar");
      git("archive", "--format=tar", `--output=${tar}`, version.commit, "--", ...targetPaths);
      const source = join(staging, "source");
      mkdirSync(source);
      execFileSync("tar", ["-xf", tar, "-C", source]);
      if (!existsSync(join(source, "App.tsx")) || !existsSync(join(source, "package.json"))) {
        throw new Error("Снимок не содержит приложения.");
      }
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backup = join(archive, "ресеты", `${stamp}-${name}`);
      const before = join(backup, "до-ресета");
      mkdirSync(before, { recursive: true });
      const existing = scope.filter((path) => present(join(root, path)));
      for (const path of existing) {
        cpSync(join(root, path), join(before, path), { recursive: true, dereference: false, verbatimSymlinks: true });
      }
      const manifest = {
        createdAt: new Date().toISOString(), target: name, commit: version.commit,
        originalHead: git("rev-parse", "HEAD"), scope, existing,
        status: "backup-complete",
      };
      const record = () => writeFileSync(join(backup, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
      record();
      try {
        for (const path of scope) rmSync(join(root, path), { recursive: true, force: true });
        for (const path of targetPaths) {
          cpSync(join(source, path), join(root, path), { recursive: true, dereference: false, verbatimSymlinks: true });
        }
        manifest.status = "applied";
        record();
      } catch (error) {
        for (const path of scope) rmSync(join(root, path), { recursive: true, force: true });
        for (const path of existing) {
          cpSync(join(before, path), join(root, path), { recursive: true, dereference: false, verbatimSymlinks: true });
        }
        manifest.status = "rolled-back";
        record();
        throw error;
      }
      console.log(`Восстановлены исходники ${name}. Резервная копия: ${backup}`);
      console.log("Далее: npm ci && npm run check. Изменения остаются локальными; публикация не выполнялась.");
    } finally {
      if (staging) rmSync(staging, { recursive: true, force: true });
      rmSync(lock, { recursive: true, force: true });
    }
  }
}
