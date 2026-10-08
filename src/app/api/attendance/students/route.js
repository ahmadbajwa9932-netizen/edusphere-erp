// src/app/api/attendance/students/route.js

import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

// GET /api/attendance/students?date=2024-01-15&classId=1
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const classId = searchParams.get("classId");

    if (!date || !classId) {
      return NextResponse.json({ error: "date and classId are required" }, { status: 400 });
    }

    const targetDate = new Date(date);

    // Get all students for this class
    const students = await prisma.student.findMany({
      where: {
        classId: parseInt(classId),
        status: "ACTIVE",
      },
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
        section: true,
        rollNumber: true,
        attendance: {
          where: { date: targetDate },
          select: { id: true, status: true, remarks: true },
        },
      },
      orderBy: [{ section: "asc" }, { rollNumber: "asc" }, { firstName: "asc" }],
    });

    // Merge attendance status into each student
    const result = students.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      firstName: s.firstName,
      lastName: s.lastName,
      section: s.section,
      rollNumber: s.rollNumber,
      attendanceId: s.attendance[0]?.id || null,
      status: s.attendance[0]?.status || null, // null = not marked yet
      remarks: s.attendance[0]?.remarks || "",
    }));

    // Summary counts
    const summary = {
      total: result.length,
      present: result.filter((s) => s.status === "PRESENT").length,
      absent: result.filter((s) => s.status === "ABSENT").length,
      late: result.filter((s) => s.status === "LATE").length,
      leave: result.filter((s) => s.status === "LEAVE").length,
      unmarked: result.filter((s) => s.status === null).length,
    };

    return NextResponse.json({ students: result, summary });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/attendance/students  — bulk save (upsert)
export async function POST(req) {
  try {
    const { date, records } = await req.json();
    // records: [{ studentId, status, remarks }]

    if (!date || !records?.length) {
      return NextResponse.json({ error: "date and records are required" }, { status: 400 });
    }

    const targetDate = new Date(date);

    const ops = records.map((r) =>
      prisma.studentAttendance.upsert({
        where: { studentId_date: { studentId: r.studentId, date: targetDate } },
        update: { status: r.status, remarks: r.remarks || "" },
        create: {
          studentId: r.studentId,
          date: targetDate,
          status: r.status,
          remarks: r.remarks || "",
        },
      })
    );

    await prisma.$transaction(ops);

    return NextResponse.json({ success: true, saved: records.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}