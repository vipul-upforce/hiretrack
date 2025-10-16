import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // Check if the request is authorized (you might want to add authentication here)
    // For now, we'll proceed with the update

    console.log("Starting system update process...");

    // Execute the installer script with the --update "manually" parameter
    const command = '../installer.sh --update "manually"';

    try {
      // Execute the command asynchronously
      const { stdout, stderr } = await execAsync(command, {
        timeout: 8000000, // 30 second timeout for the command execution
        cwd: process.env.HOME || "/root", // Set working directory to home
      });

      console.log("Update command executed successfully");
      console.log("STDOUT:", stdout);

      if (stderr) {
        console.log("STDERR:", stderr);
      }

      return NextResponse.json({
        success: true,
        message: "Update process initiated successfully",
        output: stdout,
        error: stderr || null,
      });
    } catch (execError: any) {
      console.error("Error executing update command:", execError);

      // Check if it's a timeout error
      if (execError.code === "TIMEOUT") {
        return NextResponse.json(
          {
            success: false,
            error:
              "Update command timed out. The update may still be running in the background.",
          },
          { status: 408 }
        );
      }

      // Check if the script doesn't exist
      if (execError.code === "ENOENT") {
        return NextResponse.json(
          {
            success: false,
            error: "Installer script not found at ~/installer.sh",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `Update command failed: ${execError.message}`,
          output: execError.stdout || null,
          stderr: execError.stderr || null,
        },
        { status: 500 }
      );
    }
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
