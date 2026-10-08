import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

// GET /api/report-cards
// Query params: classId (required), examType?, search?, page?, limit?
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const classId  = searchParams.get("classId");
    const examType = searchParams.get("examType");
    const search   = searchParams.get("search");
    const page     = parseInt(searchParams.get("page")  || "1");
    const limit    = parseInt(searchParams.get("limit") || "30");

    if (!classId) {
      return NextResponse.json({ error: "classId is required" }, { status: 400 });
    }

    // 1. Fetch all exams for this class (optionally filtered by type)
    const examWhere = {
      classId: parseInt(classId),
      status:  "COMPLETED",
    };
    if (examType) examWhere.examType = examType;

    const exams = await prisma.exam.findMany({
      where:   examWhere,
      include: { subject: { select: { id: true, name: true } } },
      orderBy: { date: "asc" },
    });

    const gradeConfigs = await prisma.gradeConfig.findMany({ orderBy: { order: "asc" } });

    if (exams.length === 0) {
      return NextResponse.json({
        exams:      [],
        students:   [],
        summary:    { total: 0, passed: 0, failed: 0, topScorer: null },
        page:       1,
        totalPages: 1,
        total:      0,
      });
    }

    // 2. Fetch students of this class
    const studentWhere = { classId: parseInt(classId) };
    if (search) {
      studentWhere.OR = [
        { firstName:  { contains: search } },
        { lastName:   { contains: search } },
        { rollNumber: { contains: search } },
        { studentId:  { contains: search } },
      ];
    }

    const allStudents = await prisma.student.findMany({
      where:   studentWhere,
      include: {
        examMarks: {
          where:   { examId: { in: exams.map((e) => e.id) } },
          include: { exam: { select: { id: true, totalMarks: true, passingMarks: true, subjectId: true, examType: true } } },
        },
      },
      orderBy: [{ rollNumber: "asc" }, { firstName: "asc" }],
    });

    const total      = allStudents.length;
    const totalPages = Math.ceil(total / limit);
    const students   = allStudents.slice((page - 1) * limit, page * limit);

    // 3. Build per-student report card
    const studentCards = students.map((student) => {
      // Group marks by exam
      const examResults = exams.map((exam) => {
        const mark        = student.examMarks.find((m) => m.examId === exam.id);
        const obtained    = mark?.marksObtained ?? null;
        const isAbsent    = mark?.isAbsent      ?? false;
        const percentage  = obtained !== null ? ((obtained / exam.totalMarks) * 100) : null;
        const passed      = obtained !== null && !isAbsent && obtained >= exam.passingMarks;

        return {
          examId:       exam.id,
          examTitle:    exam.title ?? exam.subject?.name,
          subjectName:  exam.subject?.name,
          examType:     exam.examType,
          totalMarks:   exam.totalMarks,
          passingMarks: exam.passingMarks,
          obtained:     isAbsent ? null : obtained,
          isAbsent,
          percentage:   percentage !== null ? parseFloat(percentage.toFixed(1)) : null,
          grade: percentage !== null && !isAbsent ? computeGrade(percentage, gradeConfigs) : (isAbsent ? "AB" : "—"),
          passed,
        };
      });

      // Aggregate totals
      const gradedExams    = examResults.filter((r) => r.obtained !== null && !r.isAbsent);
      const totalObtained  = gradedExams.reduce((sum, r) => sum + r.obtained, 0);
      const totalPossible  = gradedExams.reduce((sum, r) => sum + r.totalMarks, 0);
      const overallPct     = totalPossible > 0
        ? parseFloat(((totalObtained / totalPossible) * 100).toFixed(1))
        : null;
      const overallGrade = overallPct !== null ? computeGrade(overallPct, gradeConfigs) : "—";
      const failedSubjects = examResults.filter((r) => !r.isAbsent && r.obtained !== null && !r.passed).length;
      const absentCount    = examResults.filter((r) => r.isAbsent).length;
      const overallPassed  = failedSubjects === 0 && gradedExams.length > 0;

      return {
        studentId:    student.id,
        studentCode:  student.studentId,
        firstName:    student.firstName,
        lastName:     student.lastName,
        rollNumber:   student.rollNumber,
        section:      student.section,
        examResults,
        totalObtained,
        totalPossible,
        overallPct,
        overallGrade,
        failedSubjects,
        absentCount,
        overallPassed,
      };
    });

    // 4. Class-level summary
    const gradedStudents = studentCards.filter((s) => s.overallPct !== null);
    const passedStudents = studentCards.filter((s) => s.overallPassed).length;
    const failedStudents = studentCards.filter(
      (s) => !s.overallPassed && s.gradedExams > 0
    ).length;
    const classAvg = gradedStudents.length
      ? parseFloat(
          (gradedStudents.reduce((sum, s) => sum + s.overallPct, 0) / gradedStudents.length).toFixed(1)
        )
      : null;
    const topScorer = gradedStudents.length
      ? gradedStudents.reduce((top, s) => (s.overallPct > top.overallPct ? s : top), gradedStudents[0])
      : null;

    return NextResponse.json({
      exams:      exams.map((e) => ({ id: e.id, title: e.title, subjectName: e.subject?.name, examType: e.examType, totalMarks: e.totalMarks })),
      students:   studentCards,
      summary: {
        total:         total,
        passed:        passedStudents,
        classAvg,
        topScorer:     topScorer ? `${topScorer.firstName} ${topScorer.lastName || ""}`.trim() : null,
        topScorerPct:  topScorer?.overallPct ?? null,
      },
      page,
      totalPages,
      total,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch report cards" }, { status: 500 });
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