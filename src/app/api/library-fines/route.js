import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search   = searchParams.get("search")   || "";
    const fineType = searchParams.get("fineType") || "";
    const status   = searchParams.get("status")   || "";
    const page     = parseInt(searchParams.get("page")  || "1");
    const limit    = parseInt(searchParams.get("limit") || "20");
    const skip     = (page - 1) * limit;

    const where = {
      AND: [
        search ? {
          OR: [
            { borrowerName: { contains: search } },
            { bookTitle:    { contains: search } },
          ],
        } : {},
        fineType ? { fineType } : {},
        status   ? { status }   : {},
      ],
    };

    const [fines, total] = await Promise.all([
      prisma.libraryFine.findMany({
        where,
        include: {
          member:    { select: { id: true, memberId: true, name: true } },
          bookIssue: { select: { id: true, issueDate: true, dueDate: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.libraryFine.count({ where }),
    ]);

    // Summary stats
    const [totalUnpaid, totalPaid, totalWaived] = await Promise.all([
      prisma.libraryFine.aggregate({ where: { status: "UNPAID" },  _sum: { amount: true } }),
      prisma.libraryFine.aggregate({ where: { status: "PAID" },    _sum: { paidAmount: true } }),
      prisma.libraryFine.aggregate({ where: { status: "WAIVED" },  _sum: { amount: true } }),
    ]);

    return NextResponse.json({
      fines,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalUnpaid:  totalUnpaid._sum.amount    || 0,
        totalPaid:    totalPaid._sum.paidAmount  || 0,
        totalWaived:  totalWaived._sum.amount    || 0,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const fine = await prisma.libraryFine.create({
      data: {
        memberId:     body.memberId     ? parseInt(body.memberId)     : null,
        bookIssueId:  body.bookIssueId  ? parseInt(body.bookIssueId)  : null,
        borrowerName: body.borrowerName.trim(),
        bookTitle:    body.bookTitle.trim(),
        fineType:     body.fineType     || "OVERDUE",
        amount:       parseFloat(body.amount),
        paidAmount:   0,
        status:       "UNPAID",
        dueDate:      body.dueDate      ? new Date(body.dueDate)      : null,
        remarks:      body.remarks?.trim() || null,
      },
      include: {
        member:    { select: { id: true, memberId: true, name: true } },
        bookIssue: { select: { id: true, issueDate: true, dueDate: true } },
      },
    });

    return NextResponse.json(fine, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}