#!/usr/bin/env node

import fetch from 'node-fetch';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testRateLimit() {
  log('🧪 Testing License Validation Rate Limiting', 'blue');
  log('==========================================', 'blue');
  log('');

  const baseUrl = 'http://localhost:3000';
  const endpoint = '/api/license-validate';
  
  log('📊 Rate Limit Configuration:', 'blue');
  log('   - Limit: 10 requests per hour', 'cyan');
  log('   - Window: 1 hour (3600 seconds)', 'cyan');
  log('   - Per IP address', 'cyan');
  log('');

  log('🚀 Making requests to test rate limiting...', 'blue');
  log('');

  let requestCount = 0;
  let rateLimitHit = false;

  // Make multiple requests to test rate limiting
  for (let i = 1; i <= 15; i++) {
    try {
      requestCount++;
      log(`Request ${i}:`, 'yellow');
      
      const response = await fetch(`${baseUrl}${endpoint}`);
      const data = await response.json();
      
      // Check rate limit headers
      const rateLimitLimit = response.headers.get('X-RateLimit-Limit');
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      const rateLimitReset = response.headers.get('X-RateLimit-Reset');
      
      if (response.status === 429) {
        log(`   ❌ Rate limit exceeded!`, 'red');
        log(`   Error: ${data.error}`, 'red');
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
          log(`   Retry after: ${retryAfter} seconds`, 'yellow');
        }
        rateLimitHit = true;
        break;
      } else if (response.ok) {
        log(`   ✅ Request successful`, 'green');
        log(`   License valid: ${data.valid}`, 'cyan');
        if (rateLimitLimit && rateLimitRemaining) {
          log(`   Rate limit: ${rateLimitRemaining}/${rateLimitLimit} remaining`, 'cyan');
        }
        if (rateLimitReset) {
          const resetTime = new Date(rateLimitReset);
          log(`   Reset time: ${resetTime.toLocaleString()}`, 'cyan');
        }
      } else {
        log(`   ⚠️  Request failed with status: ${response.status}`, 'yellow');
        log(`   Error: ${data.error || 'Unknown error'}`, 'yellow');
      }
      
      log('');
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      log(`   ❌ Request failed: ${error.message}`, 'red');
      log('');
    }
  }

  log('📋 Test Results:', 'blue');
  log(`   - Total requests made: ${requestCount}`, 'cyan');
  log(`   - Rate limit hit: ${rateLimitHit ? '✅ Yes' : '❌ No'}`, rateLimitHit ? 'green' : 'red');
  
  if (rateLimitHit) {
    log('   - Rate limiting is working correctly!', 'green');
  } else {
    log('   - Rate limit was not reached (may need more requests)', 'yellow');
  }
  
  log('');
  log('💡 Tips:', 'blue');
  log('   - Rate limit resets every hour', 'cyan');
  log('   - Check X-RateLimit-Reset header for exact reset time', 'cyan');
  log('   - Use Retry-After header to know when to retry', 'cyan');
  log('   - Rate limiting is per IP address', 'cyan');
  log('');
  log('🔧 To test again:', 'blue');
  log('   1. Wait for rate limit to reset (1 hour)', 'cyan');
  log('   2. Or restart your Next.js server to clear in-memory store', 'cyan');
  log('   3. Run this script again', 'cyan');
}

// Run the test
testRateLimit().catch(console.error);
