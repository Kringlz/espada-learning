import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const forbidden = /^(?:АРХИВ|design-lab|review|tmp)\//;
const bad = files.filter((file) => forbidden.test(file));
if (bad.length) throw new Error(`Архивные материалы в рабочем репозитории:\n${bad.join("\n")}`);
const versions = JSON.parse(readFileSync("РЕСЕТЫ/versions.json", "utf8"));
for (const name of ["current", "previous"]) {
  if (versions[name]?.ref !== `refs/tags/release/${name}`) {
    throw new Error(`${name} должен ссылаться на метку успешной публикации, а не на устаревающий коммит.`);
  }
}
console.log("Workspace structure and release references verified.");
