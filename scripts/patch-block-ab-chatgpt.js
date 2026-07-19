#!/usr/bin/env node
/** Block requests to ab.chatgpt.com/v1 in every rebuilt application. */
const fs = require("fs");
const { locateBundles, relPath } = require("./patch-util");

const MARKER = "[codex-rebuild] block ab.chatgpt.com/v1";
const BLOCKER_CODE = `/* ${MARKER} */
try {
  const { session } = require("electron");
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ["https://ab.chatgpt.com/v1/*"] },
    (_details, callback) => callback({ cancel: true }),
  );
} catch (_error) {}
`;

function main() {
  const args = process.argv.slice(2);
  const isCheck = args.includes("--check");
  const platform = args.find((arg) => ["mac-arm64", "mac-x64", "win"].includes(arg));
  const bundles = locateBundles({ dir: "build", pattern: /^main(-[^.]+)?\.js$/, platform });

  if (bundles.length === 0) {
    console.error("[x] No main bundle found");
    process.exit(1);
  }

  for (const bundle of bundles) {
    const source = fs.readFileSync(bundle.path, "utf-8");
    console.log(`\n-- [${bundle.platform}] ${relPath(bundle.path)}`);
    if (source.includes(MARKER)) {
      console.log("   [ok] ab.chatgpt.com/v1 blocker already installed");
    } else if (isCheck) {
      console.log("   [?] Would install ab.chatgpt.com/v1 request blocker");
    } else {
      fs.writeFileSync(bundle.path, BLOCKER_CODE + source, "utf-8");
      console.log("   [ok] ab.chatgpt.com/v1 request blocker installed");
    }
  }
}

main();
