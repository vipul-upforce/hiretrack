// scripts/obfuscate-server.tss
import fs from "fs";
import path from "path";
import JavaScriptObfuscator from "javascript-obfuscator";

const root = path.resolve(__dirname, "..");
const nextServerDirs = [
  path.join(root, ".next", "server"),
  path.join(root, ".next", "serverless"),
];

const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: false,
  stringArray: true,
  stringArrayThreshold: 0.75,
  rotateStringArray: true,
  disableConsoleOutput: true,
};

function walk(dir: string, cb: (file: string) => void) {
  if (!fs.existsSync(dir)) return;
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

function shouldSkip(file: string) {
  const skipPatterns = [
    ".map",
    ".json",
    ".wasm",
    "react-refresh",
    "trace",
    "trace-entry",
  ];
  return skipPatterns.some((s) => file.includes(s)) || !file.endsWith(".js");
}

function obfuscateFile(file: string) {
  try {
    const code = fs.readFileSync(file, "utf8");
    const obfuscated = JavaScriptObfuscator.obfuscate(code, obfuscationOptions);
    fs.writeFileSync(file, obfuscated.getObfuscatedCode(), "utf8");
    console.log("Obfuscated:", file);
  } catch (err) {
    console.error("Failed to obfuscate", file, err);
  }
}

for (const dir of nextServerDirs) {
  if (!fs.existsSync(dir)) continue;
  walk(dir, (file) => {
    if (!shouldSkip(file)) obfuscateFile(file);
  });
}
