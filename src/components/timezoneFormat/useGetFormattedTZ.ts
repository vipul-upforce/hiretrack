// import { useCallback } from "react";
// import { toZonedTime } from "date-fns-tz";
// import Cookies from "js-cookie";

// interface TimeZone {
//   name: string;
//   offset: string;
// }

// interface UserData {
//   organizationId?: string;
//   timeZone?: TimeZone;
// }

// export function useDateFormatter() {
//   const formatTZDate = useCallback(
//     (date: Date | string, iso?: boolean): string | Date => {
//       try {
//         const userData: UserData | undefined = Cookies.get("user")
//           ? JSON.parse(Cookies.get("user") as string)
//           : undefined;

//         // if (!userData?.timeZone) {
//         //   throw new Error("User timezone not found in cookies");
//         // }

//         // const timeZone = userData.timeZone.name || "UTC";

//         const dateObj = typeof date === "string" ? new Date(date) : date;
//         if (isNaN(dateObj.getTime())) {
//           throw new Error("Invalid date");
//         }

//         // const zonedDate = toZonedTime(dateObj, timeZone);

//         // if (iso) {
//         //   return zonedDate;
//         // }

//         const formatter = new Intl.DateTimeFormat("en-IN", {
//           year: "numeric",
//           month: "long",
//           day: "numeric",
//           hour: "numeric",
//           minute: "2-digit",
//           hour12: true,
//           // timeZone,
//         });

//         const dateTime = formatter.format(zonedDate);
//         return dateTime;
//       } catch (err) {
//         console.error("Error formatting date:", err);
//         return "Invalid Date";
//       }
//     },
//     []
//   );

//   return { formatTZDate };
// }
