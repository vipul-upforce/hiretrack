import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger/logger.server';

// Path to config.json in the parent of the current project root
const CONFIG_PATH = path.join(process.cwd(), '..', 'config.json');

// Helper to read config file
function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return null;
    }
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

// Helper to write config file
function writeConfig(config: any) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
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
  return NextResponse.json({ autoUpdate: config.autoUpdate });
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
  config.autoUpdate = config.autoUpdate != true;
  const success = writeConfig(config);
  if (!success) {
    logger.error({ url: req.url }, 'Failed to write config file');
    return NextResponse.json(
      { error: 'Failed to write config file' },
      { status: 500 },
    );
  }
  return NextResponse.json({ autoUpdate: config.autoUpdate });
}
