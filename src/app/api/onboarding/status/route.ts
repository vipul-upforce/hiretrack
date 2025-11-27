import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Settings } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const user = await getAuthenticatedUser(req, "admin");
    if (!user) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const settings = await Settings.findOne({
      organizationId: user.organizationId,
    }).select("onboardingStatus").lean().exec();

    if (!settings) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    const onboardingStatus = settings.onboardingStatus || {
      isCompleted: false,
      completedSteps: [],
      skippedSteps: [],
      doNotShowAgain: false,
      currentStep: 0,
      lastUpdated: new Date(),
    };

    return NextResponse.json({ onboardingStatus });
  } catch (error) {
    console.error("Error fetching onboarding status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// export async function PUT(req: NextRequest) {
//   try {
//     const [user, body] = await Promise.all([
//       getAuthenticatedUser(req, "admin"),
//       req.json(),
//       connectToDatabase(),
//     ]);
//     if (!user) {
//       return NextResponse.json(
//         { error: "Unauthorized" },
//         { status: 403 }
//       );
//     }

//     const {
//       completedSteps,
//       skippedSteps,
//       doNotShowAgain,
//       currentStep,
//       isCompleted,
//     } = body;

//     // const updateData: any = {
//     //   "onboardingStatus.lastUpdated": new Date(),
//     // };

//     const updateData = await Settings.findOne({
//       organizationId: user.organizationId,
//     }).select("onboardingStatus");

//     updateData.onboardingStatus.lastUpdated = new Date();

//     if (completedSteps !== undefined) {
//       updateData.onboardingStatus.completedSteps = completedSteps;
//     }
//     if (skippedSteps !== undefined) {
//       updateData.onboardingStatus.skippedSteps = skippedSteps;
//     }
//     if (doNotShowAgain !== undefined) {
//       updateData.onboardingStatus.doNotShowAgain = doNotShowAgain;
//     }
//     if (currentStep !== undefined) {
//       updateData.onboardingStatus.currentStep = currentStep;
//     }
//     if (isCompleted !== undefined) {
//       updateData.onboardingStatus.isCompleted = isCompleted;
//     }

//     await updateData.save();

//     return NextResponse.json({
//       success: true,
//       onboardingStatus: updateData.onboardingStatus,
//     });
//   } catch (error) {
//     console.error("Error updating onboarding status:", error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }




export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req, "admin");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await req.json();

    const allowedFields = [
      "completedSteps",
      "skippedSteps",
      "doNotShowAgain",
      "currentStep",
      "isCompleted",
    ];

    const $set: Record<string, any> = {
      "onboardingStatus.lastUpdated": new Date(),
    };

    for (const key of allowedFields) {
      if (key in body) {
        $set[`onboardingStatus.${key}`] = body[key];
      }
    }

    const updated = await Settings.findOneAndUpdate(
      { organizationId: user.organizationId },
      { $set },
      { new: true }
    ).select("onboardingStatus");

    return NextResponse.json({
      success: true,
      onboardingStatus: updated?.onboardingStatus,
    });
  } catch (error) {
    console.error("Error updating onboarding status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
