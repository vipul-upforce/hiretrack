import { FormField } from "@/lib/models/FormField";
import connectToDatabase from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { id } = await params;
    const updatedField = await FormField.findByIdAndUpdate(id, body, {
      new: true,
    });

    if (!updatedField) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    return NextResponse.json(updatedField);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const deletedField = await FormField.findByIdAndDelete(id);
    if (!deletedField) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
