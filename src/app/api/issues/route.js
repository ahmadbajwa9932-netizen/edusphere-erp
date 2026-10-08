import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search       = searchParams.get("search")       || "";
    const status       = searchParams.get("status")       || "";
    const borrowerType = searchParams.get("borrowerType") || "";
    const bookId       = searchParams.get("bookId");
    const overdue      = searchParams.get("overdue");
    const page         = parseInt(searchParams.get("page")  || "1");
    const limit        = parseInt(searchParams.get("limit") || "20");
    const skip         = (page - 1) * limit;

    const where = {
      AND: [
        search ? {
          OR: [
            { borrowerName: { contains: search } },
            { borrowerId:   { contains: search } },
            { book: { title: { contains: search } } },
          ],
        } : {},
        status       ? { status }                           : {},
        borrowerType ? { borrowerType }                     : {},
        bookId       ? { bookId: parseInt(bookId) }         : {},
        overdue === "true"
          ? { status: "ISSUED", dueDate: { lt: new Date() } } : {},
      ],
    };

    const [issues, total] = await Promise.all([
      prisma.bookIssue.findMany({
        where,
        include: { book: true },
        orderBy: { issueDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.bookIssue.count({ where }),
    ]);

    // Auto-mark overdue
    const now = new Date();
    const overdueIds = issues
      .filter((i) => i.status === "ISSUED" && new Date(i.dueDate) < now)
      .map((i) => i.id);

    if (overdueIds.length > 0) {
      await prisma.bookIssue.updateMany({
        where: { id: { in: overdueIds } },
        data:  { status: "OVERDUE" },
      });
      issues.forEach((i) => {
        if (overdueIds.includes(i.id)) i.status = "OVERDUE";
      });
    }

    return NextResponse.json({ issues, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Check availability
    const book = await prisma.book.findUnique({ where: { id: parseInt(body.bookId) } });
    if (!book) return NextResponse.json({ error: "Book not found." }, { status: 404 });
    if (book.availableCopies < 1) {
      return NextResponse.json({ error: "No copies available for this book." }, { status: 409 });
    }

    // Create issue + decrement available copies in transaction
    const [issue] = await prisma.$transaction([
      prisma.bookIssue.create({
        data: {
          bookId:       parseInt(body.bookId),
          borrowerName: body.borrowerName.trim(),
          borrowerType: body.borrowerType || "STUDENT",
          borrowerId:   body.borrowerId?.trim() || null,
          issueDate:    new Date(),
          dueDate:      new Date(body.dueDate),
          status:       "ISSUED",
          remarks:      body.remarks?.trim() || null,
        },
        include: { book: true },
      }),
      prisma.book.update({
        where: { id: parseInt(body.bookId) },
        data: {
          availableCopies: { decrement: 1 },
          status: book.availableCopies - 1 === 0 ? "OUT_OF_STOCK" : "AVAILABLE",
        },
      }),
    ]);

    return NextResponse.json(issue, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}