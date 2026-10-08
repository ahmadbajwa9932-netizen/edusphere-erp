import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

// ── GET single ────────────────────────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const expense = await prisma.expense.findUnique({ where: { id: parseInt(id) } });
    if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ...expense, amount: parseFloat(expense.amount) });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PUT — update ──────────────────────────────────────────────────────────────
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      title, amount, category, date, paidTo,
      paymentMethod, status, approvedBy, referenceNo,
      description, academicYear,
    } = body;

    const existing = await prisma.expense.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Prevent editing a cancelled expense
    if (existing.status === "CANCELLED" && status !== "CANCELLED") {
      return NextResponse.json({ error: "Cannot re-activate a cancelled expense" }, { status: 400 });
    }

    const updated = await prisma.expense.update({
      where: { id: parseInt(id) },
      data: {
        ...(title         !== undefined && { title:         title.trim() }),
        ...(amount        !== undefined && { amount:        parseFloat(amount) }),
        ...(category      !== undefined && { category }),
        ...(date          !== undefined && { date:          new Date(date) }),
        ...(paidTo        !== undefined && { paidTo }),
        ...(paymentMethod !== undefined && { paymentMethod }),
        ...(status        !== undefined && { status }),
        ...(approvedBy    !== undefined && { approvedBy }),
        ...(referenceNo   !== undefined && { referenceNo }),
        ...(description   !== undefined && { description }),
        ...(academicYear  !== undefined && { academicYear: academicYear.trim() }),
      },
    });

    return NextResponse.json({ ...updated, amount: parseFloat(updated.amount) });
  } catch (err) {
    console.error("[expenses PUT]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const existing = await prisma.expense.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (existing.status === "PAID") {
      return NextResponse.json(
        { error: "Cannot delete a paid expense. Cancel it first." },
        { status: 409 }
      );
    }

    await prisma.expense.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[expenses DELETE]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}