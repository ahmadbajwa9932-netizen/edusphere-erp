import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId   = searchParams.get("classId");
    const teacherId = searchParams.get("teacherId");
    const day       = searchParams.get("day");

    const where = {
      ...(classId   ? { classId:   parseInt(classId) }   : {}),
      ...(teacherId ? { teacherId: parseInt(teacherId) } : {}),
      ...(day       ? { day }                            : {}),
    };

    const entries = await prisma.timetableEntry.findMany({
      where,
      include: {
        slot:    true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
        class:   true,
      },
      orderBy: [{ day: "asc" }, { slot: { order: "asc" } }],
    });

    return NextResponse.json(entries);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const entry = await prisma.timetableEntry.create({
      data: {
        slotId:    parseInt(body.slotId),
        teacherId: parseInt(body.teacherId),
        classId:   parseInt(body.classId),
        subject:   body.subject,
        day:       body.day,
      },
      include: {
        slot:    true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
        class:   true,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    // Unique constraint = conflict
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "This slot is already assigned for this class/teacher on that day." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    await prisma.timetableEntry.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}