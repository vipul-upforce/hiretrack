import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import os from 'os';
import path from 'path';
import { logger } from '@/lib/logger/logger.server';

export async function POST(request: NextRequest) {
  try {
    // Get the user's home directory (cross-platform)
    const homeDir = os.homedir();

    // Construct path to installer script in user's home
    const installerPath = path.join(homeDir, '.hiretrack', 'installer.sh');

    // Determine shell based on OS
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/bash';

    // Construct command
    const command = isWindows
      ? `"${installerPath}" --update "manually"`
      : `${installerPath} --update "manually"`;

    // Execute the command asynchronously
    const childProcess = exec(command, {
      cwd: path.dirname(installerPath),
      shell,
    });

    return NextResponse.json({
      success: true,
      message: 'Update process initiated successfully',
      pid: childProcess.pid,
      homeDir,
    });
  } catch (error: unknown) {
    logger.error({ error, url: request.url }, 'Error in update endpoint');
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Internal server error while initiating update',
      },
      { status: 500 },
    );
  }
}
