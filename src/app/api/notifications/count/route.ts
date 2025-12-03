// import { NextRequest, NextResponse } from "next/server";
// import connectToDatabase, { Notification } from "@/lib/mongodb";
// import { getAuthenticatedUser } from "@/app/actions/auth";

// export async function GET(request: NextRequest) {
//   try {
//     // Check authentication
//     const [user] = await Promise.all([
//       getAuthenticatedUser(request),
//       connectToDatabase(),
//     ]);
//     if (!Notification) {
//       return NextResponse.json(
//         { error: "Notification Model not found" },
//         { status: 404 }
//       );
//     }

//     // Count unread notifications
//     const [unreadCount, totalCount] = await Promise.all([
//       Notification.countDocuments({
//         organizationId: user.organizationId,
//         recipientId: user.id,
//         isRead: false,
//       }),
//       Notification.countDocuments({
//         organizationId: user.organizationId,
//         recipientId: user.id,
//       }),
//     ]);

//     return NextResponse.json({
//       unreadCount,
//       totalCount,
//     });
//   } catch (error: unknown) {
//     if (error instanceof Error) {
//       return NextResponse.json({ error: error.message }, { status: 500 });
//     }
//     return NextResponse.json(
//       { error: "Unknown error occurred" },
//       { status: 500 }
//     );
//   }
// }
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Notification } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { organizationId, id: recipientId } = user;

    // Single aggregation query instead of 2 expensive count queries
    const [result] = await Notification.aggregate([
      {
        $match: { organizationId, recipientId }
      },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          unreadCount: {
            $sum: { $cond: ["$isRead", 0, 1] }
          }
        }
      }
    ]);

    return NextResponse.json({
      unreadCount: result?.unreadCount ?? 0,
      totalCount: result?.totalCount ?? 0
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
