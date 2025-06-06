import { toZonedTime } from "date-fns-tz";
import { Settings } from "@/lib/mongodb";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

interface TimeZone {
  name: string;
  offset: string;
}

interface SettingsDoc {
  organizationId: string;
  timeZone: TimeZone;
}

export async function getFormattedDate(
  req: NextRequest,
  date: Date | string,
  iso?: boolean
): Promise<string | Date> {
  try {
    // Get user data from auth (server-side, using cookies)
    // const cookieStore = cookies();
    const cookies = await auth(req);
    const userData = cookies?.user;
    const organizationId = userData?.organizationId;

    if (!organizationId) {
      throw new Error("User not authenticated or organizationId missing");
    }

    // Fetch settings from MongoDB
    const settings: SettingsDoc[] | undefined = await Settings?.find({
      organizationId,
    });

    if (!settings || settings.length === 0) {
      throw new Error("Settings not found");
    }

    const orgSettings = settings.find(
      (s) => s.organizationId === organizationId
    );
    const timeZone = orgSettings?.timeZone?.name || "UTC";

    // Convert date to Date object
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      throw new Error("Invalid date");
    }

    // Convert to user's timezone
    const zonedDate = toZonedTime(dateObj, timeZone);
    if (iso) {
      return zonedDate;
    }
    console.log("BEFORE FORMATINGL: ", zonedDate);
    // Format date using Intl.DateTimeFormat
    const formatter = new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
    });
    const dateTime = formatter.format(zonedDate);
    return dateTime;
  } catch (err) {
    console.error("Error formatting date:", err);
    return "Invalid Date";
  }
}
