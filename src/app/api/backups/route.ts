import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getFormattedDate } from "@/components/timezoneFormat/getFormattedTZ";
import { getAuthenticatedUser } from "@/app/actions/auth";

export async function GET(req: NextRequest) {
  try {
    const backupsDir = path.join(process.cwd(), "..", "backups");
    // console.log("BACKUPDS DI:R: ", backupsDir);
    const session = await getAuthenticatedUser(req,"admin");
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const entries = await fs.readdir(backupsDir, { withFileTypes: true });
    // console.log("BACKUPDS Entries ", entries);
    // const settings = await Settings?.find({
    //   organizationId: userData.organizationId,
    // });
    // if (!settings) {
    //   throw new Error("Settings not found");
    // }
    // console.log("###SETTINGS: ", settings);

    // const orgSettings = settings.find(
    //   (s) => s.organizationId === userData.organizationId
    // );
    // const timeZone = orgSettings?.timeZone?.name || "UTC";
    // const offset = settings[0]?.timeZone?.offset || "GMT+00:00";
    // console.log("TIMESONE: ", timeZone);
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (file) => {
          const filePath = path.join(backupsDir, file.name);
          const stats = await fs.stat(filePath);
          // const zonedDate = toZonedTime(stats.birthtime, timeZone);
          // console.log("⛔⛔⛔ UNFORMATED DATE: ", stats.birthtime);
          // console.log("✅✅✅ FORMATED DATE: ", zonedDate);
          // const formatter = new Intl.DateTimeFormat("en-IN", {
          //   year: "numeric",
          //   month: "long",
          //   day: "numeric",
          //   hour: "numeric",
          //   minute: "2-digit",
          //   hour12: true,
          //   timeZone,
          // });
          // const formattedDate = formatter.format(zonedDate);
          // const formattedDate = format(zonedDate, "yyyy-MM-dd'T'HH:mm:ssXXX", {
          //   timeZone,
          // });

          // console.log("⛔⛔⛔ UNFORMATED DATE: ", stats.birthtime);
          // console.log("✅✅✅ FORMATED DATE: ", formattedDate);
          const formattedDate = await getFormattedDate(
            req,
            stats.birthtime,
            true
          );
          return {
            name: file.name,
            url: `/api/files?pathName=../backups/${encodeURIComponent(file.name)}`,
            createdAt: formattedDate,
            size: stats.size,
          };
        })
    );

    return NextResponse.json({ files });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Could not list backup files", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
