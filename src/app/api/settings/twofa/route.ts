import { NextRequest, NextResponse } from "next/server";
import dbConnect, { Organization, Settings } from "@/lib/mongodb";
import { verifyAndDecryptToken } from "@/app/actions/auth";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    let organizationId = "";
    const token = req.cookies.get("auth_token");
    if (!token) {
      const url = new URL(req.url);
      organizationId = url.searchParams?.get("orgId") || "";
    }
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value)
      );
      const userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        organizationId = userData.organizationId || "";
        if (userData.role !== "admin") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
      }
    }
    if (!Settings || !Organization) {
      return NextResponse.json(
        { error: "Settings Model Not Found" },
        { status: 404 }
      );
    }

    // const totalOrgs = await Organization.countDocuments({});
    // if (totalOrgs > 1) {
    //   return NextResponse.json(
    //     {
    //       orgCount: totalOrgs,
    //       error: "There already exists multiple Organizations",
    //     },
    //     { status: 403 }
    //   );
    // }

    console.log("ORGIDDATA: ", organizationId);

    const settings = await Settings.findOne({
      // organizationId: userData.organizationId,
      organizationId: organizationId,
    });

    if (!settings) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    // console.log(settings)

    return NextResponse.json({ twoFA: settings.twoFA });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    let organizationId = "";
    const token = req.cookies.get("auth_token");

    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value)
      );
      const userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        organizationId = userData.organizationId || "";
        if (userData.role !== "admin") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
      }
    }

    if (!Settings || !Organization) {
      return NextResponse.json(
        { error: "Settings Model Not Found" },
        { status: 404 }
      );
    }

    const { enable2FA } = await req.json();

    // Check email configuration before enabling 2FA
    const settings = await Settings.findOne({ organizationId });
    
    if (enable2FA && (!settings?.mailConfig?.mailProvider || settings.mailConfig.mailProvider === "")) {
      return NextResponse.json(
        { error: "Email configuration with valid provider is required to enable 2FA" },
        { status: 400 }
      );
    }

    const updatedUser = await Settings.findOneAndUpdate(
      {
        organizationId: organizationId,
      },
      {
        twoFA: {
          enable2FA: enable2FA,
        },
      },
      {
        new: true,
        runValidators: true,
        upsert: true,
      }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Settings updated successfully" });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}