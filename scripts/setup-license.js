#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

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

// Generate machine code
function generateMachineCode() {
  const os = process.platform;
  const arch = process.arch;
  const hostname = require('os').hostname();
  const networkInterfaces = require('os').networkInterfaces();
  
  // Get MAC address from first network interface
  const allInterfaces = Object.values(networkInterfaces).flat();
  const macAddress = allInterfaces
    .find((iface) => !iface.internal && iface.mac !== '00:00:00:00:00:00')?.mac || 'unknown';
  
  const machineString = `${os}-${arch}-${hostname}-${macAddress}`;
  return crypto.createHash('sha256').update(machineString).digest('hex').substring(0, 16);
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function setupLicense() {
  log('🚀 HireTrack License Setup', 'blue');
  log('========================', 'blue');
  log('');

  try {
    // Check if license.json already exists
    const licensePath = path.join(process.cwd(), 'license.json');
    if (fs.existsSync(licensePath)) {
      log('⚠️  license.json already exists!', 'yellow');
      const overwrite = await askQuestion('Do you want to overwrite it? (y/N): ');
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        log('License setup cancelled.', 'yellow');
        rl.close();
        return;
      }
    }

    // Get user input
    log('📧 License Information', 'blue');
    const email = await askQuestion('Enter your email address: ');
    
    if (!email || !email.includes('@')) {
      log('❌ Invalid email address!', 'red');
      rl.close();
      return;
    }

    const version = await askQuestion('Enter version (default: 1.0.0): ') || '1.0.0';
    const licenseKey = await askQuestion('Enter your license key: ');
    
    if (!licenseKey) {
      log('❌ License key is required!', 'red');
      rl.close();
      return;
    }

    // Generate machine code
    log('');
    log('🔑 Generating machine code...', 'blue');
    const machineCode = generateMachineCode();
    log(`Machine code: ${machineCode}`, 'cyan');

    // Create license data
    const licenseData = {
      licenseKey,
      machineCode,
      email,
      version,
      lastValidated: Date.now(),
      isValid: true
    };

    // Write license.json file
    log('');
    log('💾 Creating license.json file...', 'blue');
    fs.writeFileSync(licensePath, JSON.stringify(licenseData, null, 2));
    
    log('✅ License setup completed successfully!', 'green');
    log('');
    log('📋 License Information:', 'blue');
    log(`   Email: ${email}`, 'cyan');
    log(`   Version: ${version}`, 'cyan');
    log(`   License Key: ${licenseKey}`, 'cyan');
    log(`   Machine Code: ${machineCode}`, 'cyan');
    log('');
    log('🔧 Next Steps:', 'blue');
    log('   1. Set LICENSE_VALIDATION_URL environment variable');
    log('   2. Restart your application');
    log('   3. Test license validation at /api/license-validate');
    log('');

  } catch (error) {
    log(`❌ Error setting up license: ${error.message}`, 'red');
  } finally {
    rl.close();
  }
}

// Run the setup
setupLicense();

