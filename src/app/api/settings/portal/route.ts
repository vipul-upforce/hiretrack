import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { Settings } from '@/lib/mongodb';
import { handleSingleFile } from '@/lib/fileUtils';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const userCookie = req.cookies.get('user');
    const userData = await JSON.parse(userCookie?.value || '{}');

    // console.log(userData)
    // if (!userData || userData.role !== 'admin') {
    //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    if (!Settings) {
      return NextResponse.json({ error: 'Settings Model Not Found' }, { status: 404 });
    }
    const settings = await Settings.findOne({ organizationId: userData.organizationId });
    
    if (!settings) {
      return NextResponse.json(
        {
          fileStorage: null,
          portalLogo: null,
          portalName: null
        }
      );
    }
    
    const response = {
      fileStorage: settings.fileStorage,
      portalLogo: settings.portalConfigs?.portalLogo || null,
      portalName: settings.portalConfigs?.portalName || ''
    };
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
    let fileStorage='local';
    let organizationId;
  try {
    await dbConnect();
    const userCookie = req.cookies.get('user');
    const userData = JSON.parse(userCookie?.value || '{}');

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    fileStorage = userData.fileStorage || 'local';
    organizationId = userData.organizationId || "";

    if (!Settings) {
      return NextResponse.json({ error: 'Settings Model Not Found' }, { status: 404 });
    }

    const data = await req.json();
    let uploadedLogo;
    
    if (data.portalLogo) {
        uploadedLogo = await handleSingleFile(data.portalLogo, fileStorage, organizationId, req);
    }

    const updatedPortal={
        portalLogo: uploadedLogo,
        portalName: data.portalName
    };

    const updatedSettings = await Settings.findOneAndUpdate(
      {
        organizationId: userData.organizationId
      },
      { portalConfigs: updatedPortal },
      {
        new: true,
        runValidators: true,
        upsert: true
      }
    );

    if (!updatedSettings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Settings updated successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
