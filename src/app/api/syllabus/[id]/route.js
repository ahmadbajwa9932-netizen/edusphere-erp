import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body   = await request.json();

    const data = {};
    if (body.classId     !== undefined) data.classId     = parseInt(body.classId);
    if (body.subjectId   !== undefined) data.subjectId   = parseInt(body.subjectId);
    if (body.term        !== undefined) data.term        = body.term.trim();
    if (body.title       !== undefined) data.title       = body.title.trim();
    if (body.description !== undefined) data.description = body.description?.trim() || null;
    if (body.status      !== undefined) data.status      = body.status;
    if (body.startDate   !== undefined) data.startDate   = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate     !== undefined) data.endDate     = body.endDate   ? new Date(body.endDate)   : null;

    const syllabus = await prisma.syllabus.update({
      where: { id: parseInt(id) },
      data,
      include: { class: true, subject: true },
    });

    return NextResponse.json(syllabus);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.syllabus.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}