import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
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
  iso?: boolean,
  directOrganizationId?: string
): Promise<string | Date> {
  try {
    // Get user data from auth (server-side, using cookies)
    // const cookieStore = cookies();
    const cookies = await auth(req);
    const userData = cookies?.user;
    const organizationId = userData?.organizationId;

    if (!organizationId && !directOrganizationId) {
      throw new Error("User not authenticated or organizationId missing");
    }

    const orgId = organizationId || directOrganizationId;

    // Fetch settings from MongoDB
    const settings: SettingsDoc[] | undefined = await Settings?.find({
      organizationId: orgId,
    });

    if (!settings || settings.length === 0) {
      throw new Error("Settings not found");
    }

    const orgSettings = settings.find((s) => s.organizationId === orgId);
    const timeZone = orgSettings?.timeZone?.name || "UTC";

    // Convert date to Date object
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      throw new Error("Invalid date");
    }

    // Convert to user's timezone
    const zonedDate = fromZonedTime(dateObj, timeZone);
    console.log("TZ: ZONED TIME ISO TO BE FORMATTED: ", zonedDate);
    // if (iso) {
    //   return zonedDate;
    // }
    if (iso) {
      const isoLikeString = formatInTimeZone(
        dateObj,
        timeZone,
        "yyyy-MM-dd'T'HH:mm:ssXXX"
      );
      console.log("TZ: ZONED TIME ISO TO BE RETURNED: ", isoLikeString);
      return new Date(isoLikeString);
    }

    // console.log("BEFORE FORMATINGL: ", zonedDate);
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

    const dateTime = formatter.format(dateObj);
    console.log("TZ: LocalStringLike formatted date:  ", dateTime);
    return dateTime;
  } catch (err) {
    console.error("Error formatting date:", err);
    return "Invalid Date";
  }
}
