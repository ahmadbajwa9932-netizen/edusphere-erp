import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const cls = await prisma.class.findUnique({
      where: { id: parseInt(id) },
      include: {
        sections: { orderBy: { name: "asc" } },
        subjects: { orderBy: { name: "asc" } },
        _count: { select: { students: true } },
      },
    });
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });
    return NextResponse.json(cls);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check duplicate name (exclude current)
    const existing = await prisma.class.findFirst({
      where: { name: body.name, NOT: { id: parseInt(id) } },
    });
    if (existing) {
      return NextResponse.json({ error: "A class with this name already exists." }, { status: 409 });
    }

    const cls = await prisma.class.update({
      where: { id: parseInt(id) },
      data: { name: body.name.trim() },
      include: {
        sections: { orderBy: { name: "asc" } },
        subjects: { orderBy: { name: "asc" } },
        _count: { select: { students: true } },
      },
    });
    return NextResponse.json(cls);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    // Check if class has students
    const studentCount = await prisma.student.count({ where: { classId: parseInt(id) } });
    if (studentCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete — ${studentCount} student(s) are assigned to this class.` },
        { status: 409 }
      );
    }

    await prisma.class.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}