import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const slots = await prisma.timetableSlot.findMany({
      orderBy: { order: "asc" },
      include: { entries: { include: { teacher: true, class: true } } },
    });
    return NextResponse.json(slots);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Get max order
    const last = await prisma.timetableSlot.findFirst({ orderBy: { order: "desc" } });
    const order = (last?.order ?? 0) + 1;

    const slot = await prisma.timetableSlot.create({
      data: {
        name: body.name,
        startTime: body.startTime,
        endTime: body.endTime,
        order,
      },
    });
    return NextResponse.json(slot, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}