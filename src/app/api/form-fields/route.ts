import { FormField } from '@/lib/models/FormField';
import connectToDatabase from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const formField = await FormField.create(body);
    return NextResponse.json(formField, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const moduleType = searchParams?.get('moduleType');
    const isPermanent = searchParams?.get('isPermanent');

    const query: Partial<FormField> = {};
    if (moduleType) query.moduleType = moduleType;
    if (isPermanent) query.isPermanent = isPermanent === 'true';

    const fields = await FormField.find(query).lean().exec();
    return NextResponse.json(fields);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
