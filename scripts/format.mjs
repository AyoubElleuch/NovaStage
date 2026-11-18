import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const check = process.argv.includes("--check");
const files = [
  ...new Set(
    execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
      encoding: "utf8",
    })
      .split("\0")
      .filter(Boolean),
  ),
];
const require = createRequire(import.meta.url);
const sqlFormatter = resolve(dirname(require.resolve("pg-formatter")), "pg-formatter/pg_format");
const gitPerl = resolve(process.env.ProgramFiles || "C:/Program Files", "Git/usr/bin/perl.exe");
const perl =
  process.env.PERL_BINARY ||
  (process.platform === "win32" && existsSync(gitPerl) ? gitPerl : "perl");
let checked = 0;
let changed = 0;

for (const file of files) {
  const info = await prettier.getFileInfo(file, { ignorePath: ".prettierignore" });
  if (info.ignored || (!info.inferredParser && !file.endsWith(".sql") && !file.endsWith(".svg")))
    continue;
  const input = await readFile(file, "utf8");
  const formatted = file.endsWith(".sql")
    ? execFileSync(
        perl,
        [
          sqlFormatter,
          "--no-rcfile",
          "--spaces",
          "2",
          "--keyword-case",
          "0",
          "--type-case",
          "0",
          "--redundant-parenthesis",
          // pgFormatter 5.11 misparses IN after a double-precision cast.
          "--placeholder",
          "::double\\s+precision\\b",
          "--no-extra-line",
          "-",
        ],
        { cwd: dirname(sqlFormatter), input, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
      ).replace(/\r\n/g, "\n")
    : await prettier.format(input, { ...(await prettier.resolveConfig(file)), filepath: file });
  checked++;
  if (input === formatted) continue;
  changed++;
  if (check) console.error(file);
  else await writeFile(file, formatted);
}

console.log(`${checked} files checked; ${changed} ${check ? "need formatting" : "formatted"}.`);
if (check && changed) process.exitCode = 1;
