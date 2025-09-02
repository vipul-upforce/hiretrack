import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Settings } from "@/lib/mongodb";
import { verifyAndDecryptToken } from "@/app/actions/auth";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const decryptedResponse = await verifyAndDecryptToken(token);
    if (!decryptedResponse.success) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = decryptedResponse.user;
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const settings = await Settings.findOne({
      organizationId: user.organizationId
    });

    if (!settings) {
      return NextResponse.json({ error: "Settings not found" }, { status: 404 });
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

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();

    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const decryptedResponse = await verifyAndDecryptToken(token);
    if (!decryptedResponse.success) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = decryptedResponse.user;
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      completedSteps,
      skippedSteps,
      doNotShowAgain,
      currentStep,
      isCompleted
    } = body;

    // const updateData: any = {
    //   "onboardingStatus.lastUpdated": new Date(),
    // };

    const updateData = await Settings.findOne(
      { organizationId: user.organizationId }
    );

    updateData.onboardingStatus.lastUpdated = new Date();

    if (completedSteps !== undefined) {
      updateData.onboardingStatus.completedSteps = completedSteps;
    }
    if (skippedSteps !== undefined) {
      updateData.onboardingStatus.skippedSteps = skippedSteps;
    }
    if (doNotShowAgain !== undefined) {
      updateData.onboardingStatus.doNotShowAgain = doNotShowAgain;
    }
    if (currentStep !== undefined) {
      updateData.onboardingStatus.currentStep = currentStep;
    }
    if (isCompleted !== undefined) {
      updateData.onboardingStatus.isCompleted = isCompleted;
    }

    await updateData.save();


    return NextResponse.json({
      success: true,
      onboardingStatus: updateData.onboardingStatus
    });

  } catch (error) {
    console.error("Error updating onboarding status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}