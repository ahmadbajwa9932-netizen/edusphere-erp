import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

function receiptNo() {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RCP-${ts}-${rand}`;
}

// ── GET single ────────────────────────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const c = await prisma.feeCollection.findUnique({
      where:   { id: parseInt(id) },
      include: {
        student:      { select: { id: true, firstName: true, lastName: true, studentId: true, section: true, phone: true } },
        feeStructure: { include: { feeItems: true, class: { select: { id: true, name: true } } } },
      },
    });
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(c);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PUT — record / update payment ────────────────────────────────────────────
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { amountPaid, discount, fine, remarks, dueDate } = body;

    const existing = await prisma.feeCollection.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const due      = parseFloat(existing.amountDue);
    const paid     = parseFloat(amountPaid  ?? existing.amountPaid);
    const disc     = parseFloat(discount    ?? existing.discount);
    const fin      = parseFloat(fine        ?? existing.fine);

    // net amount student owes
    const netDue   = due - disc + fin;
    let   status   = existing.status;
    let   paidAt   = existing.paidAt;
    let   rno      = existing.receiptNo;

    if (paid <= 0) {
      status = "UNPAID";
      paidAt = null;
      rno    = null;
    } else if (paid >= netDue) {
      status = "PAID";
      paidAt = paidAt || new Date();
      rno    = rno    || receiptNo();
    } else {
      status = "PARTIAL";
      paidAt = paidAt || new Date();
      rno    = rno    || receiptNo();
    }

    // auto-overdue check
    if (status === "UNPAID" && existing.dueDate && new Date() > new Date(existing.dueDate)) {
      status = "OVERDUE";
    }

    const updated = await prisma.feeCollection.update({
      where: { id: parseInt(id) },
      data: {
        amountPaid: paid,
        discount:   disc,
        fine:       fin,
        status,
        paidAt,
        receiptNo:  rno,
        remarks:    remarks ?? existing.remarks,
        ...(dueDate && { dueDate: new Date(dueDate) }),
      },
      include: {
        student:      { select: { id: true, firstName: true, lastName: true, studentId: true, section: true } },
        feeStructure: { include: { feeItems: true, class: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json({
      ...updated,
      amountDue:  parseFloat(updated.amountDue),
      amountPaid: parseFloat(updated.amountPaid),
      discount:   parseFloat(updated.discount),
      fine:       parseFloat(updated.fine),
    });
  } catch (err) {
    console.error("[fee-collections PUT]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const existing = await prisma.feeCollection.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (existing.status === "PAID") {
      return NextResponse.json({ error: "Cannot delete a paid fee record" }, { status: 409 });
    }

    await prisma.feeCollection.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[fee-collections DELETE]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}