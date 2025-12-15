#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {hostname,networkInterfaces} from 'os';

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

// Generate machine code (same as in the API)
function generateMachineCode() {
  const os = process.platform;
  const {arch} = process;
  
  // Get MAC address from first network interface
  const allInterfaces = Object.values(networkInterfaces).flat();
  const macAddress = allInterfaces
    .find((iface) => !iface.internal && iface.mac !== '00:00:00:00:00:00')?.mac || 'unknown';
  
  const machineString = `${os}-${arch}-${hostname}-${macAddress}`;
  return crypto.createHash('sha256').update(machineString).digest('hex').substring(0, 16);
}

// Read license data
function readLicenseData() {
  try {
    const licensePath = path.join(process.cwd(), 'license.json');
    if (!fs.existsSync(licensePath)) {
      return null;
    }
    
    const licenseContent = fs.readFileSync(licensePath, 'utf8');
    const licenseData = JSON.parse(licenseContent);
    
    return licenseData;
  } catch (error) {
    console.error('Error reading license data:', error);
    return null;
  }
}

async function testLicense() {
  log('🧪 Testing License System', 'blue');
  log('========================', 'blue');
  log('');

  // Test 1: Check if license.json exists
  log('1. Checking license.json file...', 'blue');
  const licenseData = readLicenseData();
  
  if (!licenseData) {
    log('❌ license.json not found!', 'red');
    log('   Run: node scripts/setup-license.js', 'yellow');
    return;
  }
  
  log('✅ license.json found', 'green');
  log(`   Email: ${licenseData.email}`, 'cyan');
  log(`   Version: ${licenseData.version}`, 'cyan');
  log(`   License Key: ${licenseData.licenseKey}`, 'cyan');
  log(`   Machine Code: ${licenseData.machineCode}`, 'cyan');
  log('');

  // Test 2: Generate current machine code
  log('2. Generating current machine code...', 'blue');
  const currentMachineCode = generateMachineCode();
  log(`   Current Machine Code: ${currentMachineCode}`, 'cyan');
  log('');

  // Test 3: Compare machine codes
  log('3. Comparing machine codes...', 'blue');
  if (licenseData.machineCode === currentMachineCode) {
    log('✅ Machine codes match', 'green');
  } else {
    log('❌ Machine codes do not match!', 'red');
    log('   This license is not valid for this machine.', 'yellow');
    return;
  }
  log('');

  // Test 4: Test API endpoint (if server is running)
  log('4. Testing API endpoint...', 'blue');
  try {
    const response = await fetch('http://localhost:3000/api/license-validate');
    if (response.ok) {
      const data = await response.json();
      if (data.valid) {
        log('✅ API endpoint working - License valid', 'green');
        if (data.license) {
          log(`   Email: ${data.license.email}`, 'cyan');
          log(`   Last Validated: ${new Date(data.license.lastValidated).toLocaleString()}`, 'cyan');
        }
      } else {
        log('❌ API endpoint working - License invalid', 'red');
        log(`   Error: ${data.error}`, 'yellow');
      }
      
      // Check rate limit headers
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      const rateLimitLimit = response.headers.get('X-RateLimit-Limit');
      if (rateLimitRemaining && rateLimitLimit) {
        log(`   Rate Limit: ${rateLimitRemaining}/${rateLimitLimit} requests remaining`, 'cyan');
      }
    } else if (response.status === 429) {
      log('⚠️  Rate limit exceeded', 'yellow');
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        log(`   Retry after: ${retryAfter} seconds`, 'yellow');
      }
    } else {
      log('⚠️  API endpoint not accessible (server may not be running)', 'yellow');
      log(`   Status: ${response.status}`, 'yellow');
    }
  } catch (error) {
    log('⚠️  API endpoint not accessible (server may not be running)', 'yellow');
    log(`   Error: ${error.message}`, 'yellow');
  }
  log('');

  // Test 5: Check environment variables
  log('5. Checking environment variables...', 'blue');
  const licenseValidationUrl = process.env.LICENSE_VALIDATION_URL;
  if (licenseValidationUrl) {
    log('✅ LICENSE_VALIDATION_URL is set', 'green');
    log(`   URL: ${licenseValidationUrl}`, 'cyan');
  } else {
    log('⚠️  LICENSE_VALIDATION_URL not set', 'yellow');
    log('   Add to .env: LICENSE_VALIDATION_URL=https://your-license-server.com', 'yellow');
  }
  log('');

  log('🎉 License system test completed!', 'green');
  log('');
  log('📋 Summary:', 'blue');
  log(`   - License file: ${  licenseData ? '✅ Found' : '❌ Missing'}`, licenseData ? 'green' : 'red');
  log(`   - Machine code: ${  licenseData?.machineCode === currentMachineCode ? '✅ Valid' : '❌ Invalid'}`, licenseData?.machineCode === currentMachineCode ? 'green' : 'red');
  log(`   - API endpoint: ${  licenseValidationUrl ? '✅ Configured' : '⚠️  Not configured'}`, licenseValidationUrl ? 'green' : 'yellow');
  log('');
  log('🔧 Next Steps:', 'blue');
  log('   1. Start your Next.js server: npm run dev', 'cyan');
  log('   2. Visit: http://localhost:3000/api/license-validate', 'cyan');
  log('   3. Test license validation in your app', 'cyan');
}

// Run the test
testLicense().catch(console.error);

