import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const classId   = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");
    const examId    = searchParams.get("examId");
    const search    = searchParams.get("search");
    const status    = searchParams.get("status"); // "PASS" | "FAIL" | "ABSENT"
    const page      = parseInt(searchParams.get("page") || "1");
    const limit     = parseInt(searchParams.get("limit") || "30");

    if (!examId) {
      return NextResponse.json({ error: "examId is required" }, { status: 400 });
    }

    // Fetch the exam first
    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(examId) },
      include: {
        class:   { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const gradeConfigs = await prisma.gradeConfig.findMany({ orderBy: { order: "asc" } });

    // Build student filter
    const studentWhere = { classId: exam.classId };
    if (search) {
      studentWhere.OR = [
        { firstName:  { contains: search } },
        { lastName:   { contains: search } },
        { rollNumber: { contains: search } },
        { studentId:  { contains: search } },
      ];
    }

    // Fetch all students of the class with their marks for this exam
    const students = await prisma.student.findMany({
      where: studentWhere,
      include: {
        examMarks: {
          where: { examId: parseInt(examId) },
        },
      },
      orderBy: [{ rollNumber: "asc" }, { firstName: "asc" }],
    });

    // Compute results
    let results = students.map((student) => {
      const mark = student.examMarks[0] || null;
      const marksObtained = mark?.marksObtained ?? null;
      const isAbsent      = mark?.isAbsent ?? false;

      let resultStatus = "PENDING";
      let percentage   = null;
      let grade        = null;

      if (isAbsent) {
        resultStatus = "ABSENT";
      } else if (marksObtained !== null) {
        percentage   = ((marksObtained / exam.totalMarks) * 100).toFixed(1);
        resultStatus = marksObtained >= exam.passingMarks ? "PASS" : "FAIL";
        grade= computeGrade(parseFloat(percentage), gradeConfigs);
      }

      return {
        studentId:    student.id,
        studentCode:  student.studentId,
        firstName:    student.firstName,
        lastName:     student.lastName,
        rollNumber:   student.rollNumber,
        section:      student.section,
        marksObtained,
        totalMarks:   exam.totalMarks,
        passingMarks: exam.passingMarks,
        percentage,
        grade,
        status:       resultStatus,
        isAbsent,
        remarks:      mark?.remarks || null,
      };
    });

    // Filter by status
    if (status) results = results.filter((r) => r.status === status);

    // Summary stats (before pagination)
    const total   = results.length;
    const passed  = results.filter((r) => r.status === "PASS").length;
    const failed  = results.filter((r) => r.status === "FAIL").length;
    const absent  = results.filter((r) => r.status === "ABSENT").length;
    const pending = results.filter((r) => r.status === "PENDING").length;
    const marksArr = results
      .filter((r) => r.marksObtained !== null && !r.isAbsent)
      .map((r) => parseFloat(r.marksObtained));
    const average  = marksArr.length
      ? (marksArr.reduce((a, b) => a + b, 0) / marksArr.length).toFixed(1)
      : null;
    const highest  = marksArr.length ? Math.max(...marksArr) : null;
    const lowest   = marksArr.length ? Math.min(...marksArr) : null;
    const passRate = total - absent - pending > 0
      ? ((passed / (total - absent - pending)) * 100).toFixed(1)
      : null;

    // Paginate
    const paginated    = results.slice((page - 1) * limit, page * limit);
    const totalPages   = Math.ceil(total / limit);

    return NextResponse.json({
      exam,
      results:    paginated,
      summary: { total, passed, failed, absent, pending, average, highest, lowest, passRate },
      page,
      totalPages,
      total,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
  }
}

function computeGrade(pct, configs = []) {
  if (!configs || configs.length === 0) {
    if (pct >= 90) return "A+";
    if (pct >= 80) return "A";
    if (pct >= 70) return "B";
    if (pct >= 60) return "C";
    if (pct >= 50) return "D";
    return "F";
  }
  const match = configs.find((c) => pct >= c.minPercent && pct <= c.maxPercent);
  return match?.grade || "F";
}