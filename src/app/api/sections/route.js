import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    const sections = await prisma.section.findMany({
      where: classId ? { classId: parseInt(classId) } : {},
      orderBy: { name: "asc" },
      include: { class: true },
    });
    return NextResponse.json(sections);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Check duplicate section in same class
    const existing = await prisma.section.findUnique({
      where: { classId_name: { classId: parseInt(body.classId), name: body.name.trim().toUpperCase() } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This section already exists in the selected class." },
        { status: 409 }
      );
    }

    const section = await prisma.section.create({
      data: {
        name:     body.name.trim().toUpperCase(),
        classId:  parseInt(body.classId),
        capacity: parseInt(body.capacity) || 40,
      },
      include: { class: true },
    });

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}