import prisma from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const slot = await prisma.timetableSlot.update({
      where: { id: parseInt(id) },
      data: {
        name:      body.name,
        startTime: body.startTime,
        endTime:   body.endTime,
      },
    });
    return NextResponse.json(slot);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.timetableSlot.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}