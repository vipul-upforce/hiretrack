import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { logger } from '@/lib/logger/logger.server';
import { getConfigPath } from '@/lib/hiretrack-data-dir';
import { ConfigData } from '@/lib/licenseUtils';
import { getReleaseChannel } from '@/lib/configUtils';

const CONFIG_PATH = getConfigPath();

// Helper to read config file
function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return null;
    }
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    logger.error({ error: err }, 'Failed to read config file');
    return null;
  }
}

// Helper to write config file
function writeConfig(config: ConfigData) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
    logger.error({ error: err }, 'Failed to write config file');
    return false;
  }
}

// GET: Return the current autoUpdate value
export async function GET() {
  const config = readConfig();
  if (!config || typeof config.autoUpdate === 'undefined') {
    return NextResponse.json(
      { error: 'Config file or autoUpdate field not found' },
      { status: 404 },
    );
  }
  const channel = await getReleaseChannel();
  return NextResponse.json({ autoUpdate: config.autoUpdate, channel });
}

// POST: Toggle the autoUpdate value
export async function POST(req: NextRequest) {
  const config = readConfig();
  if (!config || typeof config.autoUpdate === 'undefined') {
    return NextResponse.json(
      { error: 'Config file or autoUpdate field not found' },
      { status: 404 },
    );
  }
  // Toggle the value
  config.autoUpdate = config.autoUpdate !== true;
  const success = writeConfig(config);
  if (!success) {
    logger.error({ url: req.url }, 'Failed to write config file');
    return NextResponse.json(
      { error: 'Failed to write config file' },
      { status: 500 },
    );
  }
  const channel = await getReleaseChannel();
  return NextResponse.json({ autoUpdate: config.autoUpdate, channel });
}
