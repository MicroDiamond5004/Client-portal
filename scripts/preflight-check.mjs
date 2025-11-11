import { execSync } from "child_process";
import fs from "fs";

console.log("🔍 Running preflight checks...\n");

function run(cmd, desc) {
  console.log(`➡️  ${desc}`);
  try {
    execSync(cmd, { stdio: "inherit" });
    console.log(`✅  ${desc} passed\n`);
  } catch (err) {
    console.error(`❌  ${desc} failed\n`);
    process.exit(1);
  }
}

if (!fs.existsSync("vite.config.ts") && !fs.existsSync("vite.config.js")) {
  console.error("❌ No vite.config file found!");
  process.exit(1);
}

// 1️⃣ TypeScript type check
run("npx tsc --noEmit", "TypeScript check");

// 2️⃣ ESLint
run("npx eslint src --ext .ts,.tsx", "ESLint check");

// 3️⃣ Vite config validation (catches config syntax or plugin issues)
run("npx vite --config vite.config.ts --logLevel silent", "Vite config validation");

// 4️⃣ Check for .env presence
if (!fs.existsSync(".env")) {
  console.warn("⚠️  .env file not found (might be fine for local dev)\n");
}

// 5️⃣ Verify index.html and #root element
if (!fs.existsSync("index.html")) {
  console.error("❌ index.html file missing in project root!");
  process.exit(1);
}
const html = fs.readFileSync("index.html", "utf8");
if (!html.includes('id="root"')) {
  console.error("❌ index.html does not contain <div id=\"root\"></div>");
  process.exit(1);
}

console.log("🚀 All preflight checks passed! You’re ready to start Vite.\n");
