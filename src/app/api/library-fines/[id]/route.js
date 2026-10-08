import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const fine = await prisma.libraryFine.findUnique({
      where: { id: parseInt(id) },
      include: {
        member:    { select: { id: true, memberId: true, name: true } },
        bookIssue: { select: { id: true, issueDate: true, dueDate: true } },
      },
    });
    if (!fine) return NextResponse.json({ error: "Fine not found" }, { status: 404 });
    return NextResponse.json(fine);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body   = await request.json();

    // ── Full payment ──────────────────────────────────────────────────────
    if (body.action === "payFull") {
      const fine = await prisma.libraryFine.findUnique({ where: { id: parseInt(id) } });
      const updated = await prisma.libraryFine.update({
        where: { id: parseInt(id) },
        data: {
          paidAmount: fine.amount,
          status:     "PAID",
          paidDate:   new Date(),
          remarks:    body.remarks || fine.remarks,
        },
        include: {
          member:    { select: { id: true, memberId: true, name: true } },
          bookIssue: { select: { id: true, issueDate: true, dueDate: true } },
        },
      });
      return NextResponse.json(updated);
    }

    // ── Partial payment ───────────────────────────────────────────────────
    if (body.action === "payPartial") {
      const fine       = await prisma.libraryFine.findUnique({ where: { id: parseInt(id) } });
      const newPaid    = (fine.paidAmount || 0) + parseFloat(body.payAmount || 0);
      const remaining  = fine.amount - newPaid;
      const newStatus  = remaining <= 0 ? "PAID" : "PARTIAL";

      const updated = await prisma.libraryFine.update({
        where: { id: parseInt(id) },
        data: {
          paidAmount: Math.min(newPaid, fine.amount),
          status:     newStatus,
          paidDate:   newStatus === "PAID" ? new Date() : null,
          remarks:    body.remarks || fine.remarks,
        },
        include: {
          member:    { select: { id: true, memberId: true, name: true } },
          bookIssue: { select: { id: true, issueDate: true, dueDate: true } },
        },
      });
      return NextResponse.json(updated);
    }

    // ── Waive fine ────────────────────────────────────────────────────────
    if (body.action === "waive") {
      const updated = await prisma.libraryFine.update({
        where: { id: parseInt(id) },
        data: {
          status:   "WAIVED",
          paidDate: new Date(),
          remarks:  body.remarks || null,
        },
        include: {
          member:    { select: { id: true, memberId: true, name: true } },
          bookIssue: { select: { id: true, issueDate: true, dueDate: true } },
        },
      });
      return NextResponse.json(updated);
    }

    // ── Generic update ────────────────────────────────────────────────────
    const data = {};
    if (body.borrowerName !== undefined) data.borrowerName = body.borrowerName.trim();
    if (body.bookTitle    !== undefined) data.bookTitle    = body.bookTitle.trim();
    if (body.fineType     !== undefined) data.fineType     = body.fineType;
    if (body.amount       !== undefined) data.amount       = parseFloat(body.amount);
    if (body.status       !== undefined) data.status       = body.status;
    if (body.dueDate      !== undefined) data.dueDate      = body.dueDate ? new Date(body.dueDate) : null;
    if (body.remarks      !== undefined) data.remarks      = body.remarks?.trim() || null;

    const updated = await prisma.libraryFine.update({
      where: { id: parseInt(id) },
      data,
      include: {
        member:    { select: { id: true, memberId: true, name: true } },
        bookIssue: { select: { id: true, issueDate: true, dueDate: true } },
      },
    });
    return NextResponse.json(updated);

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.libraryFine.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}