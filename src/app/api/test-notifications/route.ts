
import { NextRequest, NextResponse } from "next/server";
import { NotificationService } from "@/lib/notifications/notificationService";
import { NotificationType } from "@/lib/models/notification";
import { getCurrentUser } from "@/lib/auth";

// A utility function to get or create a test user
async function getTestUser(organizationId: string, role: "admin" | "hr" | "interviewer") {
    const { User } = await require("@/lib/mongodb");
    let user = await User.findOne({ organizationId, email: `${role}@test.com` });
    if (!user) {
        user = await User.create({
            organizationId,
            name: `${role.charAt(0).toUpperCase() + role.slice(1)} Test User`,
            email: `${role}@test.com`,
            role,
            isVerified: true,
        });
    }
    return user;
}

export async function POST(req: NextRequest) {
    try {
        const { type } = await req.json();
        const currentUser = await getCurrentUser();

        if (!currentUser || !currentUser.organizationId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const organizationId = currentUser.organizationId;
        const triggerUserId = currentUser.id;
        const triggerUserName = currentUser.name;

        const testInterviewer = await getTestUser(organizationId, "interviewer");

        const commonParams = {
            organizationId,
            candidateId: "test_candidate_id",
            candidateName: "Test Candidate",
            jobId: "test_job_id",
            jobTitle: "Test Job",
            triggerUserId,
            triggerUserName,

        };

        switch (type) {
            case NotificationType.CANDIDATE_APPLIED:
                await NotificationService.notifyCandidateApplied({
                    ...commonParams,
                    candidateEmail: "candidate@test.com",
                });
                break;
            case NotificationType.CANDIDATE_STATUS_UPDATED:
                await NotificationService.notifyCandidateStatusUpdated({
                    ...commonParams,
                    oldStatus: "New",
                    newStatus: "In Review",
                });
                break;
            case NotificationType.CANDIDATE_ASSIGNED:
                await NotificationService.notifyCandidateAssigned({
                    ...commonParams,
                    interviewerId: testInterviewer._id.toString(),
                    interviewerName: testInterviewer.name,
                });
            case NotificationType.REMARK_ADDED:
                await NotificationService.notifyRemarkAdded({
                    ...commonParams,
                    remarkText: "This is a test remark.",
                    roles: ["admin", "hr"]
                });
                break;
            case NotificationType.MEETING_SCHEDULED:
                await NotificationService.notifyMeetingScheduled({
                    ...commonParams,
                    interviewerId: testInterviewer._id.toString(),
                    interviewerName: testInterviewer.name,
                    meetingDate: new Date(),
                });
                break;
            // Add cases for other notification types here...
            default:
                return NextResponse.json({ error: "Invalid notification type" }, { status: 400 });
        }

        return NextResponse.json({ message: `Notification of type '${type}' triggered successfully.` });
    } catch (error) {
        console.error("Error triggering test notification:", error);
        return NextResponse.json({ error: "Failed to trigger notification" }, { status: 500 });
    }
}
