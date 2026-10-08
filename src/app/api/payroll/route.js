import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

/**
 * GET /api/payroll
 *   search        = string (employee name / id)
 *   employeeType  = "TEACHER" | "STAFF"
 *   status        = PayrollStatus enum
 *   month         = string  e.g. "2025-09"
 *   academicYear  = string
 *   department    = string
 *   page          = number (default 1)
 *   limit         = number (default 20)
 *
 * POST /api/payroll — bulk generate for a month
 *   { month, academicYear, employeeType }
 *   Generates one payroll record per active teacher/staff using their salary field
 */

const currentYear = () => {
  const y = new Date().getFullYear();
  return `${y}-${String(y + 1).slice(2)}`;
};

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search       = searchParams.get("search")       || "";
    const employeeType = searchParams.get("employeeType");
    const status       = searchParams.get("status");
    const month        = searchParams.get("month");
    const academicYear = searchParams.get("academicYear");
    const department   = searchParams.get("department");
    const page         = Math.max(1, parseInt(searchParams.get("page")  || "1"));
    const limit        = Math.max(1, parseInt(searchParams.get("limit") || "20"));
    const skip         = (page - 1) * limit;

    const where = {
      ...(employeeType && { employeeType }),
      ...(status       && { status }),
      ...(month        && { month }),
      ...(academicYear && { academicYear }),
      ...(department   && {
        OR: [
          { teacher: { department: { contains: department } } },
          { staff:   { department: { contains: department } } },
        ],
      }),
      ...(search && {
        OR: [
          { teacher: { firstName:  { contains: search } } },
          { teacher: { lastName:   { contains: search } } },
          { teacher: { employeeId: { contains: search } } },
          { staff:   { firstName:  { contains: search } } },
          { staff:   { lastName:   { contains: search } } },
          { staff:   { employeeId: { contains: search } } },
        ],
      }),
    };

    const [payrolls, total] = await Promise.all([
      prisma.payroll.findMany({
        where,
        include: {
          teacher: {
            select: {
              id: true, firstName: true, lastName: true,
              employeeId: true, designation: true, department: true,
              employmentType: true, phone: true,
            },
          },
          staff: {
            select: {
              id: true, firstName: true, lastName: true,
              employeeId: true, designation: true, department: true,
              employmentType: true, phone: true,
            },
          },
        },
        orderBy: [{ month: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.payroll.count({ where }),
    ]);

    // ── Global summary stats ───────────────────────────────────────────────
    const [paidAgg, pendingAgg, cancelledAgg] = await Promise.all([
      prisma.payroll.aggregate({ where: { status: "PAID"      }, _sum: { netSalary: true }, _count: true }),
      prisma.payroll.aggregate({ where: { status: "PENDING"   }, _sum: { netSalary: true }, _count: true }),
      prisma.payroll.aggregate({ where: { status: "CANCELLED" }, _sum: { netSalary: true }, _count: true }),
    ]);

    // Months for filter dropdown
    const months = await prisma.payroll.findMany({
      select:   { month: true },
      distinct: ["month"],
      orderBy:  { month: "desc" },
    });

    // Academic years for filter dropdown
    const years = await prisma.payroll.findMany({
      select:   { academicYear: true },
      distinct: ["academicYear"],
      orderBy:  { academicYear: "desc" },
    });

    // Departments (from teachers + staff)
    const [teacherDepts, staffDepts] = await Promise.all([
      prisma.teacher.findMany({ select: { department: true }, distinct: ["department"] }),
      prisma.staff.findMany({   select: { department: true }, where: { department: { not: null } }, distinct: ["department"] }),
    ]);
    const departments = [
      ...new Set([
        ...teacherDepts.map((t) => t.department),
        ...staffDepts.map((s) => s.department).filter(Boolean),
      ]),
    ].sort();

    return NextResponse.json({
      payrolls: payrolls.map((p) => {
        const emp = p.teacher || p.staff;
        return {
          id:            p.id,
          employeeType:  p.employeeType,
          employeeId:    emp?.employeeId,
          employeeName:  emp ? `${emp.firstName} ${emp.lastName || ""}`.trim() : "—",
          designation:   emp?.designation,
          department:    emp?.department,
          employmentType: emp?.employmentType,
          phone:         emp?.phone,
          teacherId:     p.teacherId,
          staffId:       p.staffId,
          month:         p.month,
          academicYear:  p.academicYear,
          basicSalary:   parseFloat(p.basicSalary),
          bonus:         parseFloat(p.bonus),
          deduction:     parseFloat(p.deduction),
          netSalary:     parseFloat(p.netSalary),
          status:        p.status,
          paymentMethod: p.paymentMethod,
          paidAt:        p.paidAt,
          paidBy:        p.paidBy,
          remarks:       p.remarks,
          createdAt:     p.createdAt,
        };
      }),
      summary: {
        totalPaid:          parseFloat(paidAgg._sum.netSalary      || 0),
        totalPending:       parseFloat(pendingAgg._sum.netSalary   || 0),
        paidCount:          paidAgg._count,
        pendingCount:       pendingAgg._count,
        cancelledCount:     cancelledAgg._count,
      },
      months:        months.map((m) => m.month),
      academicYears: years.map((y) => y.academicYear),
      departments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[payroll GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST — bulk generate ───────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json();
    const { month, academicYear, employeeType } = body;

    if (!month || !academicYear || !employeeType) {
      return NextResponse.json(
        { error: "month, academicYear and employeeType are required" },
        { status: 400 }
      );
    }

    if (!["TEACHER", "STAFF", "ALL"].includes(employeeType)) {
      return NextResponse.json({ error: "employeeType must be TEACHER, STAFF or ALL" }, { status: 400 });
    }

    const results = { teachers: 0, staff: 0, skipped: 0 };

    // ── Generate for Teachers ────────────────────────────────────────────────
    if (employeeType === "TEACHER" || employeeType === "ALL") {
      const teachers = await prisma.teacher.findMany({
        where: { status: "ACTIVE", salary: { not: null } },
      });

      for (const t of teachers) {
        // Skip if already generated
        const exists = await prisma.payroll.findUnique({
          where: { teacherId_month: { teacherId: t.id, month } },
        });
        if (exists) { results.skipped++; continue; }

        const basic = parseFloat(t.salary);
        await prisma.payroll.create({
          data: {
            employeeType: "TEACHER",
            teacherId:    t.id,
            month,
            academicYear,
            basicSalary:  basic,
            bonus:        0,
            deduction:    0,
            netSalary:    basic,
            status:       "PENDING",
          },
        });
        results.teachers++;
      }
    }

    // ── Generate for Staff ───────────────────────────────────────────────────
    if (employeeType === "STAFF" || employeeType === "ALL") {
      const staffList = await prisma.staff.findMany({
        where: { status: "ACTIVE", salary: { not: null } },
      });

      for (const s of staffList) {
        const exists = await prisma.payroll.findUnique({
          where: { staffId_month: { staffId: s.id, month } },
        });
        if (exists) { results.skipped++; continue; }

        const basic = parseFloat(s.salary);
        await prisma.payroll.create({
          data: {
            employeeType: "STAFF",
            staffId:      s.id,
            month,
            academicYear,
            basicSalary:  basic,
            bonus:        0,
            deduction:    0,
            netSalary:    basic,
            status:       "PENDING",
          },
        });
        results.staff++;
      }
    }

    const total = results.teachers + results.staff;
    if (total === 0 && results.skipped > 0) {
      return NextResponse.json(
        { error: `All records already generated for ${month}. ${results.skipped} skipped.` },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: `Generated ${total} payroll record(s) for ${month}. ${results.skipped} already existed and were skipped.`,
        ...results,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[payroll POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}