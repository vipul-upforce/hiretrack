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
  controlFlowFlattening: false, // Keep control flow simple
  stringArray: true,
  stringArrayThreshold: 0.5, // Reduced threshold for better compatibility
  rotateStringArray: true,
  disableConsoleOutput: true,
  // Conservative obfuscation settings
  identifierNamesGenerator: "hexadecimal" as const,
  renameGlobals: false, // Critical: Don't rename global variables
  renameProperties: false, // Don't rename object properties
  reservedNames: [
    // Core Node.js and Web APIs
    "global",
    "globalThis",
    "process",
    "Buffer",
    "console",
    "setTimeout",
    "setInterval",
    "clearTimeout",
    "clearInterval",

    // SSE and streaming related
    "sseClients",
    "ReadableStream",
    "TextEncoder",
    "TextDecoder",
    "EventSource",
    "controller",
    "enqueue",
    "close",
    "addEventListener",
    "removeEventListener",
    "abort",

    // HTTP and networking
    "fetch",
    "Request",
    "Response",
    "Headers",
    "URL",
    "URLSearchParams",

    // JSON and data handling
    "JSON",
    "parse",
    "stringify",

    // Database and ORM
    "mongoose",
    "MongoClient",
    "connect",
    "disconnect",
    "find",
    "findOne",
    "create",
    "update",
    "delete",
    "save",

    // Authentication and security
    "signToken",
    "verifyToken",
    "verifyAndDecryptSSE",
    "getDecodedSSE",
    "jwt",
    "bcrypt",
    "crypto",

    // SSE specific functions
    "broadcastCandidateUpdate",
    "broadcastMultipleCandidateUpdate",
    "broadcastLaneUpdate",
    "useSSE",

    // Event types
    "candidateUpdate",
    "clients",
    "lanesUpdate",
    "multipleCandidateUpdate",
    "connected",
    "heartbeat",

    // Next.js specific
    "NextRequest",
    "NextResponse",
    "NextConfig",

    // Common utility functions
    "toString",
    "valueOf",
    "hasOwnProperty",
    "isPrototypeOf",
    "propertyIsEnumerable",
  ],
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
    // Standard exclusions
    ".map",
    ".json",
    ".wasm",
    "react-refresh",
    "trace",
    "trace-entry",

    // SSE and real-time communication files
    "sse",
    "broadcast",
    "candidates/route",
    "useSSE",

    // Critical API routes that use global variables or complex state
    "auth/",
    "login/",
    "signup/",
    "license-validate",
    "system/update",

    // Files that use global state or complex object manipulation
    "mongodb",
    "jwt",
    "auth.ts",
    "secureTokens",

    // WebSocket-like functionality
    "event-stream",
    "streaming",

    // Files that might use dynamic property access
    "models/",
    "types/",

    // Rate limiting and middleware
    "rateLimiter",
    "middleware",

    // File processing that might use dynamic imports
    "process-cv",
    "file-upload",
    "pdf",

    // Email and notification systems
    "email",
    "notification",
    "mail",

    // Calendar and scheduling
    "calendar",
    "google-calendar",

    // AI and external API integrations
    "ai-providers",
    "openai",
    "anthropic",
    "gemini",
    "perplexity",

    // Analytics and reporting
    "analytics",
    "reports",

    // Backup and system operations
    "backup",
    "system",

    // Configuration and settings
    "config",
    "settings",

    // Database operations
    "db-indexes",
    "indexes",
  ];

  // Check if file should be skipped
  const shouldSkipFile = skipPatterns.some((pattern) => file.includes(pattern));

  // Also skip non-JS files
  const isNotJS = !file.endsWith(".js");

  if (shouldSkipFile) {
    console.log(
      `Skipping obfuscation for: ${file} (matches exclusion pattern)`
    );
  }

  return shouldSkipFile || isNotJS;
}

function obfuscateFile(file: string) {
  try {
    const code = fs.readFileSync(file, "utf8");
    const obfuscated = JavaScriptObfuscator.obfuscate(code, obfuscationOptions);
    fs.writeFileSync(file, obfuscated.getObfuscatedCode(), "utf8");
    console.log("✅ Obfuscated:", file);
  } catch (err) {
    console.error("❌ Failed to obfuscate", file, err);
  }
}

let obfuscatedCount = 0;
let skippedCount = 0;

for (const dir of nextServerDirs) {
  if (!fs.existsSync(dir)) continue;
  walk(dir, (file) => {
    if (!shouldSkip(file)) {
      obfuscateFile(file);
      obfuscatedCount++;
    } else {
      skippedCount++;
    }
  });
}

console.log("\n📊 Obfuscation Summary:");
console.log(`✅ Files obfuscated: ${obfuscatedCount}`);
console.log(`⏭️  Files skipped: ${skippedCount}`);
console.log("🔒 Server-side obfuscation completed with SSE-safe exclusions");
