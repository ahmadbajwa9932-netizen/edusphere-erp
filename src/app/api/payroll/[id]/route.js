import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

// ── GET single ────────────────────────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const p = await prisma.payroll.findUnique({
      where:   { id: parseInt(id) },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, employeeId: true, designation: true, department: true, phone: true } },
        staff:   { select: { id: true, firstName: true, lastName: true, employeeId: true, designation: true, department: true, phone: true } },
      },
    });
    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ...p, basicSalary: parseFloat(p.basicSalary), bonus: parseFloat(p.bonus), deduction: parseFloat(p.deduction), netSalary: parseFloat(p.netSalary) });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PUT — update / mark paid ──────────────────────────────────────────────────
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { bonus, deduction, status, paymentMethod, paidBy, remarks } = body;

    const existing = await prisma.payroll.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (existing.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot update a cancelled payroll record" }, { status: 400 });
    }

    const newBonus     = bonus     !== undefined ? parseFloat(bonus)     : parseFloat(existing.bonus);
    const newDeduction = deduction !== undefined ? parseFloat(deduction) : parseFloat(existing.deduction);
    const newNet       = parseFloat(existing.basicSalary) + newBonus - newDeduction;

    const updated = await prisma.payroll.update({
      where: { id: parseInt(id) },
      data: {
        bonus:         newBonus,
        deduction:     newDeduction,
        netSalary:     newNet,
        ...(status        !== undefined && { status }),
        ...(paymentMethod !== undefined && { paymentMethod }),
        ...(paidBy        !== undefined && { paidBy }),
        ...(remarks       !== undefined && { remarks }),
        // Auto-set paidAt when marking as PAID
        ...(status === "PAID" && !existing.paidAt && { paidAt: new Date() }),
        // Clear paidAt if reverting to PENDING
        ...(status === "PENDING" && { paidAt: null }),
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, employeeId: true, designation: true, department: true } },
        staff:   { select: { id: true, firstName: true, lastName: true, employeeId: true, designation: true, department: true } },
      },
    });

    return NextResponse.json({
      ...updated,
      basicSalary: parseFloat(updated.basicSalary),
      bonus:       parseFloat(updated.bonus),
      deduction:   parseFloat(updated.deduction),
      netSalary:   parseFloat(updated.netSalary),
    });
  } catch (err) {
    console.error("[payroll PUT]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const existing = await prisma.payroll.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (existing.status === "PAID") {
      return NextResponse.json(
        { error: "Cannot delete a paid payroll record" },
        { status: 409 }
      );
    }

    await prisma.payroll.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[payroll DELETE]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}