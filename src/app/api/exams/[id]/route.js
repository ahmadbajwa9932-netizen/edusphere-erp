import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

// GET /api/exams/:id
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(id) },
      include: {
        class:   { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        marks:   {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, rollNumber: true } },
          },
        },
      },
    });

    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    return NextResponse.json(exam);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch exam" }, { status: 500 });
  }
}

// PUT /api/exams/:id
export async function PUT(req, { params }) {
  try {
    const { id } = await params; // ← await params
    const body = await req.json();
    const {
      title, examType, classId, subjectId,
      date, startTime, duration, totalMarks,
      passingMarks, venue, status, remarks,
    } = body;

    const exam = await prisma.exam.update({
      where: { id: parseInt(id) },
      data: {
        title,
        examType,
        classId:      parseInt(classId),
        subjectId:    parseInt(subjectId),
        date:         new Date(date),
        startTime,
        duration:     parseInt(duration),
        totalMarks:   parseInt(totalMarks),
        passingMarks: parseInt(passingMarks ?? 40),
        venue:        venue   || null,
        status,
        remarks:      remarks || null,
      },
      include: {
        class:   { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(exam);
  } catch (err) {
    console.error(err); // ← always log the actual error
    return NextResponse.json({ error: "Failed to update exam" }, { status: 500 });
  }
}

// DELETE /api/exams/:id
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await prisma.exam.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete exam" }, { status: 500 });
  }
}