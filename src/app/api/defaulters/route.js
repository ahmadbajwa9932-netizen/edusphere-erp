import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

/**
 * GET /api/defaulters
 *
 * Returns students who have outstanding fee records (UNPAID / OVERDUE / PARTIAL)
 * grouped by student, with total outstanding balance and days overdue.
 *
 * Query params:
 *   search      = string  (student name / studentId)
 *   classId     = number
 *   month       = string  e.g. "2025-09"
 *   minDays     = number  minimum days overdue (default 0 = include all pending)
 *   severity    = "LOW" | "MEDIUM" | "HIGH"  (0-30 / 31-60 / 60+ days overdue)
 *   page        = number  (default 1)
 *   limit       = number  (default 20)
 *
 * PATCH /api/defaulters
 *   Bulk mark selected fee collection IDs as OVERDUE
 *   { ids: number[] }
 */

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search   = searchParams.get("search")   || "";
    const classId  = searchParams.get("classId");
    const month    = searchParams.get("month");
    const minDays  = parseInt(searchParams.get("minDays") || "0");
    const severity = searchParams.get("severity"); // LOW | MEDIUM | HIGH
    const page     = Math.max(1, parseInt(searchParams.get("page")  || "1"));
    const limit    = Math.max(1, parseInt(searchParams.get("limit") || "20"));
    const skip     = (page - 1) * limit;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Base where: only outstanding records
    const baseWhere = {
      status: { in: ["UNPAID", "OVERDUE", "PARTIAL"] },
      ...(month   && { month }),
      ...(classId && { feeStructure: { classId: parseInt(classId) } }),
      ...(search  && {
        OR: [
          { student: { firstName: { contains: search } } },
          { student: { lastName:  { contains: search } } },
          { student: { studentId: { contains: search } } },
        ],
      }),
    };

    // Fetch all matching records (we group in JS for flexibility)
    const records = await prisma.feeCollection.findMany({
      where: baseWhere,
      include: {
        student: {
          select: {
            id: true, firstName: true, lastName: true,
            studentId: true, section: true, phone: true,
            guardianName: true, guardianPhone: true,
          },
        },
        feeStructure: {
          select: {
            id: true, name: true, feeType: true, frequency: true,
            class: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // ── Group by student ────────────────────────────────────────────────────
    const studentMap = new Map();

    for (const r of records) {
      const sid = r.student.id;
      const due      = parseFloat(r.amountDue);
      const paid     = parseFloat(r.amountPaid);
      const disc     = parseFloat(r.discount);
      const fine     = parseFloat(r.fine);
      const netOwed  = due - disc + fine - paid;
      const dueDate  = new Date(r.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const daysOverdue = Math.max(0, Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)));

      if (!studentMap.has(sid)) {
        studentMap.set(sid, {
          studentDbId:   sid,
          studentId:     r.student.studentId,
          studentName:   `${r.student.firstName} ${r.student.lastName || ""}`.trim(),
          section:       r.student.section,
          className:     r.feeStructure.class.name,
          classId:       r.feeStructure.class.id,
          phone:         r.student.phone,
          guardianName:  r.student.guardianName,
          guardianPhone: r.student.guardianPhone,
          totalDue:      0,
          totalPaid:     0,
          totalBalance:  0,
          maxDaysOverdue: 0,
          pendingCount:  0,
          records:       [],
        });
      }

      const entry = studentMap.get(sid);
      entry.totalDue      += due - disc + fine;
      entry.totalPaid     += paid;
      entry.totalBalance  += netOwed;
      entry.maxDaysOverdue = Math.max(entry.maxDaysOverdue, daysOverdue);
      entry.pendingCount  += 1;
      entry.records.push({
        id:            r.id,
        month:         r.month,
        structureName: r.feeStructure.name,
        feeType:       r.feeStructure.feeType,
        amountDue:     due,
        amountPaid:    paid,
        discount:      disc,
        fine,
        netOwed,
        status:        r.status,
        dueDate:       r.dueDate,
        daysOverdue,
      });
    }

    // ── Convert to array and apply filters ──────────────────────────────────
    let defaulters = Array.from(studentMap.values());

    // Filter by minDays
    if (minDays > 0) {
      defaulters = defaulters.filter((d) => d.maxDaysOverdue >= minDays);
    }

    // Filter by severity
    if (severity) {
      defaulters = defaulters.filter((d) => {
        if (severity === "LOW")    return d.maxDaysOverdue >= 1  && d.maxDaysOverdue <= 30;
        if (severity === "MEDIUM") return d.maxDaysOverdue >= 31 && d.maxDaysOverdue <= 60;
        if (severity === "HIGH")   return d.maxDaysOverdue > 60;
        return true;
      });
    }

    // Sort: highest days overdue first
    defaulters.sort((a, b) => b.maxDaysOverdue - a.maxDaysOverdue || b.totalBalance - a.totalBalance);

    // ── Pagination ──────────────────────────────────────────────────────────
    const total     = defaulters.length;
    const paginated = defaulters.slice(skip, skip + limit);

    // ── Summary stats ───────────────────────────────────────────────────────
    const allDefaulterIds = records.map((r) => r.student.id);
    const uniqueStudents  = new Set(allDefaulterIds).size;

    const totalOutstanding = defaulters.reduce((s, d) => s + d.totalBalance, 0);
    const lowCount    = defaulters.filter((d) => d.maxDaysOverdue >= 1  && d.maxDaysOverdue <= 30).length;
    const mediumCount = defaulters.filter((d) => d.maxDaysOverdue >= 31 && d.maxDaysOverdue <= 60).length;
    const highCount   = defaulters.filter((d) => d.maxDaysOverdue > 60).length;

    // Months for filter
    const months = await prisma.feeCollection.findMany({
      select:   { month: true },
      where:    { month: { not: null }, status: { in: ["UNPAID", "OVERDUE", "PARTIAL"] } },
      distinct: ["month"],
      orderBy:  { month: "desc" },
    });

    return NextResponse.json({
      defaulters: paginated,
      summary: {
        totalStudents:    uniqueStudents,
        totalOutstanding,
        lowCount,
        mediumCount,
        highCount,
      },
      months: months.map((m) => m.month).filter(Boolean),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[defaulters GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH — bulk mark as OVERDUE ─────────────────────────────────────────────
export async function PATCH(req) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array required" }, { status: 400 });
    }

    const result = await prisma.feeCollection.updateMany({
      where: {
        id:     { in: ids.map(Number) },
        status: { in: ["UNPAID"] },
      },
      data: { status: "OVERDUE" },
    });

    return NextResponse.json({ updated: result.count });
  } catch (err) {
    console.error("[defaulters PATCH]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}