
import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

/**
 * GET /api/expenses
 *   search       = string
 *   category     = ExpenseCategory enum
 *   status       = ExpenseStatus enum
 *   paymentMethod= ExpensePayment enum
 *   academicYear = string
 *   from         = date string  e.g. "2025-01-01"
 *   to           = date string  e.g. "2025-12-31"
 *   page         = number (default 1)
 *   limit        = number (default 20)
 *
 * POST /api/expenses — create expense
 */

const currentYear = () => {
  const y = new Date().getFullYear();
  return `${y}-${String(y + 1).slice(2)}`;
};

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search        = searchParams.get("search")        || "";
    const category      = searchParams.get("category");
    const status        = searchParams.get("status");
    const paymentMethod = searchParams.get("paymentMethod");
    const academicYear  = searchParams.get("academicYear");
    const from          = searchParams.get("from");
    const to            = searchParams.get("to");
    const page          = Math.max(1, parseInt(searchParams.get("page")  || "1"));
    const limit         = Math.max(1, parseInt(searchParams.get("limit") || "20"));
    const skip          = (page - 1) * limit;

    const where = {
      ...(category      && { category }),
      ...(status        && { status }),
      ...(paymentMethod && { paymentMethod }),
      ...(academicYear  && { academicYear }),
      ...(from || to) && {
        date: {
          ...(from && { gte: new Date(from) }),
          ...(to   && { lte: new Date(to)   }),
        },
      },
      ...(search && {
        OR: [
          { title:       { contains: search } },
          { paidTo:      { contains: search } },
          { referenceNo: { contains: search } },
          { description: { contains: search } },
        ],
      }),
    };

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    // ── Summary stats (global — unfiltered) ──────────────────────────────────
    const [totalPaid, totalPending, totalCancelled] = await Promise.all([
      prisma.expense.aggregate({ where: { status: "PAID"      }, _sum: { amount: true }, _count: true }),
      prisma.expense.aggregate({ where: { status: "PENDING"   }, _sum: { amount: true }, _count: true }),
      prisma.expense.aggregate({ where: { status: "CANCELLED" }, _sum: { amount: true }, _count: true }),
    ]);

    // Category breakdown (for current filtered set)
    const byCategory = await prisma.expense.groupBy({
      by:    ["category"],
      where,
      _sum:  { amount: true },
      _count: { category: true },
      orderBy: { _sum: { amount: "desc" } },
    });

    // Monthly trend (current academic year)
    const monthlyTrend = await prisma.expense.groupBy({
      by: ["date"],
      where: {
        status:       "PAID",
        academicYear: academicYear || currentYear(),
      },
      _sum: { amount: true },
    });

    // Academic years for filter dropdown
    const years = await prisma.expense.findMany({
      select:   { academicYear: true },
      distinct: ["academicYear"],
      orderBy:  { academicYear: "desc" },
    });

    // Compress monthly trend into month buckets
    const trendMap = {};
    for (const row of monthlyTrend) {
      const key = row.date.toISOString().slice(0, 7); // "2025-09"
      trendMap[key] = (trendMap[key] || 0) + parseFloat(row._sum.amount || 0);
    }

    return NextResponse.json({
      expenses: expenses.map((e) => ({
        id:            e.id,
        title:         e.title,
        amount:        parseFloat(e.amount),
        category:      e.category,
        date:          e.date,
        paidTo:        e.paidTo,
        paymentMethod: e.paymentMethod,
        status:        e.status,
        approvedBy:    e.approvedBy,
        referenceNo:   e.referenceNo,
        description:   e.description,
        academicYear:  e.academicYear,
        createdAt:     e.createdAt,
      })),
      summary: {
        totalPaidAmount:    parseFloat(totalPaid._sum.amount      || 0),
        totalPendingAmount: parseFloat(totalPending._sum.amount   || 0),
        paidCount:          totalPaid._count,
        pendingCount:       totalPending._count,
        cancelledCount:     totalCancelled._count,
      },
      byCategory: byCategory.map((c) => ({
        category: c.category,
        total:    parseFloat(c._sum.amount || 0),
        count:    c._count.category,
      })),
      monthlyTrend: Object.entries(trendMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, total]) => ({ month, total })),
      academicYears: years.map((y) => y.academicYear),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[expenses GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      title, amount, category, date, paidTo,
      paymentMethod, status, approvedBy, referenceNo,
      description, academicYear,
    } = body;

    if (!title || !amount || !date || !academicYear) {
      return NextResponse.json({ error: "title, amount, date and academicYear are required" }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        title:         title.trim(),
        amount:        parseFloat(amount),
        category:      category      || "OTHER",
        date:          new Date(date),
        paidTo:        paidTo        || null,
        paymentMethod: paymentMethod || "CASH",
        status:        status        || "PENDING",
        approvedBy:    approvedBy    || null,
        referenceNo:   referenceNo   || null,
        description:   description   || null,
        academicYear:  academicYear.trim(),
      },
    });

    return NextResponse.json(
      { ...expense, amount: parseFloat(expense.amount) },
      { status: 201 }
    );
  } catch (err) {
    console.error("[expenses POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}