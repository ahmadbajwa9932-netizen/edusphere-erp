import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

/**
 * GET /api/fee-collections
 *   search        = string (student name / receipt no)
 *   classId       = number
 *   feeStructureId= number
 *   status        = FeeStatus enum
 *   month         = string  e.g. "2025-09"
 *   page          = number  (default 1)
 *   limit         = number  (default 20)
 *
 * POST /api/fee-collections  — bulk-generate for a class+structure+month
 *   { feeStructureId, month, dueDate }
 */

// ── helpers ──────────────────────────────────────────────────────────────────
function receiptNo() {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RCP-${ts}-${rand}`;
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search         = searchParams.get("search")         || "";
    const classId        = searchParams.get("classId");
    const feeStructureId = searchParams.get("feeStructureId");
    const status         = searchParams.get("status");
    const month          = searchParams.get("month");
    const page           = Math.max(1, parseInt(searchParams.get("page")  || "1"));
    const limit          = Math.max(1, parseInt(searchParams.get("limit") || "20"));
    const skip           = (page - 1) * limit;

    const where = {
      ...(feeStructureId && { feeStructureId: parseInt(feeStructureId) }),
      ...(status         && { status }),
      ...(month          && { month }),
      ...(classId        && { feeStructure: { classId: parseInt(classId) } }),
      ...(search && {
        OR: [
          { receiptNo:  { contains: search } },
          { student: { firstName: { contains: search } } },
          { student: { lastName:  { contains: search } } },
          { student: { studentId: { contains: search } } },
        ],
      }),
    };

    const [collections, total] = await Promise.all([
      prisma.feeCollection.findMany({
        where,
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, studentId: true, section: true },
          },
          feeStructure: {
            select: { id: true, name: true, feeType: true, frequency: true, class: { select: { id: true, name: true } } },
          },
        },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        skip,
        take: limit,
      }),
      prisma.feeCollection.count({ where }),
    ]);

    // Summary stats (global, not filtered)
    const [totalUnpaid, totalPaid, totalPartial, totalOverdue] = await Promise.all([
      prisma.feeCollection.count({ where: { status: "UNPAID"  } }),
      prisma.feeCollection.count({ where: { status: "PAID"    } }),
      prisma.feeCollection.count({ where: { status: "PARTIAL" } }),
      prisma.feeCollection.count({ where: { status: "OVERDUE" } }),
    ]);

    const amountStats = await prisma.feeCollection.aggregate({
      _sum: { amountDue: true, amountPaid: true },
    });

    // Months for filter dropdown
    const months = await prisma.feeCollection.findMany({
      select:   { month: true },
      where:    { month: { not: null } },
      distinct: ["month"],
      orderBy:  { month: "desc" },
    });

    return NextResponse.json({
      collections: collections.map((c) => ({
        id:             c.id,
        studentId:      c.student.studentId,
        studentName:    `${c.student.firstName} ${c.student.lastName || ""}`.trim(),
        studentDbId:    c.student.id,
        section:        c.student.section,
        className:      c.feeStructure.class.name,
        classId:        c.feeStructure.class.id,
        feeStructureId: c.feeStructureId,
        structureName:  c.feeStructure.name,
        feeType:        c.feeStructure.feeType,
        frequency:      c.feeStructure.frequency,
        month:          c.month,
        amountDue:      parseFloat(c.amountDue),
        amountPaid:     parseFloat(c.amountPaid),
        discount:       parseFloat(c.discount),
        fine:           parseFloat(c.fine),
        status:         c.status,
        paidAt:         c.paidAt,
        dueDate:        c.dueDate,
        receiptNo:      c.receiptNo,
        remarks:        c.remarks,
        createdAt:      c.createdAt,
      })),
      summary: {
        totalUnpaid,
        totalPaid,
        totalPartial,
        totalOverdue,
        totalDue:  parseFloat(amountStats._sum.amountDue  || 0),
        totalPaid: parseFloat(amountStats._sum.amountPaid || 0),
      },
      months: months.map((m) => m.month).filter(Boolean),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[fee-collections GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST — bulk generate ───────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json();
    const { feeStructureId, month, dueDate } = body;

    if (!feeStructureId || !dueDate) {
      return NextResponse.json({ error: "feeStructureId and dueDate are required" }, { status: 400 });
    }

    // Load structure + class students
    const structure = await prisma.feeStructure.findUnique({
      where:   { id: parseInt(feeStructureId) },
      include: { class: { include: { students: { where: { status: "ACTIVE" } } } } },
    });

    if (!structure) {
      return NextResponse.json({ error: "Fee structure not found" }, { status: 404 });
    }
    if (!structure.isActive) {
      return NextResponse.json({ error: "Fee structure is inactive" }, { status: 400 });
    }

    const students = structure.class.students;
    if (students.length === 0) {
      return NextResponse.json({ error: "No active students found in this class" }, { status: 400 });
    }

    // Check for already-generated records (same structure + month)
    const alreadyExists = await prisma.feeCollection.count({
      where: {
        feeStructureId: parseInt(feeStructureId),
        ...(month ? { month } : {}),
      },
    });

    if (alreadyExists > 0) {
      return NextResponse.json(
        { error: `Fee records already generated for this structure${month ? ` / ${month}` : ""}. Found ${alreadyExists} existing record(s).` },
        { status: 409 }
      );
    }

    // Bulk create
    const data = students.map((s) => ({
      feeStructureId: structure.id,
      studentId:      s.id,
      month:          month || null,
      amountDue:      parseFloat(structure.amount),
      amountPaid:     0,
      discount:       0,
      fine:           0,
      status:         "UNPAID",
      dueDate:        new Date(dueDate),
      receiptNo:      null,
    }));

    const result = await prisma.feeCollection.createMany({ data });

    return NextResponse.json(
      { message: `Generated ${result.count} fee record(s) for ${structure.class.name}`, count: result.count },
      { status: 201 }
    );
  } catch (err) {
    console.error("[fee-collections POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}