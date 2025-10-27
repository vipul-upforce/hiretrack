import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import os from "os";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    console.log("Starting system update process...");

    // Get the user's home directory (cross-platform)
    const homeDir = os.homedir();

    // Construct path to installer script in user's home
    const installerPath = path.join(homeDir, ".myapp", "installer.sh");

    // Determine shell based on OS
    const isWindows = process.platform === "win32";
    const shell = isWindows ? "cmd.exe" : "/bin/bash";

    // Construct command
    const command = isWindows
      ? `"${installerPath}" --update "manually"`
      : `${installerPath} --update "manually"`;

    // Execute the command asynchronously
    const childProcess = exec(command, {
      cwd: path.dirname(installerPath),
      shell,
    });

    console.log(`Update process initiated with PID: ${childProcess.pid}`);

    // Log stdout/stderr
    childProcess.stdout?.on("data", (data) => console.log(`[stdout] ${data}`));
    childProcess.stderr?.on("data", (data) =>
      console.error(`[stderr] ${data}`)
    );
    childProcess.on("error", (error) => console.error("Error:", error));

    return NextResponse.json({
      success: true,
      message: "Update process initiated successfully",
      pid: childProcess.pid,
      homeDir,
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

// import { NextRequest, NextResponse } from "next/server";
// import { spawn } from "child_process";

// /**
//  * POST /api/update
//  * Triggers the installer.sh --update "manually" command
//  * in a detached background process.
//  */
// export async function POST(request: NextRequest) {
//   try {
//     console.log("🚀 Starting background update process...");

//     // Optional: authorization check
//     // const authHeader = request.headers.get("authorization");
//     // if (authHeader !== `Bearer ${process.env.UPDATE_SECRET}`) {
//     //   return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
//     // }

//     // Absolute path to the installer script
//     const installerPath = `${process.env.HOME || "/root"}/.myapp/installer.sh`;

//     // Spawn the script in a detached shell so it continues
//     // running even if this Next.js/PM2 process stops.
//     const child = spawn("/bin/bash", ["-c", `${installerPath} --update manually`], {
//       cwd: process.env.HOME || "/root",
//       detached: true,    // ✅ allows it to survive parent shutdown
//       stdio: "ignore",   // ✅ do not wait for stdout/stderr
//       env: {
//         ...process.env,
//         PATH: `/usr/local/bin:/usr/bin:/bin`, // ✅ ensure pm2 is found
//       },
//     });

//     // Detach the process
//     child.unref();

//     console.log(`✅ Update script launched (PID ${child.pid})`);

//     // Respond immediately — the script continues independently
//     return NextResponse.json({
//       success: true,
//       message: "Update process started successfully in background.",
//       pid: child.pid,
//       note: "You can monitor progress via ~/.myapp/logs/installer-run.log",
//     });
//   } catch (error: any) {
//     console.error("❌ Error launching update:", error);
//     return NextResponse.json(
//       { success: false, error: error.message || "Failed to start update process" },
//       { status: 500 }
//     );
//   }
// }
