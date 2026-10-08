import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const section = await prisma.section.update({
      where: { id: parseInt(id) },
      data: {
        name:     body.name.trim().toUpperCase(),
        capacity: parseInt(body.capacity) || 40,
      },
      include: { class: true },
    });
    return NextResponse.json(section);
  } catch (error) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "This section already exists in the class." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.section.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}