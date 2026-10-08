import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const search  = searchParams.get("search") || "";

    const subjects = await prisma.subject.findMany({
      where: {
        AND: [
          classId ? { classId: parseInt(classId) } : {},
          search ? {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
            ],
          } : {},
        ],
      },
      orderBy: { name: "asc" },
      include: { class: true },
    });
    return NextResponse.json(subjects);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const subject = await prisma.subject.create({
      data: {
        name:        body.name.trim(),
        code:        body.code?.trim() || null,
        description: body.description?.trim() || null,
        classId:     parseInt(body.classId),
      },
      include: { class: true },
    });

    return NextResponse.json(subject, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}