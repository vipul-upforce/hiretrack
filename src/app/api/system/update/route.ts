import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
// import { promisify } from "util";

// const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // Check if the request is authorized (you might want to add authentication here)
    // For now, we'll proceed with the update

    console.log("Starting system update process...");

    // Execute the installer script with the --update "manually" parameter
    const command = '~/.myapp/installer.sh --update "manually"';

    // Execute the command without waiting for it to complete
    const childProcess = exec(command, {
      cwd: process.env.HOME || "/root", // Set working directory to home
    });

    // Log process ID for reference
    console.log(`Update process initiated with PID: ${childProcess.pid}`);

    // Set up non-blocking error logging
    childProcess.on("error", (error) => {
      console.error("Error in background update process:", error);
    });

    // Optional: Set up stdout/stderr logging if needed
    childProcess.stdout?.on("data", (data) => {
      console.log(`Update stdout: ${data}`);
    });

    childProcess.stderr?.on("data", (data) => {
      console.log(`Update stderr: ${data}`);
    });

    // Return immediately without waiting for process completion
    return NextResponse.json({
      success: true,
      message: "Update process initiated successfully",
      pid: childProcess.pid,
    });
  } catch (error: any) {
    console.error("Error in update endpoint:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error while initiating update",
      },
      { status: 500 }
    );
  }
}
