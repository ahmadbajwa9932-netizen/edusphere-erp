// src/app/api/attendance/teachers/route.js

import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

// GET /api/attendance/teachers?date=2024-01-15
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const department = searchParams.get("department");

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const targetDate = new Date(date);

    const where = { status: "ACTIVE" };
    if (department) where.department = department;

    const teachers = await prisma.teacher.findMany({
      where,
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        department: true,
        designation: true,
        attendance: {
          where: { date: targetDate },
          select: { id: true, status: true, checkIn: true, checkOut: true, remarks: true },
        },
      },
      orderBy: [{ department: "asc" }, { firstName: "asc" }],
    });

    const result = teachers.map((t) => ({
      id: t.id,
      employeeId: t.employeeId,
      firstName: t.firstName,
      lastName: t.lastName,
      department: t.department,
      designation: t.designation,
      attendanceId: t.attendance[0]?.id || null,
      status: t.attendance[0]?.status || null,
      checkIn: t.attendance[0]?.checkIn || "",
      checkOut: t.attendance[0]?.checkOut || "",
      remarks: t.attendance[0]?.remarks || "",
    }));

    const summary = {
      total: result.length,
      present: result.filter((t) => t.status === "PRESENT").length,
      absent: result.filter((t) => t.status === "ABSENT").length,
      late: result.filter((t) => t.status === "LATE").length,
      leave: result.filter((t) => t.status === "LEAVE").length,
      unmarked: result.filter((t) => t.status === null).length,
    };

    // Get unique departments for filter
    const departments = [...new Set(teachers.map((t) => t.department))].sort();

    return NextResponse.json({ teachers: result, summary, departments });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/attendance/teachers — bulk save (upsert)
export async function POST(req) {
  try {
    const { date, records } = await req.json();
    // records: [{ teacherId, status, checkIn, checkOut, remarks }]

    if (!date || !records?.length) {
      return NextResponse.json({ error: "date and records are required" }, { status: 400 });
    }

    const targetDate = new Date(date);

    const ops = records.map((r) =>
      prisma.teacherAttendance.upsert({
        where: { teacherId_date: { teacherId: r.teacherId, date: targetDate } },
        update: {
          status: r.status,
          checkIn: r.checkIn || null,
          checkOut: r.checkOut || null,
          remarks: r.remarks || "",
        },
        create: {
          teacherId: r.teacherId,
          date: targetDate,
          status: r.status,
          checkIn: r.checkIn || null,
          checkOut: r.checkOut || null,
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