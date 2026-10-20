#!/usr/bin/env node
/**
 * Run all patch scripts in sequence.
 *
 * Usage:
 *   node scripts/patch-all.js              # Patch both platforms
 *   node scripts/patch-all.js unix         # Patch unix only
 *   node scripts/patch-all.js win          # Patch win only
 *   node scripts/patch-all.js --check      # Dry-run all
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PATCHES = [
  "patch-block-ab-chatgpt.js",
  "patch-i18n.js",
  "patch-copyright.js",
  "patch-devtools.js",
  "patch-fast-mode.js",
  "patch-plugin-auth.js",
  "patch-updater.js",
  "patch-archive-delete.js",
];

function main() {
  const args = process.argv.slice(2);
  const platform = args.find((a) => ["mac-arm64", "mac-x64", "win", "unix"].includes(a));
  const extra = args.filter((a) => a.startsWith("--"));
  const passArgs = [...(platform ? [platform] : []), ...extra];

  // sync 失败(如上游 API 超时)时 src 目录是空的,这里直接点破根因,
  // 而不是让每个补丁脚本报 "No main bundle found"
  if (platform && platform !== "unix") {
    const asarDir = path.join(__dirname, "..", "src", platform, "_asar");
    if (!fs.existsSync(asarDir)) {
      console.error(`[x] src/${platform}/_asar not found — upstream sync didn't run or failed.`);
      console.error(`    Fix: run "node scripts/sync-upstream.js --force" first, and check its output for [x] errors.`);
      process.exit(1);
    }
  }

  let failed = 0;

  for (const script of PATCHES) {
    const scriptPath = path.join(__dirname, script);
    const label = script.replace(".js", "");
    console.log(`\n== ${label} ==`);

    try {
      execFileSync("node", [scriptPath, ...passArgs], { stdio: "inherit" });
    } catch (e) {
      console.error(`[x] ${label} failed (exit ${e.status})`);
      failed++;
    }
  }

  console.log(`\n== Summary: ${PATCHES.length - failed}/${PATCHES.length} succeeded ==`);
  if (failed > 0) process.exit(1);
}

main();
