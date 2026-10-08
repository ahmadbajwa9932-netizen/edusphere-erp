import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get("academicYear") || "";
    const month       = searchParams.get("month") || "";       // e.g. "2025-09"
    const fromDate    = searchParams.get("from") || "";
    const toDate      = searchParams.get("to")   || "";
    const classId     = searchParams.get("classId") ? parseInt(searchParams.get("classId")) : null;

    // ── 1. FEE SUMMARY ──────────────────────────────────────────────────────
    const feeWhere = {};
    if (month)   feeWhere.month   = month;
    if (classId) feeWhere.feeStructure = { is: { classId } };

    const [feeUnpaid, feePaid, feePartial, feeOverdue, feeWaived] = await Promise.all([
      prisma.feeCollection.aggregate({ where: { ...feeWhere, status: "UNPAID"  }, _sum: { amountDue: true }, _count: true }),
      prisma.feeCollection.aggregate({ where: { ...feeWhere, status: "PAID"    }, _sum: { amountDue: true, amountPaid: true }, _count: true }),
      prisma.feeCollection.aggregate({ where: { ...feeWhere, status: "PARTIAL" }, _sum: { amountDue: true, amountPaid: true }, _count: true }),
      prisma.feeCollection.aggregate({ where: { ...feeWhere, status: "OVERDUE" }, _sum: { amountDue: true }, _count: true }),
      prisma.feeCollection.aggregate({ where: { ...feeWhere, status: "WAIVED"  }, _sum: { amountDue: true }, _count: true }),
    ]);

    const totalDue       = Number(feePaid._sum.amountDue    || 0)
                         + Number(feePartial._sum.amountDue || 0)
                         + Number(feeUnpaid._sum.amountDue  || 0)
                         + Number(feeOverdue._sum.amountDue || 0)
                         + Number(feeWaived._sum.amountDue  || 0);

    const totalCollected = Number(feePaid._sum.amountPaid    || 0)
                         + Number(feePartial._sum.amountPaid || 0);

    const totalPending   = Number(feeUnpaid._sum.amountDue  || 0)
                         + Number(feePartial._sum.amountDue || 0)
                         - Number(feePartial._sum.amountPaid|| 0);

    const totalOverdue   = Number(feeOverdue._sum.amountDue || 0);

    const feeSummary = {
      totalDue,
      totalCollected,
      totalPending,
      totalOverdue,
      collectionRate: totalDue > 0 ? ((totalCollected / totalDue) * 100).toFixed(1) : "0.0",
      counts: {
        paid:    feePaid._count,
        partial: feePartial._count,
        unpaid:  feeUnpaid._count,
        overdue: feeOverdue._count,
        waived:  feeWaived._count,
      },
    };

    // ── 2. FEE BY CLASS ──────────────────────────────────────────────────────
    const feeByClassRaw = await prisma.feeCollection.groupBy({
      by: ["feeStructureId"],
      where: feeWhere,
      _sum: { amountDue: true, amountPaid: true },
      _count: true,
    });

    // fetch feeStructures with class info for the ids we got
    const structureIds = feeByClassRaw.map((r) => r.feeStructureId);
    const structures   = await prisma.feeStructure.findMany({
      where: { id: { in: structureIds } },
      include: { class: { select: { id: true, name: true } } },
    });
    const structureMap = Object.fromEntries(structures.map((s) => [s.id, s]));

    // merge by class
    const classFeeMap = {};
    for (const row of feeByClassRaw) {
      const s   = structureMap[row.feeStructureId];
      if (!s) continue;
      const key = s.class.id;
      if (!classFeeMap[key]) {
        classFeeMap[key] = { classId: s.class.id, className: s.class.name, amountDue: 0, amountPaid: 0, count: 0 };
      }
      classFeeMap[key].amountDue  += Number(row._sum.amountDue  || 0);
      classFeeMap[key].amountPaid += Number(row._sum.amountPaid || 0);
      classFeeMap[key].count      += row._count;
    }
    const feeByClass = Object.values(classFeeMap).sort((a, b) => b.amountDue - a.amountDue);

    // ── 3. MONTHLY FEE TREND (last 6 months) ────────────────────────────────
    const monthlyFeeRaw = await prisma.feeCollection.groupBy({
      by: ["month"],
      where: { month: { not: null } },
      _sum: { amountDue: true, amountPaid: true },
      orderBy: { month: "desc" },
      take: 6,
    });
    const monthlyFee = monthlyFeeRaw
      .map((r) => ({
        month:     r.month,
        amountDue: Number(r._sum.amountDue  || 0),
        collected: Number(r._sum.amountPaid || 0),
      }))
      .reverse();

    // ── 4. EXPENSE SUMMARY ───────────────────────────────────────────────────
    const expenseWhere = {};
    if (academicYear) expenseWhere.academicYear = academicYear;
    if (fromDate && toDate) {
      expenseWhere.date = { gte: new Date(fromDate), lte: new Date(toDate) };
    }

    const [expPaid, expPending, expCancelled] = await Promise.all([
      prisma.expense.aggregate({ where: { ...expenseWhere, status: "PAID"      }, _sum: { amount: true }, _count: true }),
      prisma.expense.aggregate({ where: { ...expenseWhere, status: "PENDING"   }, _sum: { amount: true }, _count: true }),
      prisma.expense.aggregate({ where: { ...expenseWhere, status: "CANCELLED" }, _sum: { amount: true }, _count: true }),
    ]);

    const expenseSummary = {
      totalPaid:      Number(expPaid._sum.amount      || 0),
      totalPending:   Number(expPending._sum.amount   || 0),
      totalCancelled: Number(expCancelled._sum.amount || 0),
      total:          Number(expPaid._sum.amount      || 0) + Number(expPending._sum.amount || 0),
      counts: {
        paid:      expPaid._count,
        pending:   expPending._count,
        cancelled: expCancelled._count,
      },
    };

    // ── 5. EXPENSE BY CATEGORY ───────────────────────────────────────────────
    const expByCatRaw = await prisma.expense.groupBy({
      by: ["category"],
      where: { ...expenseWhere, status: { not: "CANCELLED" } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
    });
    const expenseByCategory = expByCatRaw.map((r) => ({
      category: r.category,
      amount:   Number(r._sum.amount || 0),
      count:    r._count,
    }));

    // ── 6. PAYROLL SUMMARY ───────────────────────────────────────────────────
    const payrollWhere = {};
    if (academicYear) payrollWhere.academicYear = academicYear;
    if (month)        payrollWhere.month        = month;

    const [payPaid, payPending, payCancelled] = await Promise.all([
      prisma.payroll.aggregate({ where: { ...payrollWhere, status: "PAID"      }, _sum: { netSalary: true, basicSalary: true, bonus: true, deduction: true }, _count: true }),
      prisma.payroll.aggregate({ where: { ...payrollWhere, status: "PENDING"   }, _sum: { netSalary: true }, _count: true }),
      prisma.payroll.aggregate({ where: { ...payrollWhere, status: "CANCELLED" }, _sum: { netSalary: true }, _count: true }),
    ]);

    const payrollSummary = {
      totalPaid:      Number(payPaid._sum.netSalary    || 0),
      totalPending:   Number(payPending._sum.netSalary || 0),
      totalBonus:     Number(payPaid._sum.bonus        || 0),
      totalDeduction: Number(payPaid._sum.deduction    || 0),
      counts: {
        paid:      payPaid._count,
        pending:   payPending._count,
        cancelled: payCancelled._count,
      },
    };

    // ── 7. PAYROLL BY EMPLOYEE TYPE ──────────────────────────────────────────
    const payByTypeRaw = await prisma.payroll.groupBy({
      by: ["employeeType"],
      where: { ...payrollWhere, status: { not: "CANCELLED" } },
      _sum: { netSalary: true },
      _count: true,
    });
    const payrollByType = payByTypeRaw.map((r) => ({
      type:      r.employeeType,
      netSalary: Number(r._sum.netSalary || 0),
      count:     r._count,
    }));

    // ── 8. MONTHLY PAYROLL TREND (last 6 months) ─────────────────────────────
    const monthlyPayrollRaw = await prisma.payroll.groupBy({
      by: ["month"],
      where: { status: { not: "CANCELLED" } },
      _sum: { netSalary: true },
      orderBy: { month: "desc" },
      take: 6,
    });
    const monthlyPayroll = monthlyPayrollRaw
  .map((r) => ({
    month:      r.month,
    netSalary:  Number(r._sum.netSalary || 0),
  }))
  .reverse();

// also get paid-only payroll per month for the chart
const monthlyPayrollPaidRaw = await prisma.payroll.groupBy({
  by: ["month"],
  where: { status: "PAID" },
  _sum: { netSalary: true },
  orderBy: { month: "desc" },
  take: 6,
});
const monthlyPayrollPaidMap = Object.fromEntries(
  monthlyPayrollPaidRaw.map((r) => [r.month, Number(r._sum.netSalary || 0)])
);
// inject paidSalary into monthlyPayroll
monthlyPayroll.forEach((r) => {
  r.paidSalary = monthlyPayrollPaidMap[r.month] || 0;
});

    // ── 8b. MONTHLY PAID OPERATING EXPENSES (last 6 months) ──────────────────
const monthlyExpensesRaw = await prisma.expense.groupBy({
  by: ["date"],
  where: { status: "PAID" },   // ← only PAID, matching the KPI card logic
  _sum: { amount: true },
  orderBy: { date: "desc" },
  take: 180,
});

const expMonthMap = {};
for (const r of monthlyExpensesRaw) {
  const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, "0")}`;
  expMonthMap[key] = (expMonthMap[key] || 0) + Number(r._sum.amount || 0);
}
const monthlyExpenses = Object.entries(expMonthMap)
  .sort(([a], [b]) => a.localeCompare(b))
  .slice(-6)
  .map(([month, amount]) => ({ month, amount }));

    // ── 9. DEFAULTERS SUMMARY ────────────────────────────────────────────────
    const defaultersRaw = await prisma.feeCollection.findMany({
      where: {
        status: { in: ["UNPAID", "OVERDUE", "PARTIAL"] },
        ...(month   ? { month }   : {}),
        ...(classId ? { feeStructure: { is: { classId } } } : {}),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, studentId: true } },
        feeStructure: { include: { class: { select: { name: true } } } },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    const defaultersSummary = {
      total: await prisma.feeCollection.count({
        where: {
          status: { in: ["UNPAID", "OVERDUE", "PARTIAL"] },
          ...(month   ? { month }   : {}),
          ...(classId ? { feeStructure: { is: { classId } } } : {}),
        },
      }),
      topDefaulters: defaultersRaw.map((d) => ({
        studentId:   d.student.studentId,
        name:        `${d.student.firstName} ${d.student.lastName || ""}`.trim(),
        className:   d.feeStructure.class.name,
        amountDue:   Number(d.amountDue),
        amountPaid:  Number(d.amountPaid),
        balance:     Number(d.amountDue) - Number(d.amountPaid),
        status:      d.status,
        dueDate:     d.dueDate,
      })),
    };

    // ── 10. NET FINANCIAL OVERVIEW ───────────────────────────────────────────
    const netOverview = {
      totalIncome:   totalCollected,
      totalExpenses: expenseSummary.totalPaid + payrollSummary.totalPaid,
      netBalance:    totalCollected - expenseSummary.totalPaid - payrollSummary.totalPaid,
    };

    return NextResponse.json({
      feeSummary,
      feeByClass,
      monthlyFee,
      expenseSummary,
      expenseByCategory,
      payrollSummary,
      payrollByType,
      monthlyPayroll,
      monthlyExpenses,
      defaultersSummary,
      netOverview,
      filters: { academicYear, month, fromDate, toDate, classId },
    });

  } catch (error) {
    console.error("Finance reports error:", error);
    return NextResponse.json({ error: "Failed to fetch finance reports" }, { status: 500 });
  }
}