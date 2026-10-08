import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";

const FINE_PER_DAY = 5; // PKR 5 per day

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const issue = await prisma.bookIssue.findUnique({
      where: { id: parseInt(id) },
      include: { book: true },
    });
    if (!issue) return NextResponse.json({ error: "Issue record not found" }, { status: 404 });
    return NextResponse.json(issue);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body   = await request.json();
    const data   = {};

    // ── Return book ───────────────────────────────────────────────────────
    if (body.action === "return") {
      const issue = await prisma.bookIssue.findUnique({
        where: { id: parseInt(id) },
        include: { book: true },
      });

      if (!issue) return NextResponse.json({ error: "Issue not found." }, { status: 404 });
      if (issue.status === "RETURNED") {
        return NextResponse.json({ error: "Book already returned." }, { status: 409 });
      }

      const returnDate = new Date();
      const dueDate    = new Date(issue.dueDate);
      let fineAmount   = 0;

      // Calculate fine if overdue
      if (returnDate > dueDate) {
        const diffMs   = returnDate - dueDate;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        fineAmount     = diffDays * FINE_PER_DAY;
      }

      const [updated] = await prisma.$transaction([
        prisma.bookIssue.update({
          where: { id: parseInt(id) },
          data:  {
            status:      "RETURNED",
            returnDate,
            fineAmount,
            finePaid:    fineAmount === 0 ? true : false,
            remarks:     body.remarks || issue.remarks,
          },
          include: { book: true },
        }),
        prisma.book.update({
          where: { id: issue.bookId },
          data:  {
            availableCopies: { increment: 1 },
            status: "AVAILABLE",
          },
        }),
      ]);

      return NextResponse.json(updated);
    }

    // ── Mark fine as paid ─────────────────────────────────────────────────
    if (body.action === "payFine") {
      const updated = await prisma.bookIssue.update({
        where: { id: parseInt(id) },
        data:  { finePaid: true },
        include: { book: true },
      });
      return NextResponse.json(updated);
    }

    // ── Mark as lost ──────────────────────────────────────────────────────
    if (body.action === "lost") {
      const issue = await prisma.bookIssue.findUnique({ where: { id: parseInt(id) } });
      const [updated] = await prisma.$transaction([
        prisma.bookIssue.update({
          where: { id: parseInt(id) },
          data:  { status: "LOST", fineAmount: body.fineAmount || 0 },
          include: { book: true },
        }),
        prisma.book.update({
          where: { id: issue.bookId },
          data:  { status: "LOST" },
        }),
      ]);
      return NextResponse.json(updated);
    }

    // ── Generic update ────────────────────────────────────────────────────
    if (body.remarks  !== undefined) data.remarks  = body.remarks;
    if (body.dueDate  !== undefined) data.dueDate  = new Date(body.dueDate);
    if (body.finePaid !== undefined) data.finePaid = body.finePaid;

    const updated = await prisma.bookIssue.update({
      where: { id: parseInt(id) },
      data,
      include: { book: true },
    });
    return NextResponse.json(updated);

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const issue  = await prisma.bookIssue.findUnique({ where: { id: parseInt(id) } });

    if (issue?.status === "ISSUED" || issue?.status === "OVERDUE") {
      // Return copy to book before deleting
      await prisma.book.update({
        where: { id: issue.bookId },
        data:  { availableCopies: { increment: 1 }, status: "AVAILABLE" },
      });
    }

    await prisma.bookIssue.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}