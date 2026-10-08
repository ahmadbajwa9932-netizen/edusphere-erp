import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

// GET /api/exams
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const classId   = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");
    const examType  = searchParams.get("examType");
    const status    = searchParams.get("status");
    const search    = searchParams.get("search");
    const page      = parseInt(searchParams.get("page") || "1");
    const limit     = parseInt(searchParams.get("limit") || "20");

    const where = {};
    if (classId)   where.classId   = parseInt(classId);
    if (subjectId) where.subjectId = parseInt(subjectId);
    if (examType)  where.examType  = examType;
    if (status)    where.status    = status;
    if (search)    where.title     = { contains: search };

    const [exams, total] = await Promise.all([
      prisma.exam.findMany({
        where,
        include: {
          class:   { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
          _count:  { select: { marks: true } },
        },
        orderBy: { date: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.exam.count({ where }),
    ]);

    return NextResponse.json({
      exams,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch exams" }, { status: 500 });
  }
}

// POST /api/exams
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      title, examType, classId, subjectId,
      date, startTime, duration, totalMarks,
      passingMarks, venue, status, remarks,
    } = body;

    if (!title || !classId || !subjectId || !date || !startTime || !duration || !totalMarks) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const exam = await prisma.exam.create({
      data: {
        title,
        examType:     examType    || "MIDTERM",
        classId:      parseInt(classId),
        subjectId:    parseInt(subjectId),
        date:         new Date(date),
        startTime,
        duration:     parseInt(duration),
        totalMarks:   parseInt(totalMarks),
        passingMarks: parseInt(passingMarks || 40),
        venue:        venue   || null,
        status:       status  || "SCHEDULED",
        remarks:      remarks || null,
      },
      include: {
        class:   { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(exam, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create exam" }, { status: 500 });
  }
}