import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId   = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");
    const status    = searchParams.get("status");
    const term      = searchParams.get("term");
    const search    = searchParams.get("search") || "";

    const syllabus = await prisma.syllabus.findMany({
      where: {
        AND: [
          classId   ? { classId:   parseInt(classId) }   : {},
          subjectId ? { subjectId: parseInt(subjectId) } : {},
          status    ? { status }                         : {},
          term      ? { term }                           : {},
          search    ? {
            OR: [
              { title:       { contains: search } },
              { description: { contains: search } },
            ],
          } : {},
        ],
      },
      include: {
        class:   true,
        subject: true,
      },
      orderBy: [{ classId: "asc" }, { term: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(syllabus);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const syllabus = await prisma.syllabus.create({
      data: {
        classId:     parseInt(body.classId),
        subjectId:   parseInt(body.subjectId),
        term:        body.term.trim(),
        title:       body.title.trim(),
        description: body.description?.trim() || null,
        status:      body.status || "PLANNED",
        startDate:   body.startDate ? new Date(body.startDate) : null,
        endDate:     body.endDate   ? new Date(body.endDate)   : null,
      },
      include: {
        class:   true,
        subject: true,
      },
    });

    return NextResponse.json(syllabus, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}