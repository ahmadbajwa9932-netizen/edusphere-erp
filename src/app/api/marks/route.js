// src/app/api/exams/marks/route.js
import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

// GET /api/exams/marks?examId=1
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get("examId");

    if (!examId) {
      return NextResponse.json({ error: "examId is required" }, { status: 400 });
    }

    // Get the exam with class info so we know which students belong
    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(examId) },
      include: {
        class: true,
        subject: true,
        marks: {
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                firstName: true,
                lastName: true,
                rollNumber: true,
                section: true,
              },
            },
          },
          orderBy: { student: { rollNumber: "asc" } },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Get all students of that class
    const students = await prisma.student.findMany({
      where: { classId: exam.classId, status: "ACTIVE" },
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
        rollNumber: true,
        section: true,
      },
      orderBy: { rollNumber: "asc" },
    });

    // Merge marks into students
    const marksMap = {};
    exam.marks.forEach((m) => {
      marksMap[m.studentId] = m;
    });

    const studentsWithMarks = students.map((s) => ({
      ...s,
      markId:        marksMap[s.id]?.id || null,
      marksObtained: marksMap[s.id]?.marksObtained ?? "",
      isAbsent:      marksMap[s.id]?.isAbsent ?? false,
      remarks:       marksMap[s.id]?.remarks ?? "",
    }));

    return NextResponse.json({
      exam: {
        id:           exam.id,
        title:        exam.title,
        examType:     exam.examType,
        totalMarks:   exam.totalMarks,
        passingMarks: exam.passingMarks,
        date:         exam.date,
        startTime:    exam.startTime,
        status:       exam.status,
        class:        exam.class,
        subject:      exam.subject,
      },
      students: studentsWithMarks,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/exams/marks  — bulk upsert
export async function POST(req) {
  try {
    const body = await req.json();
    const { examId, marks } = body;
    // marks: [{ studentId, marksObtained, isAbsent, remarks }]

    if (!examId || !Array.isArray(marks)) {
      return NextResponse.json({ error: "examId and marks[] required" }, { status: 400 });
    }

    const exam = await prisma.exam.findUnique({ where: { id: parseInt(examId) } });
    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

    // Validate marks
    for (const m of marks) {
      if (!m.isAbsent && m.marksObtained !== null && m.marksObtained !== "") {
        if (parseFloat(m.marksObtained) > exam.totalMarks) {
          return NextResponse.json(
            { error: `Marks for student ${m.studentId} exceed total marks (${exam.totalMarks})` },
            { status: 400 }
          );
        }
      }
    }

    // Upsert each mark
    const ops = marks.map((m) =>
      prisma.examMark.upsert({
        where: { examId_studentId: { examId: parseInt(examId), studentId: m.studentId } },
        update: {
          marksObtained: m.isAbsent ? null : (m.marksObtained !== "" ? parseFloat(m.marksObtained) : null),
          isAbsent:      m.isAbsent,
          remarks:       m.remarks || null,
        },
        create: {
          examId:        parseInt(examId),
          studentId:     m.studentId,
          marksObtained: m.isAbsent ? null : (m.marksObtained !== "" ? parseFloat(m.marksObtained) : null),
          isAbsent:      m.isAbsent,
          remarks:       m.remarks || null,
        },
      })
    );

    await prisma.$transaction(ops);

    // Mark exam as COMPLETED if it was ONGOING
    if (exam.status === "ONGOING") {
      await prisma.exam.update({
        where: { id: parseInt(examId) },
        data: { status: "COMPLETED" },
      });
    }

    return NextResponse.json({ success: true, count: marks.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}