// Test script to verify obfuscation exclusions work correctly
const fs = require('fs');
const path = require('path');

// Simulate the shouldSkip function logic
function shouldSkip(file) {
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
  
  const shouldSkipFile = skipPatterns.some((pattern) => file.includes(pattern));
  const isNotJS = !file.endsWith(".js");
  
  return shouldSkipFile || isNotJS;
}

// Test cases
const testFiles = [
  // Should be SKIPPED (SSE related)
  "/path/to/sse/candidates/route.js",
  "/path/to/broadcast/broadCastCandidate.js",
  "/path/to/useSSE.js",
  
  // Should be SKIPPED (Critical API routes)
  "/path/to/auth/login/route.js",
  "/path/to/system/update/route.js",
  
  // Should be SKIPPED (Global state files)
  "/path/to/mongodb.js",
  "/path/to/jwt.js",
  "/path/to/auth.ts",
  
  // Should be OBFUSCATED (Regular API routes)
  "/path/to/api/jobs/route.js",
  "/path/to/api/users/route.js",
  "/path/to/api/analytics/route.js",
  
  // Should be SKIPPED (Non-JS files)
  "/path/to/file.json",
  "/path/to/file.map",
  "/path/to/file.wasm",
];

console.log("🧪 Testing Obfuscation Exclusions\n");

let passed = 0;
let failed = 0;

testFiles.forEach(file => {
  const shouldSkipResult = shouldSkip(file);
  const isSSE = file.includes('sse') || file.includes('broadcast') || file.includes('useSSE');
  const isCritical = file.includes('auth') || file.includes('system/update');
  const isGlobal = file.includes('mongodb') || file.includes('jwt') || file.includes('auth.ts');
  const isNonJS = !file.endsWith('.js');
  const isRegular = !isSSE && !isCritical && !isGlobal && !isNonJS;
  
  const expectedResult = isSSE || isCritical || isGlobal || isNonJS;
  
  if (shouldSkipResult === expectedResult) {
    console.log(`✅ PASS: ${file} - ${shouldSkipResult ? 'SKIPPED' : 'OBFUSCATED'}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${file} - Expected ${expectedResult ? 'SKIP' : 'OBFUSCATE'}, got ${shouldSkipResult ? 'SKIP' : 'OBFUSCATE'}`);
    failed++;
  }
});

console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log("🎉 All tests passed! Obfuscation exclusions are working correctly.");
} else {
  console.log("⚠️  Some tests failed. Please review the exclusion patterns.");
  process.exit(1);
}
