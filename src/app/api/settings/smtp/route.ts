import { NextRequest, NextResponse } from 'next/server';
import dbConnect, { Settings } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const userCookie = req.cookies.get('user');
    const userData = JSON.parse(userCookie?.value || '{}');
    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!Settings) {
      return NextResponse.json({ error: 'Settings Model Not Found' }, { status: 404 });
    }
    const settings = await Settings.findOne({ organizationId: userData.organizationId });

    if (!settings) {
      return NextResponse.json({
        "smtp_host": "",
        "smtp_port": "",
        "smtp_user": "",
        "smtp_password": "",
        "smtp_from": "",
        "mailProvider": "",
        "resend_api_key": "",
        "resend_from": "",
        "resend_reply_to": ""
      });
    }

    return NextResponse.json(settings.mailConfig);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const userCookie = req.cookies.get('user');
    const userData = JSON.parse(userCookie?.value || '{}');

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!Settings) {
      return NextResponse.json({ error: 'Settings Model Not Found' }, { status: 404 });
    }

    const mailConfig = await req.json();

    let mailConfigObj;

    if(mailConfig.mailProvider=="smtp"){
      mailConfigObj = {
        smtp_user: mailConfig.smtp_user,
        smtp_password: mailConfig.smtp_password,       
        smtp_host: mailConfig.smtp_host,
        smtp_port: mailConfig.smtp_port,
        smtp_from: mailConfig.smtp_from,
        mailProvider: mailConfig.mailProvider
      }
    }else if(mailConfig.mailProvider=="resend"){
      mailConfigObj={
        mailProvider: mailConfig.mailProvider,
        resend_api_key: mailConfig.resend_api_key,
        resend_from: mailConfig.resend_from,
        resend_reply_to: mailConfig.resend_reply_to
      }
    }

    const updatedUser = await Settings.findOneAndUpdate(
      {
        organizationId: userData.organizationId
      },
      { mailConfig: mailConfigObj },
      {
        new: true,
        runValidators: true,
        upsert: true
      }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Settings updated successfully' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
