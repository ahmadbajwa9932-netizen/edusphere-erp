// src/app/api/leaves/route.js

import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

/**
 * GET /api/leaves
 *   applicantType  = STUDENT | TEACHER   (optional)
 *   status         = PENDING | APPROVED | REJECTED | CANCELLED (optional)
 *   leaveType      = SICK | CASUAL | ...  (optional)
 *   search         = string              (name search, optional)
 *   classId        = number              (student only, optional)
 *   department     = string              (teacher only, optional)
 *   from           = date string         (optional)
 *   to             = date string         (optional)
 *   page           = number              (default 1)
 *   limit          = number              (default 15)
 *
 * POST /api/leaves  — create a leave request
 */

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const applicantType = searchParams.get("applicantType");
    const status        = searchParams.get("status");
    const leaveType     = searchParams.get("leaveType");
    const search        = searchParams.get("search") || "";
    const classId       = searchParams.get("classId");
    const department    = searchParams.get("department");
    const from          = searchParams.get("from");
    const to            = searchParams.get("to");
    const page          = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit         = Math.max(1, parseInt(searchParams.get("limit") || "15"));
    const skip          = (page - 1) * limit;

    const where = {
      ...(applicantType && { applicantType }),
      ...(status        && { status }),
      ...(leaveType     && { leaveType }),
      ...(from || to) && {
        fromDate: {
          ...(from && { gte: new Date(from) }),
          ...(to   && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
        },
      },
      // Search by applicant name
      ...(search && {
        OR: [
          {
            student: {
              OR: [
                { firstName: { contains: search } },
                { lastName:  { contains: search } },
                { studentId: { contains: search } },
              ],
            },
          },
          {
            teacher: {
              OR: [
                { firstName:  { contains: search } },
                { lastName:   { contains: search } },
                { employeeId: { contains: search } },
              ],
            },
          },
          {
            staff: {
              OR: [
                { firstName:  { contains: search } },
                { lastName:   { contains: search } },
                { employeeId: { contains: search } },
              ],
            },
          },
        ],
      }),
      ...(classId    && { student: { classId: parseInt(classId) } }),
      ...(department && {
        OR: [
          { teacher: { department } },
          { staff:   { department } },
        ],
      }),
    };

    const [leaves, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          student: {
            select: {
              id: true, studentId: true,
              firstName: true, lastName: true,
              section: true,
              class: { select: { id: true, name: true } },
            },
          },
          teacher: {
            select: {
              id: true, employeeId: true,
              firstName: true, lastName: true,
              department: true, designation: true,
            },
          },
          staff: {
            select: {
              id: true, employeeId: true,
              firstName: true, lastName: true,
              department: true, designation: true,
            },
          },
        },
        orderBy: { appliedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    // Summary counts (full filter, no pagination)
    const summaryRaw = await prisma.leaveRequest.groupBy({
      by: ["status"],
      where,
      _count: { status: true },
    });
    const summary = { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 };
    summaryRaw.forEach((s) => { summary[s.status] = s._count.status; });

    // Departments for filter dropdown
    const deptRows = await prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      select: { department: true },
      distinct: ["department"],
      orderBy: { department: "asc" },
    });

    return NextResponse.json({
      leaves: leaves.map((l) => ({
        id:            l.id,
        leaveType:     l.leaveType,
        applicantType: l.applicantType,
        reason:        l.reason,
        fromDate:      l.fromDate,
        toDate:        l.toDate,
        totalDays:     l.totalDays,
        status:        l.status,
        remarks:       l.remarks,
        appliedAt:     l.appliedAt,
        // student fields
        studentId:     l.student?.studentId   || null,
        studentDbId:   l.student?.id          || null,
        // teacher fields
        employeeId:    l.teacher?.employeeId  || l.staff?.employeeId  || null,
        teacherDbId:   l.teacher?.id          || null,
        staffDbId:     l.staff?.id            || null,
        // shared
        firstName:     l.student?.firstName  || l.teacher?.firstName  || l.staff?.firstName  || "",
        lastName:      l.student?.lastName   || l.teacher?.lastName   || l.staff?.lastName   || "",
        className:     l.student?.class?.name || null,
        section:       l.student?.section     || null,
        department:    l.teacher?.department  || l.staff?.department  || null,
        designation:   l.teacher?.designation || l.staff?.designation || null,
      })),
      summary,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      departments: deptRows.map((d) => d.department),
    });
  } catch (err) {
    console.error("[leaves GET]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      applicantType, leaveType, reason,
      fromDate, toDate, studentId, teacherId, staffId,
    } = body;

    if (!applicantType || !leaveType || !reason || !fromDate || !toDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (applicantType === "STUDENT" && !studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }
    if (applicantType === "TEACHER" && !teacherId) {
      return NextResponse.json({ error: "teacherId is required" }, { status: 400 });
    }
    if (applicantType === "STAFF" && !staffId) {
      return NextResponse.json({ error: "staffId is required" }, { status: 400 });
    }

    const from  = new Date(fromDate);
    const to    = new Date(toDate);
    const msDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.max(1, Math.round((to - from) / msDay) + 1);

    const leave = await prisma.leaveRequest.create({
      data: {
        applicantType,
        leaveType,
        reason,
        fromDate: from,
        toDate:   to,
        totalDays,
        ...(studentId && { studentId: parseInt(studentId) }),
      ...(teacherId && { teacherId: parseInt(teacherId) }),
      ...(staffId   && { staffId:   parseInt(staffId)   }),
      },
    });

    return NextResponse.json(leave, { status: 201 });
  } catch (err) {
    console.error("[leaves POST]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}