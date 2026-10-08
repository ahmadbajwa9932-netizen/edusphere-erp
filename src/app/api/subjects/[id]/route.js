import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const subject = await prisma.subject.update({
      where: { id: parseInt(id) },
      data: {
        name:        body.name.trim(),
        code:        body.code?.trim() || null,
        description: body.description?.trim() || null,
        classId:     parseInt(body.classId),
      },
      include: { class: true },
    });
    return NextResponse.json(subject);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.subject.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}