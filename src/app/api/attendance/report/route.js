// src/app/api/attendance/report/route.js

import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

/**
 * GET /api/attendance/report
 * Query params:
 *   type        = "student" | "teacher"          (required)
 *   from        = "2024-01-01"                   (required)
 *   to          = "2024-01-31"                   (required)
 *   classId     = number                         (student only, optional)
 *   teacherId   = number                         (teacher only, optional)
 *   department  = string                         (teacher only, optional)
 *   status      = PRESENT|ABSENT|LATE|LEAVE      (optional)
 *   page        = number                         (default 1)
 *   limit       = number                         (default 15)
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const type       = searchParams.get("type") || "student";
    const from       = searchParams.get("from");
    const to         = searchParams.get("to");
    const classId    = searchParams.get("classId");
    const teacherId  = searchParams.get("teacherId");
    const department = searchParams.get("department");
    const status     = searchParams.get("status");
    const page       = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit      = Math.max(1, parseInt(searchParams.get("limit") || "15"));
    const skip       = (page - 1) * limit;

    if (!from || !to) {
      return NextResponse.json({ error: "from and to dates are required" }, { status: 400 });
    }

    const fromDate = new Date(from);
    const toDate   = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    // ── STUDENT REPORT ──────────────────────────────────────────────────────
    if (type === "student") {
      const where = {
        date: { gte: fromDate, lte: toDate },
        ...(status    && { status }),
        ...(classId   && { student: { classId: parseInt(classId) } }),
      };

      const [records, total] = await Promise.all([
        prisma.studentAttendance.findMany({
          where,
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                firstName: true,
                lastName: true,
                section: true,
                rollNumber: true,
                class: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: [{ date: "desc" }, { student: { firstName: "asc" } }],
          skip,
          take: limit,
        }),
        prisma.studentAttendance.count({ where }),
      ]);

      // ── Summary counts for the filtered date range (no pagination) ────────
      const summary = await prisma.studentAttendance.groupBy({
        by: ["status"],
        where,
        _count: { status: true },
      });

      const summaryMap = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 };
      summary.forEach((s) => { summaryMap[s.status] = s._count.status; });
      const totalRecords = Object.values(summaryMap).reduce((a, b) => a + b, 0);

      // ── Per-student aggregation (for the summary section) ─────────────────
      const studentSummary = await prisma.studentAttendance.groupBy({
        by: ["studentId", "status"],
        where,
        _count: { status: true },
      });

      // Build a map: studentId → { PRESENT, ABSENT, LATE, LEAVE, total }
      const studentMap = {};
      studentSummary.forEach(({ studentId, status: st, _count }) => {
        if (!studentMap[studentId]) studentMap[studentId] = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 };
        studentMap[studentId][st] = _count.status;
      });

      return NextResponse.json({
        type: "student",
        records: records.map((r) => ({
          id:          r.id,
          date:        r.date,
          status:      r.status,
          remarks:     r.remarks,
          studentId:   r.student.studentId,
          studentDbId: r.student.id,
          firstName:   r.student.firstName,
          lastName:    r.student.lastName,
          section:     r.student.section,
          rollNumber:  r.student.rollNumber,
          className:   r.student.class?.name || "—",
          classId:     r.student.class?.id,
        })),
        summary: { ...summaryMap, total: totalRecords },
        studentMap,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    }

    // ── STAFF REPORT ────────────────────────────────────────────────────────
    if (type === "staff") {
      const where = {
        date: { gte: fromDate, lte: toDate },
        ...(status     && { status }),
        ...(department && { staff: { department } }),
      };

      const [records, total] = await Promise.all([
        prisma.staffAttendance.findMany({
          where,
          include: {
            staff: {
              select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                department: true,
                designation: true,
              },
            },
          },
          orderBy: [{ date: "desc" }, { staff: { firstName: "asc" } }],
          skip,
          take: limit,
        }),
        prisma.staffAttendance.count({ where }),
      ]);

      const summary = await prisma.staffAttendance.groupBy({
        by: ["status"],
        where,
        _count: { status: true },
      });

      const summaryMap = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 };
      summary.forEach((s) => { summaryMap[s.status] = s._count.status; });
      const totalRecords = Object.values(summaryMap).reduce((a, b) => a + b, 0);

      const deptRows = await prisma.staff.findMany({
        where: { status: "ACTIVE" },
        select: { department: true },
        distinct: ["department"],
        orderBy: { department: "asc" },
      });

      return NextResponse.json({
        type: "staff",
        records: records.map((r) => ({
          id:          r.id,
          date:        r.date,
          status:      r.status,
          checkIn:     r.checkIn,
          checkOut:    r.checkOut,
          remarks:     r.remarks,
          staffDbId:   r.staff.id,
          employeeId:  r.staff.employeeId,
          firstName:   r.staff.firstName,
          lastName:    r.staff.lastName,
          department:  r.staff.department,
          designation: r.staff.designation,
        })),
        summary: { ...summaryMap, total: totalRecords },
        departments: deptRows.map((d) => d.department).filter(Boolean),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    }

    // ── TEACHER REPORT ──────────────────────────────────────────────────────
    const where = {
      date: { gte: fromDate, lte: toDate },
      ...(status     && { status }),
      ...(teacherId  && { teacherId: parseInt(teacherId) }),
      ...(department && { teacher: { department } }),
    };

    const [records, total] = await Promise.all([
      prisma.teacherAttendance.findMany({
        where,
        include: {
          teacher: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              department: true,
              designation: true,
            },
          },
        },
        orderBy: [{ date: "desc" }, { teacher: { firstName: "asc" } }],
        skip,
        take: limit,
      }),
      prisma.teacherAttendance.count({ where }),
    ]);

    const summary = await prisma.teacherAttendance.groupBy({
      by: ["status"],
      where,
      _count: { status: true },
    });

    const summaryMap = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 };
    summary.forEach((s) => { summaryMap[s.status] = s._count.status; });
    const totalRecords = Object.values(summaryMap).reduce((a, b) => a + b, 0);

    // Unique departments for filter dropdown
    const deptRows = await prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      select: { department: true },
      distinct: ["department"],
      orderBy: { department: "asc" },
    });

    return NextResponse.json({
      type: "teacher",
      records: records.map((r) => ({
        id:          r.id,
        date:        r.date,
        status:      r.status,
        checkIn:     r.checkIn,
        checkOut:    r.checkOut,
        remarks:     r.remarks,
        teacherDbId: r.teacher.id,
        employeeId:  r.teacher.employeeId,
        firstName:   r.teacher.firstName,
        lastName:    r.teacher.lastName,
        department:  r.teacher.department,
        designation: r.teacher.designation,
      })),
      summary: { ...summaryMap, total: totalRecords },
      departments: deptRows.map((d) => d.department),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[attendance/report]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}